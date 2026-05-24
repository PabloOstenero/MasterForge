package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.entity.*
import com.masterforge.masterforge_backend.util.FeatureChoiceEngine
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.util.UUID

class FeatureChoiceEngineTest {

    @Test
    fun `test speed bonus effect calculation`() {
        // Setup a feature with options and effects
        val feature = ClassFeature(
            id = 1,
            name = "Fleet of Foot",
            description = "Choose a speed bonus",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf(
                        "id" to "fast",
                        "label" to "Fast",
                        "description" to "+10ft speed",
                        "effects" to listOf(
                            mapOf("type" to "STAT_MODIFIER", "target" to "speed", "value" to 10)
                        )
                    )
                )
            )
        )

        // Setup a character who made the choice
        val dndClass = DndClass(id = 1, name = "Ranger", hitDie = 10, features = listOf(feature))
        val character = Character(
            id = UUID.randomUUID(),
            name = "Test Ranger",
            level = 1,
            speed = 30,
            dndClass = dndClass,
            dndRace = DndRace(id = 1, name = "Human", bonusStr = 1, bonusDex = 1, bonusCon = 1, bonusInt = 1, bonusWis = 1, bonusCha = 1),
            user = User(id = UUID.randomUUID(), name = "Tester", email = "test@test.com", password = "pw"),
            choicesJson = mapOf("1" to "fast") // Choice using feature ID as key
        )

        // Verify effects
        val effects = FeatureChoiceEngine.getActiveEffects(character)
        assertEquals(1, effects.size)
        assertEquals("speed", effects[0].target)
        assertEquals(10, effects[0].value)
    }

    @Test
    fun `test attribute bonus from property effect`() {
        // Setup a feature with global effects (no choice needed)
        val feature = ClassFeature(
            id = 2,
            name = "Primal Strength",
            description = "You gain +2 Strength",
            levelRequired = 2,
            properties = mapOf(
                "effects" to listOf(
                    mapOf("type" to "STAT_MODIFIER", "target" to "baseStr", "value" to 2)
                )
            )
        )

        val dndClass = DndClass(id = 1, name = "Barbarian", hitDie = 12, features = listOf(feature))
        val character = Character(
            id = UUID.randomUUID(),
            name = "Test Barbarian",
            level = 2,
            baseStr = 15,
            dndClass = dndClass,
            dndRace = DndRace(id = 2, name = "Orc", bonusStr = 2),
            user = User(id = UUID.randomUUID(), name = "Tester", email = "test@test.com", password = "pw"),
            choicesJson = emptyMap()
        )

        // Verify effects
        val effects = FeatureChoiceEngine.getActiveEffects(character)
        assertEquals(1, effects.size)
        assertEquals("baseStr", effects[0].target)
        assertEquals(2, effects[0].value)
    }

    @Test
    fun `test validation accepts choice ID string`() {
        val feature = ClassFeature(
            id = 3,
            name = "Test Feature",
            description = "Test",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf("id" to "choice_abc123", "label" to "Option A")
                )
            )
        )

        // Validate with choice ID
        val isValid = FeatureChoiceEngine.validateChoices(feature, "choice_abc123")
        assertEquals(true, isValid)
    }

    @Test
    fun `test validation accepts choice label string`() {
        val feature = ClassFeature(
            id = 4,
            name = "Test Feature",
            description = "Test",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf("id" to "choice_abc123", "label" to "Agonizing Blast")
                )
            )
        )

        // Validate with choice label
        val isValid = FeatureChoiceEngine.validateChoices(feature, "Agonizing Blast")
        assertEquals(true, isValid)
    }

    @Test
    fun `test validation accepts choice as array for SELECT_ONE`() {
        val feature = ClassFeature(
            id = 5,
            name = "Test Feature",
            description = "Test",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf("id" to "choice_xyz", "label" to "Elite Knockback")
                )
            )
        )

        // Validate with array (as frontend sends)
        val isValid = FeatureChoiceEngine.validateChoices(feature, listOf("Elite Knockback"))
        assertEquals(true, isValid)
    }

    @Test
    fun `test validation accepts multiple choices by ID for SELECT_MANY`() {
        val feature = ClassFeature(
            id = 6,
            name = "Test Feature",
            description = "Test",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_MANY",
                "count" to 2,
                "choices" to listOf(
                    mapOf("id" to "choice_1", "label" to "Option 1"),
                    mapOf("id" to "choice_2", "label" to "Option 2"),
                    mapOf("id" to "choice_3", "label" to "Option 3")
                )
            )
        )

        // Validate with choice IDs
        val isValid = FeatureChoiceEngine.validateChoices(feature, listOf("choice_1", "choice_3"))
        assertEquals(true, isValid)
    }

    @Test
    fun `test validation accepts mixed labels and IDs for SELECT_MANY`() {
        val feature = ClassFeature(
            id = 7,
            name = "Test Feature",
            description = "Test",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_MANY",
                "count" to 2,
                "choices" to listOf(
                    mapOf("id" to "choice_a", "label" to "First Choice"),
                    mapOf("id" to "choice_b", "label" to "Second Choice")
                )
            )
        )

        // Validate with one ID and one label
        val isValid = FeatureChoiceEngine.validateChoices(feature, listOf("choice_a", "Second Choice"))
        assertEquals(true, isValid)
    }

    @Test
    fun `test extractEffects finds choice by ID`() {
        val feature = ClassFeature(
            id = 8,
            name = "Speed Boost",
            description = "Boost your speed",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf(
                        "id" to "speed_10",
                        "label" to "+10 Speed",
                        "effects" to listOf(
                            mapOf("type" to "STAT_MODIFIER", "target" to "speed", "value" to 10)
                        )
                    )
                )
            )
        )

        val dndClass = DndClass(id = 100, name = "Test", hitDie = 10, features = listOf(feature))
        val character = Character(
            id = UUID.randomUUID(),
            name = "Test",
            level = 1,
            dndClass = dndClass,
            dndRace = DndRace(id = 1, name = "Test"),
            user = User(id = UUID.randomUUID(), name = "Test", email = "test@test.com", password = "pw"),
            choicesJson = mapOf("8" to "speed_10") // Choice by ID
        )

        val effects = FeatureChoiceEngine.getActiveEffects(character)
        assertEquals(1, effects.size)
        assertEquals(10, effects[0].value)
    }

    @Test
    fun `test extractEffects finds choice by label`() {
        val feature = ClassFeature(
            id = 9,
            name = "Damage Boost",
            description = "Boost your damage",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_ONE",
                "choices" to listOf(
                    mapOf(
                        "id" to "dmg_fire",
                        "label" to "Fire Damage",
                        "effects" to listOf(
                            mapOf("type" to "STAT_MODIFIER", "target" to "damage", "value" to 5)
                        )
                    )
                )
            )
        )

        val dndClass = DndClass(id = 101, name = "Test", hitDie = 10, features = listOf(feature))
        val character = Character(
            id = UUID.randomUUID(),
            name = "Test",
            level = 1,
            dndClass = dndClass,
            dndRace = DndRace(id = 1, name = "Test"),
            user = User(id = UUID.randomUUID(), name = "Test", email = "test@test.com", password = "pw"),
            choicesJson = mapOf("9" to "Fire Damage") // Choice by label
        )

        val effects = FeatureChoiceEngine.getActiveEffects(character)
        assertEquals(1, effects.size)
        assertEquals(5, effects[0].value)
    }

    @Test
    fun `test extractEffects handles array choice values`() {
        val feature = ClassFeature(
            id = 10,
            name = "Multi Choice",
            description = "Choose multiple",
            levelRequired = 1,
            options = mapOf(
                "type" to "SELECT_MANY",
                "count" to 2,
                "choices" to listOf(
                    mapOf(
                        "id" to "opt_1",
                        "label" to "Option A",
                        "effects" to listOf(
                            mapOf("type" to "STAT_MODIFIER", "target" to "ability1", "value" to 1)
                        )
                    ),
                    mapOf(
                        "id" to "opt_2",
                        "label" to "Option B",
                        "effects" to listOf(
                            mapOf("type" to "STAT_MODIFIER", "target" to "ability2", "value" to 2)
                        )
                    )
                )
            )
        )

        val dndClass = DndClass(id = 102, name = "Test", hitDie = 10, features = listOf(feature))
        val character = Character(
            id = UUID.randomUUID(),
            name = "Test",
            level = 1,
            dndClass = dndClass,
            dndRace = DndRace(id = 1, name = "Test"),
            user = User(id = UUID.randomUUID(), name = "Test", email = "test@test.com", password = "pw"),
            choicesJson = mapOf("10" to listOf("Option A", "opt_2")) // Array with mixed label and ID
        )

        val effects = FeatureChoiceEngine.getActiveEffects(character)
        assertEquals(2, effects.size)
    }
}

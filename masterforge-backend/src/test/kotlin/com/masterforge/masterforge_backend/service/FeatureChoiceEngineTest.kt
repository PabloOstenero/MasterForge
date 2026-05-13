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
}

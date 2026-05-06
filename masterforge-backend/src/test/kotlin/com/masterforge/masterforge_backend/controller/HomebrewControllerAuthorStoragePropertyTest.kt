package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.DndSubclassRepository
import com.masterforge.masterforge_backend.repository.ItemRepository
import com.masterforge.masterforge_backend.repository.MonsterRepository
import com.masterforge.masterforge_backend.repository.SpellRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.property.Arb
import io.kotest.property.arbitrary.Codepoint
import io.kotest.property.arbitrary.alphanumeric
import io.kotest.property.arbitrary.double
import io.kotest.property.arbitrary.filter
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.UUID

/**
 * Property-based test for HomebrewController — Property 6: Backend stores the correct author on creation.
 *
 * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
 *
 * For any valid homebrew item creation request carrying a JWT, the persisted entity's author_id
 * SHALL equal the UUID of the user whose ID was provided as authorId in the DTO.
 *
 * Validates: Requirements 8.1
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HomebrewControllerAuthorStoragePropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndSubclassRepository: DndSubclassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var monsterRepository: MonsterRepository
    @Autowired lateinit var spellRepository: SpellRepository
    @Autowired lateinit var itemRepository: ItemRepository
    @Autowired lateinit var jwtService: JwtService

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun cleanAll() {
        dndSubclassRepository.deleteAll()
        dndClassRepository.deleteAll()
        dndRaceRepository.deleteAll()
        monsterRepository.deleteAll()
        spellRepository.deleteAll()
        itemRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveUser(tag: String = UUID.randomUUID().toString()): User =
        userRepository.save(
            User(
                name = "User_$tag",
                email = "user_$tag@test.com",
                passwordHash = "hash"
            )
        )

    /** Escapes a string value for safe embedding inside a JSON string literal. */
    private fun String.escapeJson(): String = this
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")

    // ── Arb generators ────────────────────────────────────────────────────────

    /** Generates non-blank alphanumeric strings of length 1–50. */
    private val arbName: Arb<String> =
        Arb.string(1, 50, Codepoint.alphanumeric()).filter { it.isNotBlank() }

    /** Generates valid hitDie values (4, 6, 8, 10, 12). */
    private val arbHitDie: Arb<Int> =
        Arb.int(1, 5).map { listOf(4, 6, 8, 10, 12)[it - 1] }

    /** Generates non-negative prices with 2 decimal places. */
    private val arbPrice: Arb<BigDecimal> =
        Arb.double(0.0, 9999.99)
            .filter { it.isFinite() }
            .map { BigDecimal(it).setScale(2, RoundingMode.HALF_UP) }
            .filter { it >= BigDecimal.ZERO }

    /** Generates ability score bonuses in the range -10..10. */
    private val arbBonus: Arb<Int> = Arb.int(-10, 10)

    /** Generates valid monster stat values (1..30). */
    private val arbStat: Arb<Int> = Arb.int(1, 30)

    /** Generates valid armor class values (1..30). */
    private val arbArmorClass: Arb<Int> = Arb.int(1, 30)

    /** Generates valid hit point values (1..500). */
    private val arbHitPoints: Arb<Int> = Arb.int(1, 500)

    /** Generates valid challenge rating values (0.0..30.0). */
    private val arbChallengeRating: Arb<Double> =
        Arb.double(0.0, 30.0).filter { it.isFinite() && it >= 0.0 }

    /** Generates valid XP values (0..500000). */
    private val arbXp: Arb<Int> = Arb.int(0, 500_000)

    /** Generates valid spell level values (0..9). */
    private val arbSpellLevel: Arb<Int> = Arb.int(0, 9)

    /** Generates valid item weight values (0.0..500.0). */
    private val arbWeight: Arb<Double> =
        Arb.double(0.0, 500.0).filter { it.isFinite() && it >= 0.0 }

    // ── property tests ────────────────────────────────────────────────────────

    init {

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid DndClass DTO with a random authorId, the persisted DndClass entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/dnd-classes persists the correct author.id from the DTO" {
            checkAll(iterations = 30, arbName, arbHitDie, arbPrice) { name, hitDie, price ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "hitDie": $hitDie,
                      "price": ${price.toPlainString()},
                      "savingThrows": {},
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/dnd-classes")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = dndClassRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for DndClass: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for DndClass: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name', hitDie=$hitDie"
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid DndSubclass DTO with a random authorId, the persisted DndSubclass entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/dnd-subclasses persists the correct author.id from the DTO" {
            checkAll(iterations = 30, arbName, arbName) { name, description ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                // Create a parent class first (official content, no author)
                val parentClassBody = """
                    {
                      "name": "ParentClass_${UUID.randomUUID()}",
                      "hitDie": 8,
                      "price": 0.00,
                      "savingThrows": {}
                    }
                """.trimIndent()
                val parentClassResult = mockMvc.perform(
                    post("/api/dnd-classes")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentClassBody)
                )
                    .andExpect(status().isOk)
                    .andReturn()

                // Extract the parent class id from the response
                val parentClassJson = parentClassResult.response.contentAsString
                val parentClassId = parentClassJson
                    .substringAfter("\"id\":")
                    .substringBefore(",")
                    .trim()

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "description": "${description.escapeJson()}",
                      "parentClassId": $parentClassId,
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/dnd-subclasses")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = dndSubclassRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for DndSubclass: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for DndSubclass: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name'"
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid DndRace DTO with a random authorId, the persisted DndRace entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/dnd-races persists the correct author.id from the DTO" {
            checkAll(
                iterations = 30,
                arbName, arbPrice,
                arbBonus, arbBonus, arbBonus, arbBonus
            ) { name, price, bonusStr, bonusDex, bonusCon, bonusInt ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "price": ${price.toPlainString()},
                      "bonusStr": $bonusStr,
                      "bonusDex": $bonusDex,
                      "bonusCon": $bonusCon,
                      "bonusInt": $bonusInt,
                      "bonusWis": 0,
                      "bonusCha": 0,
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/dnd-races")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = dndRaceRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for DndRace: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for DndRace: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name'"
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid Monster DTO with a random authorId, the persisted Monster entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/monsters persists the correct author.id from the DTO" {
            checkAll(
                iterations = 30,
                arbName, arbArmorClass, arbHitPoints, arbChallengeRating
            ) { name, armorClass, hitPoints, challengeRating ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "type": "Humanoid",
                      "size": "Medium",
                      "armorClass": $armorClass,
                      "hitPoints": $hitPoints,
                      "speed": "30 ft.",
                      "str": 10,
                      "dex": 10,
                      "con": 10,
                      "intStat": 10,
                      "wis": 10,
                      "cha": 10,
                      "challengeRating": $challengeRating,
                      "xp": 100,
                      "combatMechanics": {},
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/monsters")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = monsterRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for Monster: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for Monster: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name', armorClass=$armorClass"
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid Spell DTO with a random authorId, the persisted Spell entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/spells persists the correct author.id from the DTO" {
            checkAll(
                iterations = 30,
                arbName, arbSpellLevel, arbName, arbName
            ) { name, level, school, description ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "level": $level,
                      "school": "${school.escapeJson()}",
                      "castingTime": "1 action",
                      "range": "30 ft.",
                      "duration": "Instantaneous",
                      "verbal": false,
                      "somatic": false,
                      "material": false,
                      "concentration": false,
                      "ritual": false,
                      "description": "${description.escapeJson()}",
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/spells")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = spellRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for Spell: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for Spell: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name', level=$level"
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 6: Backend stores the correct author on creation
         *
         * For any valid Item DTO with a random authorId, the persisted Item entity's
         * author.id SHALL equal the authorId provided in the DTO.
         *
         * Validates: Requirements 8.1
         */
        "Property 6 — POST /api/items persists the correct author.id from the DTO" {
            checkAll(
                iterations = 30,
                arbName, arbName, arbWeight
            ) { name, type, weight ->
                cleanAll()
                val author = saveUser()
                val token = jwtService.generateToken(author.id!!, author.email)

                val body = """
                    {
                      "name": "${name.escapeJson()}",
                      "type": "${type.escapeJson()}",
                      "weight": $weight,
                      "properties": {},
                      "authorId": "${author.id}"
                    }
                """.trimIndent()

                mockMvc.perform(
                    post("/api/items")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                val saved = itemRepository.findAll().first()
                assert(saved.author != null) {
                    "Property 6 violated for Item: expected author to be set but was null. " +
                    "authorId in DTO was ${author.id}"
                }
                assert(saved.author!!.id == author.id) {
                    "Property 6 violated for Item: expected author.id=${author.id} " +
                    "but got ${saved.author!!.id}. Input: name='$name', type='$type'"
                }
            }
        }
    }
}

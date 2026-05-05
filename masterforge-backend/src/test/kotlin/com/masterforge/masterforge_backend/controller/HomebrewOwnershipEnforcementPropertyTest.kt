package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.DndSubclass
import com.masterforge.masterforge_backend.model.entity.Item
import com.masterforge.masterforge_backend.model.entity.Monster
import com.masterforge.masterforge_backend.model.entity.Spell
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
import io.kotest.property.arbitrary.filter
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Property-based test for ownership enforcement — Property 7: Ownership enforcement rejects cross-user mutations.
 *
 * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
 *
 * For any homebrew item owned by user A, a DELETE request authenticated as user B (where B ≠ A)
 * SHALL receive an HTTP 403 Forbidden response, and the item SHALL remain in the database unchanged.
 *
 * Validates: Requirements 8.3, 8.4
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HomebrewOwnershipEnforcementPropertyTest : StringSpec() {

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

    // ── Arb generators ────────────────────────────────────────────────────────

    /** Generates non-blank alphanumeric strings of length 1–30. */
    private val arbName: Arb<String> =
        Arb.string(1, 30, Codepoint.alphanumeric()).filter { it.isNotBlank() }

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

    // ── property tests ────────────────────────────────────────────────────────

    init {

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any DndClass owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the DndClass SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/dnd-classes/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName) { name ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create a DndClass owned by user A
                val dndClass = dndClassRepository.save(
                    DndClass(
                        name = name,
                        price = BigDecimal.ZERO,
                        hitDie = 8,
                        savingThrows = emptyMap(),
                        author = userA
                    )
                )
                val classId = dndClass.id

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/dnd-classes/$classId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(dndClassRepository.existsById(classId)) {
                    "Property 7 violated for DndClass: item with id=$classId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any DndSubclass owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the DndSubclass SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/dnd-subclasses/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName, arbName) { name, description ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create a parent class (official content, no author)
                val parentClass = dndClassRepository.save(
                    DndClass(
                        name = "ParentClass_${UUID.randomUUID()}",
                        price = BigDecimal.ZERO,
                        hitDie = 6,
                        savingThrows = emptyMap(),
                        author = null
                    )
                )

                // Create a DndSubclass owned by user A
                val dndSubclass = dndSubclassRepository.save(
                    DndSubclass(
                        name = name,
                        description = description,
                        parentClass = parentClass,
                        author = userA
                    )
                )
                val subclassId = dndSubclass.id!!

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/dnd-subclasses/$subclassId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(dndSubclassRepository.existsById(subclassId)) {
                    "Property 7 violated for DndSubclass: item with id=$subclassId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any DndRace owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the DndRace SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/dnd-races/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName) { name ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create a DndRace owned by user A
                val dndRace = dndRaceRepository.save(
                    DndRace(
                        name = name,
                        price = BigDecimal.ZERO,
                        bonusStr = 0, bonusDex = 0, bonusCon = 0,
                        bonusInt = 0, bonusWis = 0, bonusCha = 0,
                        author = userA
                    )
                )
                val raceId = dndRace.id

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/dnd-races/$raceId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(dndRaceRepository.existsById(raceId)) {
                    "Property 7 violated for DndRace: item with id=$raceId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any Monster owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the Monster SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/monsters/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName) { name ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create a Monster owned by user A
                val monster = monsterRepository.save(
                    Monster(
                        name = name,
                        type = "Humanoid",
                        size = "Medium",
                        armorClass = 10,
                        hitPoints = 10,
                        speed = "30 ft.",
                        str = 10, dex = 10, con = 10,
                        intStat = 10, wis = 10, cha = 10,
                        challengeRating = 1.0,
                        xp = 200,
                        author = userA
                    )
                )
                val monsterId = monster.id!!

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/monsters/$monsterId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(monsterRepository.existsById(monsterId)) {
                    "Property 7 violated for Monster: item with id=$monsterId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any Spell owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the Spell SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/spells/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName, arbName, arbName) { name, school, description ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create a Spell owned by user A
                val spell = spellRepository.save(
                    Spell(
                        name = name,
                        level = 1,
                        school = school,
                        description = description,
                        author = userA
                    )
                )
                val spellId = spell.id!!

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/spells/$spellId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(spellRepository.existsById(spellId)) {
                    "Property 7 violated for Spell: item with id=$spellId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }

        /**
         * // Feature: homebrew-content-creation, Property 7: Ownership enforcement rejects cross-user mutations
         *
         * For any Item owned by user A, a DELETE request authenticated as user B (B ≠ A)
         * SHALL receive HTTP 403 Forbidden, and the Item SHALL still exist in the repository.
         *
         * Validates: Requirements 8.3, 8.4
         */
        "Property 7 — DELETE /api/items/{id} returns 403 when authenticated user is not the owner" {
            checkAll(iterations = 30, arbName, arbName) { name, type ->
                cleanAll()

                val userA = saveUser("ownerA")
                val userB = saveUser("attackerB")

                // Create an Item owned by user A
                val item = itemRepository.save(
                    Item(
                        name = name,
                        type = type,
                        weight = 1.0,
                        properties = emptyMap(),
                        author = userA
                    )
                )
                val itemId = item.id!!

                // Authenticate as user B (not the owner) and attempt DELETE
                val tokenB = jwtService.generateToken(userB.id!!, userB.email)

                mockMvc.perform(
                    delete("/api/items/$itemId")
                        .header("Authorization", "Bearer $tokenB")
                )
                    .andExpect(status().isForbidden)

                // Assert the item still exists in the repository
                assert(itemRepository.existsById(itemId)) {
                    "Property 7 violated for Item: item with id=$itemId was deleted by non-owner user B " +
                    "(userA.id=${userA.id}, userB.id=${userB.id}). Item should still exist."
                }
            }
        }
    }
}

package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
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
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Property-based test for HomebrewController — Property 1: Author filtering.
 *
 * Feature: homebrew-content-creation, Property 1: author filtering returns only the requesting user's items
 *
 * For any collection of homebrew items with mixed authorId values, when the backend fetches
 * items for a specific authenticated user, ALL returned items SHALL have an authorId equal to
 * that user's ID, and NO items belonging to other users SHALL be included.
 *
 * Validates: Requirements 2.1, 8.2
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HomebrewControllerAuthorFilterPropertyTest : StringSpec() {

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

    private val mapper = jacksonObjectMapper()

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

    private fun seedClassesForUser(user: User, count: Int): List<DndClass> =
        (1..count).map { i ->
            dndClassRepository.save(
                DndClass(
                    name = "Class_${user.id}_$i",
                    price = BigDecimal.ZERO,
                    hitDie = 8,
                    savingThrows = emptyMap(),
                    author = user
                )
            )
        }

    private fun seedSubclassesForUser(user: User, parentClass: DndClass, count: Int): List<DndSubclass> =
        (1..count).map { i ->
            dndSubclassRepository.save(
                DndSubclass(
                    name = "Subclass_${user.id}_$i",
                    description = "desc",
                    parentClass = parentClass,
                    author = user
                )
            )
        }

    private fun seedRacesForUser(user: User, count: Int): List<DndRace> =
        (1..count).map { i ->
            dndRaceRepository.save(
                DndRace(
                    name = "Race_${user.id}_$i",
                    price = BigDecimal.ZERO,
                    bonusStr = 0, bonusDex = 0, bonusCon = 0,
                    bonusInt = 0, bonusWis = 0, bonusCha = 0,
                    author = user
                )
            )
        }

    private fun seedMonstersForUser(user: User, count: Int): List<Monster> =
        (1..count).map { i ->
            monsterRepository.save(
                Monster(
                    name = "Monster_${user.id}_$i",
                    type = "Humanoid",
                    size = "Medium",
                    armorClass = 10,
                    hitPoints = 10,
                    speed = "30 ft.",
                    str = 10, dex = 10, con = 10,
                    intStat = 10, wis = 10, cha = 10,
                    challengeRating = 1.0,
                    xp = 200,
                    author = user
                )
            )
        }

    private fun seedSpellsForUser(user: User, count: Int): List<Spell> =
        (1..count).map { i ->
            spellRepository.save(
                Spell(
                    name = "Spell_${user.id}_$i",
                    level = 1,
                    school = "Evocation",
                    description = "A test spell",
                    author = user
                )
            )
        }

    private fun seedItemsForUser(user: User, count: Int): List<Item> =
        (1..count).map { i ->
            itemRepository.save(
                Item(
                    name = "Item_${user.id}_$i",
                    type = "Weapon",
                    weight = 1.0,
                    properties = emptyMap(),
                    author = user
                )
            )
        }

    // ── property test ─────────────────────────────────────────────────────────

    init {

        /**
         * Feature: homebrew-content-creation, Property 1: author filtering returns only the requesting user's items
         *
         * For any mix of items owned by the requesting user and items owned by other users,
         * GET /api/homebrew/my must return ONLY items whose author matches the authenticated user.
         *
         * Validates: Requirements 2.1, 8.2
         */
        "Property 1 — GET /api/homebrew/my returns only items authored by the authenticated user" {
            // Generate arbitrary counts: 0–3 items per content type for the requesting user,
            // and 1–3 items per content type for a second (other) user to ensure mixed data.
            checkAll(
                iterations = 30,
                Arb.int(0, 3), // myClasses
                Arb.int(0, 3), // mySubclasses
                Arb.int(0, 3), // myRaces
                Arb.int(0, 3), // myMonsters
                Arb.int(0, 3), // mySpells
                Arb.int(0, 3)  // myItems
            ) { myClasses, mySubclasses, myRaces, myMonsters, mySpells, myItems ->
                cleanAll()

                // Create the requesting user and a second user whose items must NOT appear
                val requestingUser = saveUser("requesting")
                val otherUser = saveUser("other")

                // Seed a shared parent class for subclasses (owned by no one — official content)
                val sharedParentClass = dndClassRepository.save(
                    DndClass(
                        name = "SharedParent_${UUID.randomUUID()}",
                        price = BigDecimal.ZERO,
                        hitDie = 6,
                        savingThrows = emptyMap(),
                        author = null // official content
                    )
                )

                // Seed items for the requesting user
                seedClassesForUser(requestingUser, myClasses)
                seedSubclassesForUser(requestingUser, sharedParentClass, mySubclasses)
                seedRacesForUser(requestingUser, myRaces)
                seedMonstersForUser(requestingUser, myMonsters)
                seedSpellsForUser(requestingUser, mySpells)
                seedItemsForUser(requestingUser, myItems)

                // Seed items for the other user (noise that must be filtered out)
                seedClassesForUser(otherUser, 1)
                seedSubclassesForUser(otherUser, sharedParentClass, 1)
                seedRacesForUser(otherUser, 1)
                seedMonstersForUser(otherUser, 1)
                seedSpellsForUser(otherUser, 1)
                seedItemsForUser(otherUser, 1)

                // Authenticate as the requesting user
                val token = jwtService.generateToken(requestingUser.id!!, requestingUser.email)

                val result = mockMvc.perform(
                    get("/api/homebrew/my")
                        .header("Authorization", "Bearer $token")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = result.response.contentAsString
                val summary: Map<String, List<Map<String, Any>>> = mapper.readValue(body)

                // Collect all returned items across all six content type groups
                val allReturnedItems: List<Map<String, Any>> =
                    (summary["classes"] ?: emptyList()) +
                    (summary["subclasses"] ?: emptyList()) +
                    (summary["races"] ?: emptyList()) +
                    (summary["monsters"] ?: emptyList()) +
                    (summary["spells"] ?: emptyList()) +
                    (summary["items"] ?: emptyList())

                // Property 1: every returned item's name must contain the requesting user's ID,
                // confirming it was authored by the requesting user and not the other user.
                // (Names are seeded as "Type_<userId>_<index>" so this is a reliable check.)
                val requestingUserId = requestingUser.id!!.toString()
                val foreignItems = allReturnedItems.filter { item ->
                    val name = item["name"]?.toString() ?: ""
                    !name.contains(requestingUserId)
                }

                assert(foreignItems.isEmpty()) {
                    "Property 1 violated: GET /api/homebrew/my returned ${foreignItems.size} item(s) " +
                    "not authored by the requesting user (id=$requestingUserId). " +
                    "Foreign items: ${foreignItems.map { it["name"] }}. " +
                    "Input: myClasses=$myClasses, mySubclasses=$mySubclasses, myRaces=$myRaces, " +
                    "myMonsters=$myMonsters, mySpells=$mySpells, myItems=$myItems"
                }

                // Also verify the counts match what was seeded for the requesting user
                val expectedTotal = myClasses + mySubclasses + myRaces + myMonsters + mySpells + myItems
                assert(allReturnedItems.size == expectedTotal) {
                    "Property 1 violated: expected $expectedTotal items for the requesting user " +
                    "but got ${allReturnedItems.size}. " +
                    "Input: myClasses=$myClasses, mySubclasses=$mySubclasses, myRaces=$myRaces, " +
                    "myMonsters=$myMonsters, mySpells=$mySpells, myItems=$myItems"
                }
            }
        }

        /**
         * Feature: homebrew-content-creation, Property 1 (edge case): empty result when user has no homebrew items
         *
         * When the authenticated user has created no homebrew items but other users have,
         * GET /api/homebrew/my must return empty lists for all content types.
         *
         * Validates: Requirements 2.1, 8.2
         */
        "Property 1 (edge case) — GET /api/homebrew/my returns empty lists when user has no homebrew items" {
            checkAll(iterations = 10, Arb.int(1, 3)) { otherUserItemCount ->
                cleanAll()

                val requestingUser = saveUser("requesting_empty")
                val otherUser = saveUser("other_nonempty")

                val sharedParentClass = dndClassRepository.save(
                    DndClass(
                        name = "SharedParent_${UUID.randomUUID()}",
                        price = BigDecimal.ZERO,
                        hitDie = 6,
                        savingThrows = emptyMap(),
                        author = null
                    )
                )

                // Only the other user has items
                seedClassesForUser(otherUser, otherUserItemCount)
                seedSubclassesForUser(otherUser, sharedParentClass, otherUserItemCount)
                seedRacesForUser(otherUser, otherUserItemCount)
                seedMonstersForUser(otherUser, otherUserItemCount)
                seedSpellsForUser(otherUser, otherUserItemCount)
                seedItemsForUser(otherUser, otherUserItemCount)

                val token = jwtService.generateToken(requestingUser.id!!, requestingUser.email)

                val result = mockMvc.perform(
                    get("/api/homebrew/my")
                        .header("Authorization", "Bearer $token")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = result.response.contentAsString
                val summary: Map<String, List<Map<String, Any>>> = mapper.readValue(body)

                val allReturnedItems: List<Map<String, Any>> =
                    (summary["classes"] ?: emptyList()) +
                    (summary["subclasses"] ?: emptyList()) +
                    (summary["races"] ?: emptyList()) +
                    (summary["monsters"] ?: emptyList()) +
                    (summary["spells"] ?: emptyList()) +
                    (summary["items"] ?: emptyList())

                assert(allReturnedItems.isEmpty()) {
                    "Property 1 edge case violated: expected empty result for user with no homebrew items " +
                    "but got ${allReturnedItems.size} item(s). " +
                    "Other user had $otherUserItemCount items per content type."
                }
            }
        }

        /**
         * Feature: homebrew-content-creation, Property 1 (unauthenticated): no JWT returns HTTP 401
         *
         * GET /api/homebrew/my without a valid JWT must return HTTP 401 Unauthorized.
         *
         * Validates: Requirement 8.5
         */
        "Property 1 (unauthenticated) — GET /api/homebrew/my without a JWT returns HTTP 401" {
            mockMvc.perform(get("/api/homebrew/my"))
                .andExpect(status().isUnauthorized)
        }
    }
}

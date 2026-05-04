package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.User
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: my-characters-page, Property 2: Filtrado de personajes por usuario
 *
 * Validates: Requirement 2.1
 *
 * Property: For any userId and any set of characters in the DB, the result of
 * findByUserId(userId) only contains characters whose user.id == userId.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class CharacterRepositoryPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired
    lateinit var characterRepository: CharacterRepository

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var dndClassRepository: DndClassRepository

    @Autowired
    lateinit var dndRaceRepository: DndRaceRepository

    @Autowired
    lateinit var campaignRepository: CampaignRepository

    @Autowired
    lateinit var enrollmentRepository: CampaignEnrollmentRepository

    @Autowired
    lateinit var sessionRepository: SessionRepository

    init {
        /**
         * Feature: my-characters-page, Property 2: Filtrado de personajes por usuario
         * Validates: Requirement 2.1
         */
        "Property 2: findByUserId returns only characters belonging to the given userId" {
            checkAll(100, Arb.int(1, 3), Arb.int(0, 3)) { numTargetChars, numOtherChars ->
                // Clean up before each iteration
                sessionRepository.deleteAll()
                enrollmentRepository.deleteAll()
                characterRepository.deleteAll()
                campaignRepository.deleteAll()
                userRepository.deleteAll()
                dndClassRepository.deleteAll()
                dndRaceRepository.deleteAll()

                // Create shared DndClass and DndRace for all characters
                val dndClass = dndClassRepository.save(
                    DndClass(
                        name = "Fighter",
                        price = BigDecimal.ZERO,
                        hitDie = 10,
                        savingThrows = emptyMap()
                    )
                )
                val dndRace = dndRaceRepository.save(
                    DndRace(
                        name = "Human",
                        price = BigDecimal.ZERO,
                        bonusStr = 1, bonusDex = 1, bonusCon = 1,
                        bonusInt = 1, bonusWis = 1, bonusCha = 1
                    )
                )

                // Create the target user (the one we will query by)
                val targetUser = userRepository.save(
                    User(
                        name = "TargetUser",
                        email = "target_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )

                // Create characters belonging to the target user
                repeat(numTargetChars) { i ->
                    characterRepository.save(
                        buildCharacter(
                            name = "TargetChar$i",
                            user = targetUser,
                            dndClass = dndClass,
                            dndRace = dndRace
                        )
                    )
                }

                // Create other users with their own characters (should NOT appear in results)
                repeat(numOtherChars) { i ->
                    val otherUser = userRepository.save(
                        User(
                            name = "OtherUser$i",
                            email = "other_${UUID.randomUUID()}_$i@test.com",
                            passwordHash = "hash"
                        )
                    )
                    characterRepository.save(
                        buildCharacter(
                            name = "OtherChar$i",
                            user = otherUser,
                            dndClass = dndClass,
                            dndRace = dndRace
                        )
                    )
                }

                // Execute the query under test
                val result = characterRepository.findByUserId(targetUser.id!!)

                // Property: all returned characters must belong to the target user
                result.size shouldBe numTargetChars
                result.forEach { character ->
                    character.user.id shouldBe targetUser.id
                }
            }
        }

        "Property 2 (edge case): findByUserId returns empty list for userId with no characters" {
            checkAll(100, Arb.int(1, 3)) { numOtherChars ->
                // Clean up before each iteration
                sessionRepository.deleteAll()
                enrollmentRepository.deleteAll()
                characterRepository.deleteAll()
                campaignRepository.deleteAll()
                userRepository.deleteAll()
                dndClassRepository.deleteAll()
                dndRaceRepository.deleteAll()

                val dndClass = dndClassRepository.save(
                    DndClass(
                        name = "Wizard",
                        price = BigDecimal.ZERO,
                        hitDie = 6,
                        savingThrows = emptyMap()
                    )
                )
                val dndRace = dndRaceRepository.save(
                    DndRace(
                        name = "Elf",
                        price = BigDecimal.ZERO,
                        bonusStr = 0, bonusDex = 2, bonusCon = 0,
                        bonusInt = 1, bonusWis = 0, bonusCha = 0
                    )
                )

                // Create a user with no characters
                val emptyUser = userRepository.save(
                    User(
                        name = "EmptyUser",
                        email = "empty_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )

                // Create other users with characters
                repeat(numOtherChars) { i ->
                    val otherUser = userRepository.save(
                        User(
                            name = "OtherUser$i",
                            email = "other2_${UUID.randomUUID()}_$i@test.com",
                            passwordHash = "hash"
                        )
                    )
                    characterRepository.save(
                        buildCharacter(
                            name = "OtherChar$i",
                            user = otherUser,
                            dndClass = dndClass,
                            dndRace = dndRace
                        )
                    )
                }

                // Property: querying by a userId with no characters returns empty list
                val result = characterRepository.findByUserId(emptyUser.id!!)
                result.shouldBeEmpty()
            }
        }

        "Property 2 (isolation): findByUserId never returns characters from other users" {
            checkAll(100, Arb.int(1, 3), Arb.int(1, 3)) { numTargetChars, numOtherChars ->
                // Clean up before each iteration
                sessionRepository.deleteAll()
                enrollmentRepository.deleteAll()
                characterRepository.deleteAll()
                campaignRepository.deleteAll()
                userRepository.deleteAll()
                dndClassRepository.deleteAll()
                dndRaceRepository.deleteAll()

                val dndClass = dndClassRepository.save(
                    DndClass(
                        name = "Rogue",
                        price = BigDecimal.ZERO,
                        hitDie = 8,
                        savingThrows = emptyMap()
                    )
                )
                val dndRace = dndRaceRepository.save(
                    DndRace(
                        name = "Halfling",
                        price = BigDecimal.ZERO,
                        bonusStr = 0, bonusDex = 2, bonusCon = 0,
                        bonusInt = 0, bonusWis = 0, bonusCha = 0
                    )
                )

                val targetUser = userRepository.save(
                    User(
                        name = "TargetUser",
                        email = "target2_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )

                val otherUserIds = mutableListOf<UUID>()

                repeat(numTargetChars) { i ->
                    characterRepository.save(
                        buildCharacter(
                            name = "TargetChar$i",
                            user = targetUser,
                            dndClass = dndClass,
                            dndRace = dndRace
                        )
                    )
                }

                repeat(numOtherChars) { i ->
                    val otherUser = userRepository.save(
                        User(
                            name = "OtherUser$i",
                            email = "other3_${UUID.randomUUID()}_$i@test.com",
                            passwordHash = "hash"
                        )
                    )
                    otherUserIds.add(otherUser.id!!)
                    characterRepository.save(
                        buildCharacter(
                            name = "OtherChar$i",
                            user = otherUser,
                            dndClass = dndClass,
                            dndRace = dndRace
                        )
                    )
                }

                val result = characterRepository.findByUserId(targetUser.id!!)

                // Property: no character in the result belongs to another user
                result.forEach { character ->
                    character.user.id shouldBe targetUser.id
                    otherUserIds.none { it == character.user.id } shouldBe true
                }
            }
        }

        // Feature: dm-players-campaign-filter, Property 3: character list is filtered to DM campaigns only
        /**
         * Property 3: Character list is filtered to DM campaigns only
         * Validates: Requirements 1.3, 3.3
         *
         * For any DM user and any set of characters distributed across owned and non-owned campaigns
         * (including characters with null campaign_id), findCharactersByDmId(dmId) must return only
         * characters whose campaign.owner.id == dmId and whose campaign != null.
         */
        "Property 3: findCharactersByDmId returns only characters in DM-owned campaigns" {
            checkAll(100, Arb.int(1, 3), Arb.int(0, 3), Arb.int(0, 3)) {
                numDmChars, numOtherCampaignChars, numNoCampaignChars ->

                // Clean up before each iteration
                sessionRepository.deleteAll()
                enrollmentRepository.deleteAll()
                characterRepository.deleteAll()
                campaignRepository.deleteAll()
                userRepository.deleteAll()
                dndClassRepository.deleteAll()
                dndRaceRepository.deleteAll()

                val dndClass = dndClassRepository.save(
                    DndClass(
                        name = "Paladin",
                        price = BigDecimal.ZERO,
                        hitDie = 10,
                        savingThrows = emptyMap()
                    )
                )
                val dndRace = dndRaceRepository.save(
                    DndRace(
                        name = "Dwarf",
                        price = BigDecimal.ZERO,
                        bonusStr = 0, bonusDex = 0, bonusCon = 2,
                        bonusInt = 0, bonusWis = 0, bonusCha = 0
                    )
                )

                // Create the DM user (the one whose campaigns we filter by)
                val dmUser = userRepository.save(
                    User(
                        name = "DmUser",
                        email = "dm_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )

                // Create a campaign owned by the DM
                val dmCampaign = campaignRepository.save(
                    Campaign(
                        name = "DM Campaign",
                        description = "A campaign owned by the DM",
                        owner = dmUser,
                        maxPlayers = 4,
                        joinPrice = java.math.BigDecimal.ZERO,
                        visibility = com.masterforge.masterforge_backend.model.entity.CampaignVisibility.PRIVATE
                    )
                )

                // Create another user who owns a different campaign
                val otherDm = userRepository.save(
                    User(
                        name = "OtherDm",
                        email = "otherdm_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )
                val otherCampaign = campaignRepository.save(
                    Campaign(
                        name = "Other Campaign",
                        description = "A campaign owned by another DM",
                        owner = otherDm,
                        maxPlayers = 4,
                        joinPrice = java.math.BigDecimal.ZERO,
                        visibility = com.masterforge.masterforge_backend.model.entity.CampaignVisibility.PRIVATE
                    )
                )

                // Create a player user whose characters will be distributed
                val player = userRepository.save(
                    User(
                        name = "Player",
                        email = "player_${UUID.randomUUID()}@test.com",
                        passwordHash = "hash"
                    )
                )

                // Characters in the DM's campaign — these SHOULD appear in results
                repeat(numDmChars) { i ->
                    characterRepository.save(
                        buildCharacter(
                            name = "DmChar$i",
                            user = player,
                            dndClass = dndClass,
                            dndRace = dndRace,
                            campaign = dmCampaign
                        )
                    )
                }

                // Characters in another campaign — these should NOT appear
                repeat(numOtherCampaignChars) { i ->
                    characterRepository.save(
                        buildCharacter(
                            name = "OtherCampaignChar$i",
                            user = player,
                            dndClass = dndClass,
                            dndRace = dndRace,
                            campaign = otherCampaign
                        )
                    )
                }

                // Characters with no campaign (null) — these should NOT appear
                repeat(numNoCampaignChars) { i ->
                    characterRepository.save(
                        buildCharacter(
                            name = "NoCampaignChar$i",
                            user = player,
                            dndClass = dndClass,
                            dndRace = dndRace,
                            campaign = null
                        )
                    )
                }

                // Execute the query under test
                val result = characterRepository.findCharactersByDmId(dmUser.id!!)

                // Property: result count matches exactly the number of DM-campaign characters
                result.size shouldBe numDmChars

                // Property: every returned character has campaign != null and campaign.owner.id == dmId
                result.forEach { character ->
                    character.campaign shouldBe dmCampaign
                    character.campaign!!.owner.id shouldBe dmUser.id
                }
            }
        }
    }
}

private fun buildCharacter(
    name: String,
    user: User,
    dndClass: DndClass,
    dndRace: DndRace,
    campaign: Campaign? = null
): Character = Character(
    name = name,
    level = 1,
    maxHp = 10,
    currentHp = 10,
    tempHp = 0,
    speed = 30,
    hitDiceTotal = 1,
    hitDiceSpent = 0,
    background = "Acolyte",
    alignment = "Neutral",
    xp = 0,
    cp = 0, sp = 0, ep = 0, gp = 0, pp = 0,
    baseStr = 10, baseDex = 10, baseCon = 10,
    baseInt = 10, baseWis = 10, baseCha = 10,
    savingThrowsProficiencies = emptyMap(),
    skillProficiencies = emptyMap(),
    spellSlots = emptyMap(),
    user = user,
    dndClass = dndClass,
    dndRace = dndRace,
    subclass = null,
    campaign = campaign,
    choicesJson = emptyMap()
)

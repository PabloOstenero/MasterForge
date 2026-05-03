package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: dm-players-campaign-filter
 *
 * Property-based tests for GET /api/users/me/campaign-players endpoint.
 *
 * Property 1: Returned users all have characters in DM campaigns
 * Property 4: Campaign-players is a subset of all users
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignPlayersControllerPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var jwtService: JwtService

    private val objectMapper = jacksonObjectMapper()

    init {

        // Feature: dm-players-campaign-filter, Property 1: returned users all have characters in DM campaigns
        /**
         * Property 1: Returned users all have characters in DM campaigns
         * Validates: Requirements 1.1
         *
         * For any DM user, any set of campaigns owned by that DM, and any players with characters
         * distributed across those campaigns and others, every user returned by the endpoint must
         * have at least one character whose campaign.owner.id equals the authenticated DM's ID.
         */
        "Property 1: every user returned by campaign-players has at least one character in a DM-owned campaign" {
            checkAll(100, Arb.int(1, 3), Arb.int(1, 3), Arb.int(0, 2)) {
                numPlayers, numDmCharsPerPlayer, numOtherCharsPerPlayer ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val dm = saveUser("DM")
                val otherDm = saveUser("OtherDM")
                val dmCampaign = saveCampaign(dm)
                val otherCampaign = saveCampaign(otherDm)

                // Create players with characters in both DM and non-DM campaigns
                repeat(numPlayers) {
                    val player = saveUser("Player")
                    repeat(numDmCharsPerPlayer) {
                        saveCharacter(player, dndClass, dndRace, dmCampaign)
                    }
                    repeat(numOtherCharsPerPlayer) {
                        saveCharacter(player, dndClass, dndRace, otherCampaign)
                    }
                }

                val token = jwtService.generateToken(dm.id!!, dm.email)
                val response = performGet(token)

                // Property 1: every returned user has at least one character in the DM's campaign
                response.forEach { player ->
                    val hasCharInDmCampaign = player.characters.isNotEmpty()
                    hasCharInDmCampaign shouldBe true
                }

                // Also verify the count: all numPlayers players should appear (each has DM chars)
                response.size shouldBe numPlayers
            }
        }

        "Property 1: DM with no campaigns returns empty list — no users without DM characters" {
            checkAll(100, Arb.int(0, 3)) { numUnrelatedPlayers ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val dm = saveUser("DM")
                val otherDm = saveUser("OtherDM")
                val otherCampaign = saveCampaign(otherDm)

                // Create players with characters only in non-DM campaigns
                repeat(numUnrelatedPlayers) {
                    val player = saveUser("Player")
                    saveCharacter(player, dndClass, dndRace, otherCampaign)
                }

                val token = jwtService.generateToken(dm.id!!, dm.email)
                val response = performGet(token)

                // Property 1: no users returned since DM owns no campaigns
                response.size shouldBe 0
            }
        }

        // Feature: dm-players-campaign-filter, Property 4: campaign-players is a subset of all users
        /**
         * Property 4: Campaign-players is a subset of all users
         * Validates: Requirements 3.4
         *
         * For any DM user and any database state, the set of user IDs returned by
         * GET /api/users/me/campaign-players must be a subset of the user IDs returned
         * by GET /api/users.
         */
        "Property 4: campaign-players IDs are a subset of all user IDs" {
            checkAll(100, Arb.int(0, 3), Arb.int(0, 3)) {
                numDmPlayers, numUnrelatedPlayers ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val dm = saveUser("DM")
                val otherDm = saveUser("OtherDM")
                val dmCampaign = saveCampaign(dm)
                val otherCampaign = saveCampaign(otherDm)

                // Players in DM's campaign
                repeat(numDmPlayers) {
                    val player = saveUser("DmPlayer")
                    saveCharacter(player, dndClass, dndRace, dmCampaign)
                }

                // Players in other campaigns (not in DM's)
                repeat(numUnrelatedPlayers) {
                    val player = saveUser("OtherPlayer")
                    saveCharacter(player, dndClass, dndRace, otherCampaign)
                }

                val token = jwtService.generateToken(dm.id!!, dm.email)
                val campaignPlayers = performGet(token)

                // Fetch all users from the DB
                val allUserIds = userRepository.findAll().map { it.id!! }.toSet()
                val campaignPlayerIds = campaignPlayers.map { UUID.fromString(it.id) }.toSet()

                // Property 4: campaignPlayerIds ⊆ allUserIds
                val isSubset = allUserIds.containsAll(campaignPlayerIds)
                isSubset shouldBe true
            }
        }

        "Property 4: campaign-players never contains users that do not exist in the system" {
            checkAll(100, Arb.int(1, 4)) { numPlayers ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val dm = saveUser("DM")
                val dmCampaign = saveCampaign(dm)

                repeat(numPlayers) {
                    val player = saveUser("Player")
                    saveCharacter(player, dndClass, dndRace, dmCampaign)
                }

                val token = jwtService.generateToken(dm.id!!, dm.email)
                val campaignPlayers = performGet(token)

                val allUserIds = userRepository.findAll().map { it.id!!.toString() }.toSet()

                // Property 4: every returned user ID must exist in the user table
                campaignPlayers.forEach { player ->
                    (allUserIds.contains(player.id)) shouldBe true
                }
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        characterRepository.deleteAll()
        sessionRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
        dndClassRepository.deleteAll()
        dndRaceRepository.deleteAll()
    }

    private fun saveClassAndRace(): Pair<DndClass, DndRace> {
        val dndClass = dndClassRepository.save(
            DndClass(name = "Fighter", price = BigDecimal.ZERO, hitDie = 10, savingThrows = emptyMap())
        )
        val dndRace = dndRaceRepository.save(
            DndRace(
                name = "Human", price = BigDecimal.ZERO,
                bonusStr = 1, bonusDex = 1, bonusCon = 1,
                bonusInt = 1, bonusWis = 1, bonusCha = 1
            )
        )
        return dndClass to dndRace
    }

    private fun saveUser(role: String): User = userRepository.save(
        User(
            name = "${role}_${UUID.randomUUID()}",
            email = "${role.lowercase()}_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
    )

    private fun saveCampaign(owner: User): Campaign = campaignRepository.save(
        Campaign(
            name = "Campaign_${UUID.randomUUID()}",
            description = "desc",
            owner = owner,
            maxPlayers = 4,
            joinPrice = java.math.BigDecimal.ZERO,
            visibility = com.masterforge.masterforge_backend.model.entity.CampaignVisibility.PRIVATE
        )
    )

    private fun saveCharacter(owner: User, dndClass: DndClass, dndRace: DndRace, campaign: Campaign?): Character =
        characterRepository.save(
            Character(
                name = "Char_${UUID.randomUUID()}",
                level = 1, maxHp = 10, currentHp = 10, tempHp = 0,
                speed = 30, hitDiceTotal = 1, hitDiceSpent = 0,
                background = "Acolyte", alignment = "Neutral", xp = 0,
                cp = 0, sp = 0, ep = 0, gp = 0, pp = 0,
                baseStr = 10, baseDex = 10, baseCon = 10,
                baseInt = 10, baseWis = 10, baseCha = 10,
                savingThrowsProficiencies = emptyMap(),
                skillProficiencies = emptyMap(),
                spellSlots = emptyMap(),
                user = owner,
                dndClass = dndClass,
                dndRace = dndRace,
                subclass = null,
                campaign = campaign,
                choicesJson = emptyMap()
            )
        )

    /**
     * Performs GET /api/users/me/campaign-players with the given JWT and returns
     * the parsed response as a list of simple maps for assertion.
     */
    private fun performGet(token: String): List<CampaignPlayerResponse> {
        val result = mockMvc.perform(
            get("/api/users/me/campaign-players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andReturn()

        return objectMapper.readValue(result.response.contentAsString)
    }

    /** Minimal response shape for assertions — mirrors CampaignPlayerDto */
    data class CampaignPlayerResponse(
        val id: String,
        val name: String,
        val email: String,
        val subscriptionTier: String,
        val characters: List<CharacterResponse>
    )

    data class CharacterResponse(
        val id: String,
        val name: String,
        val level: Int,
        val dndClass: String,
        val dndRace: String
    )
}

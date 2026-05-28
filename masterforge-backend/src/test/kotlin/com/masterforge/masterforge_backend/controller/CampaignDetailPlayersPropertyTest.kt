package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
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
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: campaign-detail-page
 *
 * Property-based tests for GET /api/campaigns/{id}/players endpoint.
 *
 * Property 4: Players belong to the requested campaign
 * Property 5: Characters are filtered to the requested campaign
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignDetailPlayersPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var jwtService: JwtService

    private val objectMapper = jacksonObjectMapper()

    init {

        // ── Property 4: Players belong to the requested campaign ──────────────

        /**
         * Feature: campaign-detail-page
         * Property 4: Players belong to the requested campaign
         * Validates: Requirements 2.1
         *
         * For any campaign ID and any set of enrollments in the database (some for the
         * requested campaign, some for others), the endpoint SHALL return only users who
         * have a CampaignEnrollment record for the requested campaign UUID.
         */
        "Property 4: all returned players are enrolled in the requested campaign" {
            checkAll(100, Arb.int(1, 5), Arb.int(0, 5)) {
                numTargetPlayers, numOtherPlayers ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                // Enroll players in the target campaign
                val targetPlayerIds = mutableSetOf<UUID>()
                repeat(numTargetPlayers) {
                    val player = saveUser("TargetPlayer")
                    enroll(player, targetCampaign)
                    targetPlayerIds.add(player.id!!)
                }

                // Enroll players in a different campaign — must NOT appear in the response
                repeat(numOtherPlayers) {
                    val player = saveUser("OtherPlayer")
                    enroll(player, otherCampaign)
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetPlayers(token, targetCampaign.id!!)

                // Property 4: every returned player must be enrolled in the target campaign
                response.size shouldBe numTargetPlayers
                response.forEach { player ->
                    val playerId = UUID.fromString(player.id)
                    targetPlayerIds.contains(playerId).shouldBeTrue()
                }
            }
        }

        "Property 4: players from other campaigns never appear in the response" {
            checkAll(100, Arb.int(0, 4), Arb.int(1, 4)) {
                numTargetPlayers, numOtherPlayers ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                repeat(numTargetPlayers) {
                    val player = saveUser("TargetPlayer")
                    enroll(player, targetCampaign)
                }

                val otherPlayerIds = mutableSetOf<UUID>()
                repeat(numOtherPlayers) {
                    val player = saveUser("OtherPlayer")
                    enroll(player, otherCampaign)
                    otherPlayerIds.add(player.id!!)
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetPlayers(token, targetCampaign.id!!)

                // No returned player ID should belong to the other campaign's enrollments
                response.forEach { player ->
                    val playerId = UUID.fromString(player.id)
                    otherPlayerIds.contains(playerId) shouldBe false
                }
            }
        }

        // ── Property 5: Characters are filtered to the requested campaign ─────

        /**
         * Feature: campaign-detail-page
         * Property 5: Characters are filtered to the requested campaign
         * Validates: Requirements 2.7
         *
         * For any player enrolled in a campaign, the characters list in their
         * CampaignPlayerDto SHALL contain only characters whose campaign_id equals the
         * requested campaign UUID. Characters linked to other campaigns or to no campaign
         * shall not appear.
         */
        "Property 5: each player's characters list contains only characters for the requested campaign" {
            checkAll(100, Arb.int(1, 4), Arb.int(0, 3), Arb.int(0, 3)) {
                numPlayers, numTargetCharsPerPlayer, numOtherCharsPerPlayer ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                repeat(numPlayers) {
                    val player = saveUser("Player")
                    enroll(player, targetCampaign)

                    // Characters in the target campaign — should appear
                    repeat(numTargetCharsPerPlayer) {
                        saveCharacter(player, dndClass, dndRace, targetCampaign)
                    }
                    // Characters in another campaign — must NOT appear
                    repeat(numOtherCharsPerPlayer) {
                        saveCharacter(player, dndClass, dndRace, otherCampaign)
                    }
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetPlayers(token, targetCampaign.id!!)

                response.size shouldBe numPlayers

                // Property 5: every character in every player's list must belong to the target campaign
                val targetCampaignCharIds = characterRepository
                    .findAll()
                    .filter { it.campaign?.id == targetCampaign.id }
                    .map { it.id!!.toString() }
                    .toSet()

                response.forEach { player ->
                    player.characters.size shouldBe numTargetCharsPerPlayer
                    player.characters.forEach { character ->
                        targetCampaignCharIds.contains(character.id).shouldBeTrue()
                    }
                }
            }
        }

        "Property 5: characters from other campaigns never appear in any player's characters list" {
            checkAll(100, Arb.int(1, 3), Arb.int(1, 3)) {
                numPlayers, numOtherCharsPerPlayer ->

                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                val otherCharIds = mutableSetOf<String>()
                repeat(numPlayers) {
                    val player = saveUser("Player")
                    enroll(player, targetCampaign)

                    // Characters only in the other campaign — must NOT appear
                    repeat(numOtherCharsPerPlayer) {
                        val char = saveCharacter(player, dndClass, dndRace, otherCampaign)
                        otherCharIds.add(char.id!!.toString())
                    }
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetPlayers(token, targetCampaign.id!!)

                response.size shouldBe numPlayers
                response.forEach { player ->
                    // Each player should have 0 characters (none in target campaign)
                    player.characters.size shouldBe 0
                    player.characters.forEach { character ->
                        otherCharIds.contains(character.id) shouldBe false
                    }
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
                name = "Human", price = BigDecimal.ZERO
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
            maxPlayers = 10,
            joinPrice = BigDecimal.ZERO,
            visibility = CampaignVisibility.PRIVATE
        )
    )

    private fun enroll(user: User, campaign: Campaign): CampaignEnrollment =
        campaignEnrollmentRepository.save(
            CampaignEnrollment(campaign = campaign, user = user)
        )

    private fun saveCharacter(
        owner: User,
        dndClass: DndClass,
        dndRace: DndRace,
        campaign: Campaign?
    ): Character = characterRepository.save(
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

    private fun performGetPlayers(token: String, campaignId: UUID): List<CampaignPlayerResponse> {
        val result = mockMvc.perform(
            get("/api/campaigns/$campaignId/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andReturn()

        return objectMapper.readValue(result.response.contentAsString)
    }

    /** Minimal response shape mirroring CampaignPlayerDto for assertions. */
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    data class CampaignPlayerResponse(
        val id: String,
        val name: String,
        val email: String,
        val subscriptionTier: String,
        val characters: List<CharacterResponse>
    )

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    data class CharacterResponse(
        val id: String,
        val name: String,
        val level: Int,
        val dndClass: String,
        val dndRace: String
    )
}

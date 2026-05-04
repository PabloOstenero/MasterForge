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
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.uuid
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: player-campaign-detail
 *
 * Property-based tests for PUT /api/characters/{characterId}/campaign/{campaignId}.
 *
 * Property 7: Character ownership enforced by backend
 * Property 8: Campaign enrollment enforced by backend
 * Property 9: Assignment persistence round-trip
 *
 * Validates: Requirements 5.5, 5.6, 5.2
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CharacterCampaignAssignmentPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var sessionAttendeeRepository: SessionAttendeeRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var jwtService: JwtService

    private val objectMapper = jacksonObjectMapper()

    init {

        // ── Property 7: Character ownership enforced by backend ───────────────

        /**
         * Feature: player-campaign-detail, Property 7: Character ownership enforced by backend
         * Validates: Requirements 5.5
         *
         * For any UUID pair where authenticatedUserId != character.user.id,
         * the endpoint SHALL return HTTP 403.
         */
        "Property 7: endpoint returns 403 when authenticated user does not own the character" {
            checkAll(100, Arb.uuid(), Arb.uuid()) { _, _ ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                // characterOwner is a different user from the authenticated caller
                val characterOwner = saveUser("Owner")
                val authenticatedUser = saveUser("Caller")

                val campaign = saveCampaign(authenticatedUser)
                // Enroll the authenticated user so enrollment check passes
                enroll(authenticatedUser, campaign)

                // Character is owned by characterOwner, NOT by authenticatedUser
                val character = saveCharacter(characterOwner, dndClass, dndRace, null)

                val token = jwtService.generateToken(authenticatedUser.id!!, authenticatedUser.email)

                mockMvc.perform(
                    put("/api/characters/${character.id}/campaign/${campaign.id}")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                )
                    .andExpect(status().isForbidden)
            }
        }

        // ── Property 8: Campaign enrollment enforced by backend ───────────────

        /**
         * Feature: player-campaign-detail, Property 8: Campaign enrollment enforced by backend
         * Validates: Requirements 5.6
         *
         * For any enrollment table where existsByCampaignIdAndUserId returns false,
         * the endpoint SHALL return HTTP 403.
         */
        "Property 8: endpoint returns 403 when authenticated user is not enrolled in the campaign" {
            checkAll(100, Arb.uuid(), Arb.uuid()) { _, _ ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val authenticatedUser = saveUser("Player")
                val campaignOwner = saveUser("DM")

                val campaign = saveCampaign(campaignOwner)
                // Deliberately do NOT enroll authenticatedUser in the campaign

                // Character is owned by authenticatedUser (ownership check passes)
                val character = saveCharacter(authenticatedUser, dndClass, dndRace, null)

                val token = jwtService.generateToken(authenticatedUser.id!!, authenticatedUser.email)

                mockMvc.perform(
                    put("/api/characters/${character.id}/campaign/${campaign.id}")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                )
                    .andExpect(status().isForbidden)
            }
        }

        // ── Property 9: Assignment persistence round-trip ─────────────────────

        /**
         * Feature: player-campaign-detail, Property 9: Assignment persistence round-trip
         * Validates: Requirements 5.2
         *
         * For any valid owned+enrolled (characterId, campaignId) pair, the response
         * CharacterResponseDto.campaign.id SHALL equal campaignId, and a subsequent
         * GET /api/characters/{characterId} SHALL also return campaign.id == campaignId.
         */
        "Property 9: successful assignment returns campaign.id equal to campaignId and GET confirms persistence" {
            checkAll(100, Arb.uuid(), Arb.uuid()) { _, _ ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()

                val authenticatedUser = saveUser("Player")
                val campaignOwner = saveUser("DM")

                val campaign = saveCampaign(campaignOwner)
                // Enroll the authenticated user so enrollment check passes
                enroll(authenticatedUser, campaign)

                // Character is owned by authenticatedUser (ownership check passes)
                val character = saveCharacter(authenticatedUser, dndClass, dndRace, null)

                val token = jwtService.generateToken(authenticatedUser.id!!, authenticatedUser.email)

                // PUT — assign character to campaign
                val putResult = mockMvc.perform(
                    put("/api/characters/${character.id}/campaign/${campaign.id}")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val putResponse: Map<String, Any?> = objectMapper.readValue(putResult.response.contentAsString)
                val campaignRef = putResponse["campaign"] as? Map<*, *>
                campaignRef?.get("id") shouldBe campaign.id.toString()

                // GET — verify persistence
                val getResult = mockMvc.perform(
                    get("/api/characters/${character.id}")
                        .header("Authorization", "Bearer $token")
                        .accept(MediaType.APPLICATION_JSON)
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val getResponse: Map<String, Any?> = objectMapper.readValue(getResult.response.contentAsString)
                val getCampaignRef = getResponse["campaign"] as? Map<*, *>
                getCampaignRef?.get("id") shouldBe campaign.id.toString()
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        // Delete in dependency order to avoid FK constraint violations.
        // Sessions reference campaigns, so sessions must be deleted before campaigns.
        // Characters reference users/classes/races, so characters must be deleted before users.
        // We intentionally do NOT delete dndClass/dndRace here because other test classes share the
        // same H2 database and may have characters referencing those records.
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveClassAndRace(): Pair<DndClass, DndRace> {
        val dndClass = dndClassRepository.save(
            DndClass(name = "Fighter_${UUID.randomUUID()}", price = BigDecimal.ZERO, hitDie = 10, savingThrows = emptyMap())
        )
        val dndRace = dndRaceRepository.save(
            DndRace(
                name = "Human_${UUID.randomUUID()}", price = BigDecimal.ZERO,
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
}

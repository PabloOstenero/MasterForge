package com.masterforge.masterforge_backend.controller

/**
 * Bug Condition Exploration Tests — Home Summary Cards Fix
 *
 * These tests are EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bugs exist. They encode the expected (correct) behavior
 * and will pass once the fix is implemented.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COUNTEREXAMPLES DOCUMENTED (observed on unfixed code):
 *
 * Test 1 — DM scoping:
 *   BUG CONFIRMED: GET /api/users/me/dm-next-session returns HTTP 404.
 *   The endpoint does not exist yet. The DM "Próxima Sesión" card reads from
 *   GET /api/sessions (all sessions system-wide) instead of a DM-scoped endpoint.
 *
 * Test 2 — Player campaignId:
 *   BUG CONFIRMED: GET /api/users/me/next-session response body is
 *   {"nextSessionDate":"2025-..."} — no "campaignId" field present.
 *   NextSessionDto only has nextSessionDate; campaignId is absent.
 *   The frontend cannot construct the navigation link /campaigns/{id}.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.CharacterSpellRepository
import com.masterforge.masterforge_backend.repository.InventorySlotRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import java.math.BigDecimal
import java.sql.Timestamp
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HomeSummaryCardsBugExplorationTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var sessionAttendeeRepository: SessionAttendeeRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var characterSpellRepository: CharacterSpellRepository
    @Autowired lateinit var inventorySlotRepository: InventorySlotRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var jwtService: JwtService

    private fun cleanAll() {
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        characterSpellRepository.deleteAll()
        inventorySlotRepository.deleteAll()
        characterRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveUser(name: String): User = userRepository.save(
        User(
            name = name,
            email = "${name.lowercase().replace(" ", "_")}_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
    )

    private fun saveCampaign(owner: User, name: String): Campaign = campaignRepository.save(
        Campaign(
            name = name,
            description = "desc",
            owner = owner,
            maxPlayers = 4,
            joinPrice = BigDecimal.ZERO,
            visibility = CampaignVisibility.PUBLIC
        )
    )

    private fun saveSession(campaign: Campaign, offsetDays: Long): Session = sessionRepository.save(
        Session(
            name = "Session_${UUID.randomUUID()}",
            scheduledDate = Timestamp.from(Instant.now().plus(offsetDays, ChronoUnit.DAYS)),
            price = BigDecimal.ZERO,
            campaign = campaign
        )
    )

    private fun saveAttendee(user: User, session: Session) {
        sessionAttendeeRepository.save(
            SessionAttendee(
                id = SessionAttendeeId(sessionId = session.id!!, userId = user.id!!),
                hasPaid = false,
                session = session,
                user = user
            )
        )
    }

    init {

        beforeTest { cleanAll() }
        afterTest { cleanAll() }

        // ─────────────────────────────────────────────────────────────────────
        // Test 1 — DM scoping
        //
        // Seed two DMs with sessions. Call GET /api/users/me/dm-next-session as
        // DM A and assert the returned session belongs to DM A's campaign.
        //
        // EXPECTED FAILURE on unfixed code: endpoint returns HTTP 404 (does not exist).
        //
        // Validates: Requirements 1.1, 2.1, 2.2
        // ─────────────────────────────────────────────────────────────────────
        "Test 1 — DM scoping: GET /api/users/me/dm-next-session returns DM A's session, not DM B's" {
            // Seed DM A with a session 10 days from now
            val dmA = saveUser("DM_A")
            val campaignA = saveCampaign(dmA, "Campaign A")
            saveSession(campaignA, offsetDays = 10L)

            // Seed DM B with a session 5 days from now (earlier than DM A's)
            val dmB = saveUser("DM_B")
            val campaignB = saveCampaign(dmB, "Campaign B")
            saveSession(campaignB, offsetDays = 5L)

            // Authenticate as DM A
            val tokenA = jwtService.generateToken(dmA.id!!, dmA.email)

            val result = mockMvc.perform(
                get("/api/users/me/dm-next-session")
                    .header("Authorization", "Bearer $tokenA")
            ).andReturn()

            // Bug condition: endpoint does not exist → returns 404
            // Expected (fixed) behavior: returns 200 with DM A's campaign session
            assert(result.response.status == 200) {
                "BUG CONFIRMED (Test 1): GET /api/users/me/dm-next-session returned HTTP ${result.response.status} " +
                "(expected 200). The DM-scoped session endpoint does not exist yet. " +
                "Counterexample: DM A (id=${dmA.id}) has a session in Campaign A (id=${campaignA.id}) " +
                "but the endpoint returns ${result.response.status} instead of 200 with DM A's session data."
            }

            val body = result.response.contentAsString
            val mapper = jacksonObjectMapper()
            val dto: Map<String, Any?> = mapper.readValue(body)

            val returnedCampaignId = dto["campaignId"]?.toString()
            assert(returnedCampaignId == campaignA.id.toString()) {
                "BUG CONFIRMED (Test 1): GET /api/users/me/dm-next-session returned campaignId=$returnedCampaignId " +
                "but expected campaignId=${campaignA.id} (DM A's campaign). " +
                "DM B's session (campaignId=${campaignB.id}) is earlier but must NOT be returned for DM A."
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Test 2 — Player campaignId
        //
        // Call GET /api/users/me/next-session as a player with an enrolled session
        // and assert the response includes a non-null campaignId.
        //
        // EXPECTED FAILURE on unfixed code: response body has no "campaignId" field
        // (NextSessionDto only has nextSessionDate).
        //
        // Validates: Requirements 1.8, 2.8
        // ─────────────────────────────────────────────────────────────────────
        "Test 2 — Player campaignId: GET /api/users/me/next-session response includes non-null campaignId" {
            // Seed a DM, campaign, session, and player attendee
            val dm = saveUser("DM_Player_Test")
            val campaign = saveCampaign(dm, "Player Campaign")
            val session = saveSession(campaign, offsetDays = 7L)

            val player = saveUser("Player_A")
            saveAttendee(player, session)

            // Authenticate as the player
            val playerToken = jwtService.generateToken(player.id!!, player.email)

            val result = mockMvc.perform(
                get("/api/users/me/next-session")
                    .header("Authorization", "Bearer $playerToken")
            ).andReturn()

            assert(result.response.status == 200) {
                "Unexpected HTTP status ${result.response.status} for GET /api/users/me/next-session"
            }

            val body = result.response.contentAsString
            val mapper = jacksonObjectMapper()
            val dto: Map<String, Any?> = mapper.readValue(body)

            // Bug condition: campaignId field is absent from the response
            // Expected (fixed) behavior: campaignId is present and non-null
            assert(dto.containsKey("campaignId")) {
                "BUG CONFIRMED (Test 2): GET /api/users/me/next-session response body does not contain 'campaignId'. " +
                "Response body: $body. " +
                "Counterexample: player (id=${player.id}) is enrolled in session (id=${session.id}) " +
                "of campaign (id=${campaign.id}), but the response only contains: ${dto.keys}. " +
                "NextSessionDto is missing the campaignId field."
            }

            val campaignId = dto["campaignId"]
            assert(campaignId != null) {
                "BUG CONFIRMED (Test 2): GET /api/users/me/next-session returned campaignId=null. " +
                "Expected campaignId=${campaign.id}. " +
                "The frontend cannot navigate to /campaigns/{id} without this field."
            }

            assert(campaignId.toString() == campaign.id.toString()) {
                "BUG CONFIRMED (Test 2): GET /api/users/me/next-session returned campaignId=$campaignId " +
                "but expected ${campaign.id}."
            }
        }
    }
}

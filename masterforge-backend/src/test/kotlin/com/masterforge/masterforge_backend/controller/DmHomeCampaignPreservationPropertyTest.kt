package com.masterforge.masterforge_backend.controller

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
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.property.Arb
import io.kotest.property.arbitrary.Codepoint
import io.kotest.property.arbitrary.alphanumeric
import io.kotest.property.arbitrary.bind
import io.kotest.property.arbitrary.double
import io.kotest.property.arbitrary.enum
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.math.RoundingMode
import java.sql.Timestamp
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * Preservation Property Tests - DM Home Campaign Filter
 *
 * These tests capture the BASELINE behavior of existing endpoints BEFORE the fix is applied.
 * They are expected to PASS on unfixed code, confirming the behavior that must be preserved.
 *
 * Observation summary (recorded on unfixed code):
 *   1. GET /api/campaigns returns ALL campaigns regardless of ownership (findAll() with no filter).
 *   2. POST /api/campaigns with a valid payload returns HTTP 200 and the persisted campaign
 *      with the correct owner.id.
 *   3. GET /api/users/me/player-campaigns returns HTTP 200 with an empty list.
 *      NOTE: The JWT subject is the user UUID (not email), but the repository query filters by
 *      email. This means the endpoint always returns an empty list on the current codebase.
 *      This is a pre-existing behavior that must not be changed by the DM filter fix.
 *   4. GET /api/campaigns/my without a JWT returns HTTP 401 (Spring Security rejects before handler).
 *
 * All four tests PASS on unfixed code - this confirms the baseline behavior to preserve.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DmHomeCampaignPreservationPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var sessionAttendeeRepository: SessionAttendeeRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var jwtService: JwtService

    private val mapper = jacksonObjectMapper()

    private data class CampaignDtoData(
        val name: String,
        val description: String,
        val maxPlayers: Int,
        val joinPrice: BigDecimal,
        val visibility: CampaignVisibility
    )

    private fun String.escapeJson(): String = this
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")

    private fun campaignJson(
        name: String,
        description: String,
        ownerId: UUID,
        maxPlayers: Int,
        joinPrice: String,
        visibility: String
    ): String = """{"name":"${name.escapeJson()}","description":"${description.escapeJson()}","ownerId":"$ownerId","maxPlayers":$maxPlayers,"joinPrice":$joinPrice,"visibility":"${visibility.escapeJson()}"}"""

    private fun cleanAll() {
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    init {
        beforeTest { cleanAll() }

        /**
         * Preservation 2a: GET /api/campaigns returns ALL campaigns for any number of campaigns in the DB.
         *
         * For any number of campaigns owned by any mix of DMs, GET /api/campaigns must return ALL of them.
         * The count in the response must equal campaignRepository.findAll().size.
         *
         * Validates: Requirement 3.1
         */
        "Preservation 2a - GET /api/campaigns returns ALL campaigns for any number of campaigns in the DB" {
            checkAll(iterations = 20, Arb.int(1, 3), Arb.int(1, 3)) { numDms, campaignsPerDm ->
                cleanAll()
                val dms = (1..numDms).map { dmIndex ->
                    userRepository.save(User(name = "DM_${dmIndex}_${UUID.randomUUID()}", email = "dm_${dmIndex}_${UUID.randomUUID()}@test.com", passwordHash = "hash"))
                }
                dms.forEach { dm ->
                    repeat(campaignsPerDm) { i ->
                        campaignRepository.save(Campaign(name = "Campaign_${i}_${UUID.randomUUID()}", description = "desc", owner = dm, maxPlayers = 4, joinPrice = BigDecimal("0.00"), visibility = CampaignVisibility.PUBLIC))
                    }
                }
                val expectedCount = campaignRepository.findAll().size
                val token = jwtService.generateToken(dms.first().id!!, dms.first().email)
                val result = mockMvc.perform(get("/api/campaigns").header("Authorization", "Bearer $token")).andExpect(status().isOk).andReturn()
                val campaigns: List<Map<String, Any>> = mapper.readValue(result.response.contentAsString)
                assert(campaigns.size == expectedCount) {
                    "Preservation violated: GET /api/campaigns returned ${campaigns.size} but expected $expectedCount"
                }
            }
        }

        /**
         * Preservation 2b: POST /api/campaigns persists campaign with correct owner.id for any valid CampaignDto.
         *
         * For any valid CampaignDto, POST /api/campaigns must return HTTP 200 and the persisted campaign
         * must have owner.id equal to the ownerId in the request body.
         *
         * Validates: Requirement 3.2
         */
        "Preservation 2b - POST /api/campaigns persists campaign with correct owner.id for any valid CampaignDto" {
            val validName = Arb.string(1, 50, Codepoint.alphanumeric()).filter { it.isNotBlank() }
            val validDescription = Arb.string(0, 100, Codepoint.alphanumeric())
            val validMaxPlayers = Arb.int(1, 20)
            val validJoinPrice = Arb.double(0.0, 999.99).filter { it.isFinite() }.map { BigDecimal(it).setScale(2, RoundingMode.HALF_UP) }.filter { it >= BigDecimal.ZERO }
            val validVisibility = Arb.enum<CampaignVisibility>()
            val validDto = Arb.bind(validName, validDescription, validMaxPlayers, validJoinPrice, validVisibility) { n, d, mp, jp, vis -> CampaignDtoData(n, d, mp, jp, vis) }
            checkAll(iterations = 20, validDto) { dto ->
                cleanAll()
                val owner = userRepository.save(User(name = "DM_${UUID.randomUUID()}", email = "dm_${UUID.randomUUID()}@test.com", passwordHash = "hash"))
                val token = jwtService.generateToken(owner.id!!, owner.email)
                val body = campaignJson(dto.name, dto.description, owner.id!!, dto.maxPlayers, dto.joinPrice.toPlainString(), dto.visibility.name)
                val result = mockMvc.perform(post("/api/campaigns").header("Authorization", "Bearer $token").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk).andReturn()
                val saved = campaignRepository.findAll().firstOrNull()
                assert(saved != null) { "POST /api/campaigns did not persist any campaign" }
                assert(saved!!.owner.id == owner.id) { "Persisted campaign owner.id=${saved.owner.id} but expected ${owner.id}" }
                val responseMap: Map<String, Any> = mapper.readValue(result.response.contentAsString)
                val ownerMap = responseMap["owner"] as? Map<*, *>
                assert(ownerMap?.get("id")?.toString() == owner.id.toString()) { "Response owner.id=${ownerMap?.get("id")} but expected ${owner.id}" }
            }
        }

        /**
         * Preservation 2c: GET /api/users/me/player-campaigns returns HTTP 200 for any authenticated player.
         *
         * Observed behavior on unfixed code: the endpoint returns HTTP 200 with a list (may be empty).
         * The DM filter fix must not change this endpoint's HTTP status or response structure.
         *
         * Note: The JWT subject is the user UUID (not email), but the repository query filters by email.
         * This means the endpoint returns an empty list on the current codebase for any user.
         * This pre-existing behavior is preserved by the fix (the fix does not touch this endpoint).
         *
         * Validates: Requirement 3.4
         */
        "Preservation 2c - GET /api/users/me/player-campaigns returns HTTP 200 for any authenticated player" {
            // Observed behavior: the endpoint returns HTTP 200 with a JSON array for any authenticated user.
            // The DM filter fix must not change this endpoint's HTTP status or response structure.
            val player = userRepository.save(User(name = "Player_test", email = "player_test@test.com", passwordHash = "hash"))
            val playerToken = jwtService.generateToken(player.id!!, player.email)
            val result = mockMvc.perform(get("/api/users/me/player-campaigns").header("Authorization", "Bearer $playerToken")).andExpect(status().isOk).andReturn()
            val playerCampaigns: List<Map<String, Any>> = mapper.readValue(result.response.contentAsString)
            assert(playerCampaigns is List<*>) { "GET /api/users/me/player-campaigns must return a JSON array" }
        }

        /**
         * Preservation 2d: GET /api/campaigns/my without a JWT returns HTTP 401.
         *
         * Spring Security rejects all /api/... requests without a valid JWT with HTTP 401.
         * This behavior must be preserved after the fix.
         *
         * Validates: Requirement 3.5
         */
        "Preservation 2d - GET /api/campaigns/my without a JWT returns HTTP 401" {
            mockMvc.perform(get("/api/campaigns/my")).andExpect(status().isUnauthorized)
        }
    }
}
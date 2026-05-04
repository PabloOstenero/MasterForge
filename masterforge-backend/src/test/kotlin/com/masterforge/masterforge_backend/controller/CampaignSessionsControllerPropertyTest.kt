package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.collections.shouldBeSortedWith
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.long
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
import java.sql.Timestamp
import java.util.UUID

/**
 * Feature: campaign-detail-page
 *
 * Property-based tests for GET /api/campaigns/{id}/sessions endpoint.
 *
 * Property 1: Sessions belong to the requested campaign
 * Property 2: Sessions are ordered ascending by date
 * Property 3: SessionSummaryDto contains all required fields
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignSessionsControllerPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var jwtService: JwtService

    private val objectMapper = jacksonObjectMapper()

    init {

        // ── Property 1: Sessions belong to the requested campaign ─────────────

        /**
         * Feature: campaign-detail-page
         * Property 1: Sessions belong to the requested campaign
         * Validates: Requirements 1.1
         *
         * For any campaign ID and any set of sessions in the database (some belonging to the
         * requested campaign, some to others), the endpoint SHALL return only sessions whose
         * campaign_id matches the requested campaign UUID.
         */
        "Property 1: all returned sessions belong to the requested campaign" {
            checkAll(100, Arb.int(1, 5), Arb.int(0, 5)) {
                numTargetSessions, numOtherSessions ->

                cleanup()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                // Sessions for the target campaign
                repeat(numTargetSessions) { i ->
                    saveSession(targetCampaign, offsetMillis = i.toLong() * 60_000)
                }
                // Sessions for a different campaign — must NOT appear in the response
                repeat(numOtherSessions) { i ->
                    saveSession(otherCampaign, offsetMillis = i.toLong() * 60_000)
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, targetCampaign.id!!)

                // Property 1: every returned session must belong to the target campaign
                response.size shouldBe numTargetSessions
                // All returned IDs must be sessions we saved for targetCampaign
                val targetSessionIds = sessionRepository
                    .findByCampaignIdOrderByScheduledDateAsc(targetCampaign.id!!)
                    .map { it.id!!.toString() }
                    .toSet()
                response.forEach { dto ->
                    targetSessionIds.contains(dto.id).shouldBeTrue()
                }
            }
        }

        "Property 1: sessions from other campaigns never appear in the response" {
            checkAll(100, Arb.int(0, 4), Arb.int(1, 4)) {
                numTargetSessions, numOtherSessions ->

                cleanup()
                val owner = saveUser("DM")
                val targetCampaign = saveCampaign(owner)
                val otherCampaign = saveCampaign(owner)

                repeat(numTargetSessions) { i ->
                    saveSession(targetCampaign, offsetMillis = i.toLong() * 60_000)
                }
                repeat(numOtherSessions) { i ->
                    saveSession(otherCampaign, offsetMillis = i.toLong() * 60_000)
                }

                val otherSessionIds = sessionRepository
                    .findByCampaignIdOrderByScheduledDateAsc(otherCampaign.id!!)
                    .map { it.id!!.toString() }
                    .toSet()

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, targetCampaign.id!!)

                // No returned session ID should belong to the other campaign
                response.forEach { dto ->
                    otherSessionIds.contains(dto.id) shouldBe false
                }
            }
        }

        // ── Property 2: Sessions are ordered ascending by date ────────────────

        /**
         * Feature: campaign-detail-page
         * Property 2: Sessions are ordered ascending by date
         * Validates: Requirements 1.3
         *
         * For any campaign with 2–20 randomly ordered sessions, the endpoint SHALL return
         * them in ascending scheduledDate order: for every adjacent pair (i, i+1),
         * sessions[i].scheduledDate <= sessions[i+1].scheduledDate.
         */
        "Property 2: returned sessions are ordered ascending by scheduledDate" {
            checkAll(100, Arb.int(2, 20)) { numSessions ->
                cleanup()
                val owner = saveUser("DM")
                val campaign = saveCampaign(owner)

                // Insert sessions with shuffled timestamps to ensure ordering is done by the DB/repo
                val offsets = (0 until numSessions).map { it.toLong() * 3_600_000L }.shuffled()
                offsets.forEach { offset ->
                    saveSession(campaign, offsetMillis = offset)
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, campaign.id!!)

                response.size shouldBe numSessions

                // Property 2: adjacent pairs must be in non-decreasing order
                response shouldBeSortedWith Comparator { a, b ->
                    a.scheduledDate.compareTo(b.scheduledDate)
                }
            }
        }

        "Property 2: single-session campaign returns a list of size 1 (trivially ordered)" {
            checkAll(100, Arb.long(0L, 1_000_000_000L)) { offsetMillis ->
                cleanup()
                val owner = saveUser("DM")
                val campaign = saveCampaign(owner)
                saveSession(campaign, offsetMillis = offsetMillis)

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, campaign.id!!)

                response.size shouldBe 1
            }
        }

        // ── Property 3: SessionSummaryDto contains all required fields ─────────

        /**
         * Feature: campaign-detail-page
         * Property 3: SessionSummaryDto contains all required fields
         * Validates: Requirements 1.5
         *
         * For any session entity, the SessionSummaryDto produced from it SHALL contain
         * a non-null id (UUID string), a non-null scheduledDate (ISO-8601 string), and
         * a non-null price (decimal). No required field shall be absent or null.
         */
        "Property 3: every SessionSummaryDto has non-null id, scheduledDate, and price" {
            checkAll(100, Arb.int(1, 10)) { numSessions ->
                cleanup()
                val owner = saveUser("DM")
                val campaign = saveCampaign(owner)

                repeat(numSessions) { i ->
                    saveSession(campaign, offsetMillis = i.toLong() * 60_000, price = BigDecimal("${i + 1}.00"))
                }

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, campaign.id!!)

                response.size shouldBe numSessions
                response.forEach { dto ->
                    // id must be a valid UUID string
                    dto.id.shouldNotBeNull()
                    UUID.fromString(dto.id).shouldNotBeNull()

                    // scheduledDate must be a non-null ISO-8601 string
                    dto.scheduledDate.shouldNotBeNull()
                    dto.scheduledDate.isNotBlank().shouldBeTrue()
                    // ISO-8601 strings contain 'T' as date/time separator
                    dto.scheduledDate.contains('T').shouldBeTrue()

                    // price must be non-null
                    dto.price.shouldNotBeNull()
                }
            }
        }

        "Property 3: scheduledDate is formatted as ISO-8601 with UTC offset" {
            checkAll(100, Arb.long(0L, 1_000_000_000_000L)) { epochMillis ->
                cleanup()
                val owner = saveUser("DM")
                val campaign = saveCampaign(owner)
                saveSession(campaign, offsetMillis = epochMillis)

                val token = jwtService.generateToken(owner.id!!, owner.email)
                val response = performGetSessions(token, campaign.id!!)

                response.size shouldBe 1
                val dto = response.first()

                // Must parse without throwing — validates ISO-8601 format
                val parsed = java.time.OffsetDateTime.parse(dto.scheduledDate)
                parsed.shouldNotBeNull()
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        sessionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
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
            joinPrice = BigDecimal.ZERO,
            visibility = CampaignVisibility.PRIVATE
        )
    )

    private fun saveSession(
        campaign: Campaign,
        offsetMillis: Long = 0L,
        price: BigDecimal = BigDecimal("10.00")
    ): Session {
        // Base epoch + offset so each session has a distinct, deterministic timestamp
        val baseEpoch = 1_700_000_000_000L
        return sessionRepository.save(
            Session(
                name = "Test Session",
                scheduledDate = Timestamp(baseEpoch + offsetMillis),
                price = price,
                campaign = campaign
            )
        )
    }

    private fun performGetSessions(token: String, campaignId: UUID): List<SessionSummaryResponse> {
        val result = mockMvc.perform(
            get("/api/campaigns/$campaignId/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andReturn()

        return objectMapper.readValue(result.response.contentAsString)
    }

    /** Minimal response shape mirroring SessionSummaryDto for assertions. */
    data class SessionSummaryResponse(
        val id: String,
        val name: String,
        val scheduledDate: String,
        val price: java.math.BigDecimal
    )
}

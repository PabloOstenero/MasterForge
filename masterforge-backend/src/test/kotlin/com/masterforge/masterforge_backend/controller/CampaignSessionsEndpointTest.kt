package com.masterforge.masterforge_backend.controller

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
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

/**
 * Unit tests for GET /api/campaigns/{id}/sessions endpoint.
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignSessionsEndpointTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var jwtService: JwtService

    private lateinit var owner: User
    private lateinit var token: String

    @BeforeEach
    fun setup() {
        sessionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()

        owner = userRepository.save(
            User(
                name = "DM_${UUID.randomUUID()}",
                email = "dm_${UUID.randomUUID()}@test.com",
                passwordHash = "hash"
            )
        )
        token = jwtService.generateToken(owner.id!!, owner.email)
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    /**
     * Requirement 1.1: valid campaign UUID with sessions → 200 with correct DTO mapping.
     */
    @Test
    fun `GET sessions for existing campaign returns 200 with mapped DTOs`() {
        val campaign = saveCampaign()
        val session = saveSession(campaign, epochMillis = 1_700_000_000_000L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(session.id!!.toString()))
    }

    /**
     * Requirement 1.5: scheduledDate must be formatted as ISO-8601 from java.sql.Timestamp.
     *
     * Timestamp(0) = 1970-01-01T00:00:00Z in UTC.
     */
    @Test
    fun `GET sessions returns scheduledDate formatted as ISO-8601`() {
        val campaign = saveCampaign()
        // epoch 0 → 1970-01-01T00:00:00Z
        saveSession(campaign, epochMillis = 0L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].scheduledDate").value("1970-01-01T00:00:00Z"))
    }

    /**
     * Requirement 1.1: multiple sessions are all returned.
     */
    @Test
    fun `GET sessions returns all sessions for the campaign`() {
        val campaign = saveCampaign()
        saveSession(campaign, epochMillis = 1_000_000_000L)
        saveSession(campaign, epochMillis = 2_000_000_000L)
        saveSession(campaign, epochMillis = 3_000_000_000L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(3))
    }

    // ── Not found ─────────────────────────────────────────────────────────────

    /**
     * Requirement 1.2: campaign UUID that does not exist → 404.
     */
    @Test
    fun `GET sessions for non-existent campaign returns 404`() {
        val nonExistentId = UUID.randomUUID()

        mockMvc.perform(
            get("/api/campaigns/$nonExistentId/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isNotFound)
    }

    // ── Empty list ────────────────────────────────────────────────────────────

    /**
     * Requirement 1.4: campaign exists but has no sessions → 200 with empty array.
     */
    @Test
    fun `GET sessions for campaign with no sessions returns 200 with empty list`() {
        val campaign = saveCampaign()

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(0))
    }

    // ── DTO field completeness ────────────────────────────────────────────────

    /**
     * Requirement 1.5: SessionSummaryDto must include id, scheduledDate, and price.
     */
    @Test
    fun `GET sessions response includes id and scheduledDate fields`() {
        val campaign = saveCampaign()
        saveSession(campaign, epochMillis = 1_700_000_000_000L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].scheduledDate").exists())
    }

    /**
     * Requirement 1.1: sessions from other campaigns must not appear.
     */
    @Test
    fun `GET sessions does not return sessions from other campaigns`() {
        val campaign = saveCampaign()
        val otherCampaign = saveCampaign()

        saveSession(campaign, epochMillis = 1_000_000_000L)
        saveSession(otherCampaign, epochMillis = 2_000_000_000L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
    }

    // ── Ordering ──────────────────────────────────────────────────────────────

    /**
     * Requirement 1.3: sessions are returned in ascending scheduledDate order.
     */
    @Test
    fun `GET sessions returns sessions ordered ascending by scheduledDate`() {
        val campaign = saveCampaign()
        // Insert in reverse order to verify the endpoint sorts them
        saveSession(campaign, epochMillis = 3_000_000_000L)
        saveSession(campaign, epochMillis = 1_000_000_000L)
        saveSession(campaign, epochMillis = 2_000_000_000L)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/sessions")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(3))
            // First session should have the earliest date (epoch 1_000_000_000L)
            .andExpect(jsonPath("$[0].scheduledDate").value("1970-01-12T13:46:40Z"))
            .andExpect(jsonPath("$[1].scheduledDate").value("1970-01-24T03:33:20Z"))
            .andExpect(jsonPath("$[2].scheduledDate").value("1970-02-04T17:20:00Z"))
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun saveCampaign(): Campaign = campaignRepository.save(
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
        epochMillis: Long
    ): Session = sessionRepository.save(
        Session(
            name = "Test Session",
            scheduledDate = Timestamp(epochMillis),
            campaign = campaign
        )
    )
}

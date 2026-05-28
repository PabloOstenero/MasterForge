package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Unit/example tests for CampaignController — createCampaign and updateCampaign validation.
 *
 * Validates: Requirements 2.4, 4.4, 5.4, 5.6, 7.2, 7.4, 7.5
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignControllerTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var jwtService: JwtService

    // ── shared state ─────────────────────────────────────────────────────────

    private lateinit var owner: User
    private lateinit var token: String

    // Kotest StringSpec runs each "string" { } block as a test.
    // We use beforeTest to set up a fresh owner + token for every test.
    init {
        beforeTest {
            campaignRepository.deleteAll()
            userRepository.deleteAll()
            owner = userRepository.save(
                User(
                    name = "DM_${UUID.randomUUID()}",
                    email = "dm_${UUID.randomUUID()}@test.com",
                    passwordHash = "hash",
                    subscriptionTier = "PRO",
                    subscriptionExpiresAt = java.time.LocalDateTime.now().plusYears(1)
                )
            )
            token = jwtService.generateToken(owner.id!!, owner.email)
        }

        // ── createCampaign ────────────────────────────────────────────────────

        /**
         * Requirement 7.2, 7.4: valid payload returns HTTP 200 and the saved entity.
         */
        "createCampaign with valid payload returns 200 and the saved entity" {
            val body = validPayload(owner.id!!)

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.name").value("Test Campaign"))
                .andExpect(jsonPath("$.maxPlayers").value(4))
                .andExpect(jsonPath("$.joinPrice").value(10.00))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
        }

        /**
         * Requirement 2.4: blank name returns HTTP 400.
         */
        "createCampaign with blank name returns 400" {
            val body = campaignJson(
                name = "   ",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "0.00",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        /**
         * Requirement 4.4: maxPlayers = 0 returns HTTP 400.
         */
        "createCampaign with maxPlayers = 0 returns 400" {
            val body = campaignJson(
                name = "Test Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 0,
                joinPrice = "0.00",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        /**
         * Requirement 5.4: joinPrice = -0.01 returns HTTP 400.
         */
        "createCampaign with joinPrice = -0.01 returns 400" {
            val body = campaignJson(
                name = "Test Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "-0.01",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        /**
         * Requirement 7.5: visibility = "INVALID" returns HTTP 400.
         */
        "createCampaign with visibility = INVALID returns 400" {
            val body = campaignJson(
                name = "Test Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "0.00",
                visibility = "INVALID"
            )

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        /**
         * Requirement 5.6: joinPrice = 0 is stored as 0.00 in the entity.
         */
        "createCampaign with joinPrice = 0 stores 0.00 in the entity" {
            val body = campaignJson(
                name = "Free Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "0",
                visibility = "PRIVATE"
            )

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.joinPrice").value(0.00))

            // Also verify the persisted entity has scale 2 (0.00)
            val saved = campaignRepository.findAll().first()
            assert(saved.joinPrice.compareTo(BigDecimal.ZERO) == 0) {
                "Expected joinPrice to be 0.00 but was ${saved.joinPrice}"
            }
            assert(saved.joinPrice.scale() == 2) {
                "Expected joinPrice scale to be 2 but was ${saved.joinPrice.scale()}"
            }
        }

        // ── updateCampaign ────────────────────────────────────────────────────

        /**
         * Requirement 2.4, 4.4, 5.4, 7.5: updateCampaign applies the same validation rules.
         */
        "updateCampaign with blank name returns 400" {
            val campaignId = createCampaignDirectly()

            val body = campaignJson(
                name = "   ",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "0.00",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                put("/api/campaigns/$campaignId")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        "updateCampaign with maxPlayers < 1 returns 400" {
            val campaignId = createCampaignDirectly()

            val body = campaignJson(
                name = "Updated Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = -1,
                joinPrice = "0.00",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                put("/api/campaigns/$campaignId")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        "updateCampaign with negative joinPrice returns 400" {
            val campaignId = createCampaignDirectly()

            val body = campaignJson(
                name = "Updated Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "-5.00",
                visibility = "PUBLIC"
            )

            mockMvc.perform(
                put("/api/campaigns/$campaignId")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }

        "updateCampaign with invalid visibility returns 400" {
            val campaignId = createCampaignDirectly()

            val body = campaignJson(
                name = "Updated Campaign",
                description = "desc",
                ownerId = owner.id!!,
                maxPlayers = 4,
                joinPrice = "0.00",
                visibility = "UNKNOWN"
            )

            mockMvc.perform(
                put("/api/campaigns/$campaignId")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
            )
                .andExpect(status().isBadRequest)
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Builds a valid JSON payload for campaign creation. */
    private fun validPayload(ownerId: UUID): String = campaignJson(
        name = "Test Campaign",
        description = "A test campaign",
        ownerId = ownerId,
        maxPlayers = 4,
        joinPrice = "10.00",
        visibility = "PUBLIC"
    )

    /** Builds a campaign JSON body with the given field values. */
    private fun campaignJson(
        name: String,
        description: String,
        ownerId: UUID,
        maxPlayers: Int,
        joinPrice: String,
        visibility: String
    ): String = """
        {
          "name": "$name",
          "description": "$description",
          "ownerId": "$ownerId",
          "maxPlayers": $maxPlayers,
          "joinPrice": $joinPrice,
          "visibility": "$visibility"
        }
    """.trimIndent()

    /**
     * Saves a campaign directly via the repository so updateCampaign tests
     * have an existing entity to update.
     */
    private fun createCampaignDirectly(): UUID {
        val campaign = campaignRepository.save(
            com.masterforge.masterforge_backend.model.entity.Campaign(
                name = "Existing Campaign",
                description = "desc",
                owner = owner,
                maxPlayers = 4,
                joinPrice = BigDecimal.ZERO,
                visibility = CampaignVisibility.PRIVATE
            )
        )
        return campaign.id!!
    }
}

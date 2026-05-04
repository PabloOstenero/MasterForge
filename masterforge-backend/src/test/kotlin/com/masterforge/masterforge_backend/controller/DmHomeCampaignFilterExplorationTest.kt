package com.masterforge.masterforge_backend.controller

/**
 * Bug Condition Exploration Test — DM Home Campaign Filter
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the bug: GET /api/campaigns returns campaigns owned by other DMs.
 *
 * Counterexample documented after first run:
 *   BUG CONFIRMED: GET /api/campaigns returned 1 campaign(s) not owned by DM A.
 *   Counterexample: campaigns with owner IDs [bd3ff611-6beb-4705-8c6d-00c4c703b30e]
 *   were returned when authenticated as DM A (id=f3cb37d4-efe7-431e-b766-bab591453260).
 *   The response body contained both DM A's campaign AND DM B's campaign, proving that
 *   campaignRepository.findAll() returns all campaigns with no ownership filter.
 *
 * Root cause: CampaignController.getAllCampaigns() calls campaignRepository.findAll()
 * with no ownership filter, so every campaign in the database is returned regardless
 * of which DM is authenticated.
 *
 * Validates: Requirements 1.1, 1.2
 */

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
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
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DmHomeCampaignFilterExplorationTest : StringSpec() {

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

    private lateinit var dmA: User
    private lateinit var dmB: User
    private lateinit var tokenA: String

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

    init {
        beforeTest {
            cleanAll()

            // Seed DM A
            dmA = userRepository.save(
                User(
                    name = "DM_A_${UUID.randomUUID()}",
                    email = "dm_a_${UUID.randomUUID()}@test.com",
                    passwordHash = "hash"
                )
            )

            // Seed DM B
            dmB = userRepository.save(
                User(
                    name = "DM_B_${UUID.randomUUID()}",
                    email = "dm_b_${UUID.randomUUID()}@test.com",
                    passwordHash = "hash"
                )
            )

            // Create one campaign owned by DM A
            campaignRepository.save(
                Campaign(
                    name = "DM A Campaign",
                    description = "Owned by DM A",
                    owner = dmA,
                    maxPlayers = 4,
                    joinPrice = BigDecimal("0.00"),
                    visibility = CampaignVisibility.PUBLIC
                )
            )

            // Create one campaign owned by DM B
            campaignRepository.save(
                Campaign(
                    name = "DM B Campaign",
                    description = "Owned by DM B",
                    owner = dmB,
                    maxPlayers = 4,
                    joinPrice = BigDecimal("0.00"),
                    visibility = CampaignVisibility.PUBLIC
                )
            )

            // Authenticate as DM A
            tokenA = jwtService.generateToken(dmA.id!!, dmA.email)
        }

        /**
         * Bug Condition: GET /api/campaigns/my authenticated as DM A must return ONLY DM A's campaigns.
         *
         * On unfixed code this FAILED because findAll() returned all campaigns including DM B's.
         * After the fix, GET /api/campaigns/my calls findByOwnerId(dmAId) and returns only DM A's campaigns.
         *
         * Property: ALL campaign IN result: campaign.owner.id = dmAId
         *
         * Validates: Requirements 1.1, 1.2, 2.1, 2.2
         */
        "GET /api/campaigns/my authenticated as DM A returns ONLY campaigns owned by DM A" {
            val dmAId = dmA.id!!

            val result = mockMvc.perform(
                get("/api/campaigns/my")
                    .header("Authorization", "Bearer $tokenA")
            ).andReturn()

            val body = result.response.contentAsString
            val mapper = jacksonObjectMapper()
            val campaigns: List<Map<String, Any>> = mapper.readValue(body)

            // Bug condition: response must contain ONLY DM A's campaigns
            val foreignCampaigns = campaigns.filter { campaign ->
                val ownerMap = campaign["owner"] as? Map<*, *>
                ownerMap?.get("id")?.toString() != dmAId.toString()
            }

            assert(foreignCampaigns.isEmpty()) {
                "BUG NOT FIXED: GET /api/campaigns/my returned ${foreignCampaigns.size} campaign(s) not owned by DM A. " +
                "Counterexample: campaigns with owner IDs ${foreignCampaigns.map { (it["owner"] as Map<*, *>)["id"] }} " +
                "were returned when authenticated as DM A (id=$dmAId)"
            }
        }

        /**
         * Empty state: GET /api/campaigns/my for a DM with zero campaigns returns HTTP 200 with empty array.
         *
         * Validates: Requirements 2.2, 3.3
         */
        "GET /api/campaigns/my for a DM with zero campaigns returns HTTP 200 with empty array" {
            // Authenticate as DM B who owns no campaigns (DM A owns the only campaign)
            campaignRepository.deleteAll()
            val tokenB = jwtService.generateToken(dmB.id!!, dmB.email)

            val result = mockMvc.perform(
                get("/api/campaigns/my")
                    .header("Authorization", "Bearer $tokenB")
            ).andReturn()

            assert(result.response.status == 200) {
                "Expected HTTP 200 for DM with zero campaigns but got ${result.response.status}"
            }

            val body = result.response.contentAsString
            val mapper = jacksonObjectMapper()
            val campaigns: List<Map<String, Any>> = mapper.readValue(body)

            assert(campaigns.isEmpty()) {
                "Expected empty array for DM with zero campaigns but got ${campaigns.size} campaigns"
            }
        }
    }
}

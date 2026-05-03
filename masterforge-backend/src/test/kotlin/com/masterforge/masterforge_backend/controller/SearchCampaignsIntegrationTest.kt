package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.booleans.shouldBeFalse
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.cache.CacheManager
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

private val objectMapper = ObjectMapper()

/**
 * End-to-end integration tests for the Search Campaigns feature.
 *
 * Tests complete workflows including search, join (free and paid),
 * error handling, and availability checks.
 *
 * Validates: All requirements for the search-campaigns feature.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SearchCampaignsIntegrationTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var enrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var paymentTransactionRepository: PaymentTransactionRepository
    @Autowired lateinit var jwtService: JwtService
    @Autowired lateinit var cacheManager: CacheManager

    init {

        // ── Test 1: Complete free campaign search and join workflow ──────────

        "complete free campaign search and join workflow" {
            cleanup()
            val owner = saveUser()
            val viewer = saveUser()
            val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)
            val campaign = saveCampaign(owner = owner)

            // Step 1: search and verify campaign appears
            val searchResponse = mockMvc.perform(
                get("/api/campaigns/search")
                    .header("Authorization", "Bearer $viewerToken")
            )
                .andExpect(status().isOk)
                .andReturn()

            val searchBody = objectMapper.readTree(searchResponse.response.contentAsString)
            val campaigns = searchBody.get("campaigns")
            campaigns.size() shouldBe 1
            campaigns[0].get("id").asText() shouldBe campaign.id.toString()

            // Step 2: join the campaign
            mockMvc.perform(
                post("/api/campaigns/${campaign.id}/join")
                    .header("Authorization", "Bearer $viewerToken")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.success").value(true))

            // Step 3: verify enrollment record exists
            val enrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaign.id!!, viewer.id!!)
            enrolled.shouldBeTrue()

            // Step 4: search again and verify currentPlayers=1
            val searchResponse2 = mockMvc.perform(
                get("/api/campaigns/search")
                    .header("Authorization", "Bearer $viewerToken")
            )
                .andExpect(status().isOk)
                .andReturn()

            val searchBody2 = objectMapper.readTree(searchResponse2.response.contentAsString)
            val campaigns2 = searchBody2.get("campaigns")
            campaigns2[0].get("currentPlayers").asInt() shouldBe 1
        }

        // ── Test 2: Complete paid campaign search and join workflow ──────────

        "complete paid campaign search and join workflow" {
            cleanup()
            val owner = saveUser()
            val player = saveUser()
            val playerToken = jwtService.generateToken(player.id!!, player.email)
            val campaign = saveCampaign(owner = owner, joinPrice = BigDecimal("9.99"))

            // Step 1: search and verify joinPrice in response
            val searchResponse = mockMvc.perform(
                get("/api/campaigns/search")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isOk)
                .andReturn()

            val searchBody = objectMapper.readTree(searchResponse.response.contentAsString)
            val campaigns = searchBody.get("campaigns")
            campaigns.size() shouldBe 1
            val joinPrice = BigDecimal(campaigns[0].get("joinPrice").asText())
            joinPrice.compareTo(BigDecimal("9.99")) shouldBe 0

            // Step 2: join with paid enrollment (SUCCESS scenario)
            // Note: userId is required by the DTO but the controller overrides it from the JWT token
            val campaignId = campaign.id!!
            val placeholderUserId = player.id!!
            val paymentBody = """{"campaignId":"$campaignId","userId":"$placeholderUserId","amount":9.99,"mockCardLastFour":"1234","simulationScenario":"SUCCESS"}"""
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join-paid")
                    .header("Authorization", "Bearer $playerToken")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(paymentBody)
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.success").value(true))

            // Step 3: verify enrollment record exists
            val enrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaignId, player.id!!)
            enrolled.shouldBeTrue()

            // Step 4: verify payment transaction record with COMPLETED status
            val transactions = paymentTransactionRepository.findByCampaignId(campaignId)
            transactions.size shouldBe 1
            transactions[0].status.name shouldBe "COMPLETED"
        }

        // ── Test 3: Payment failure does not create enrollment but records transaction ──

        "payment failure does not create enrollment but records transaction" {
            cleanup()
            val owner = saveUser()
            val player = saveUser()
            val playerToken = jwtService.generateToken(player.id!!, player.email)
            val campaign = saveCampaign(owner = owner, joinPrice = BigDecimal("9.99"))
            val campaignId = campaign.id!!

            // Note: userId is required by the DTO but the controller overrides it from the JWT token
            val placeholderUserId = player.id!!
            val paymentBody = """{"campaignId":"$campaignId","userId":"$placeholderUserId","amount":9.99,"mockCardLastFour":"1234","simulationScenario":"CARD_DECLINED"}"""
            val failResponse = mockMvc.perform(
                post("/api/campaigns/$campaignId/join-paid")
                    .header("Authorization", "Bearer $playerToken")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(paymentBody)
            )
                .andExpect(status().is4xxClientError)
                .andReturn()

            // Verify the response indicates failure
            val failBody = objectMapper.readTree(failResponse.response.contentAsString)
            failBody.get("success").asBoolean() shouldBe false

            // Verify NO enrollment record was created
            val enrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaignId, player.id!!)
            enrolled.shouldBeFalse()

            // Verify payment transaction record with FAILED status exists (audit)
            val transactions = paymentTransactionRepository.findByCampaignId(campaignId)
            transactions.size shouldBe 1
            transactions[0].status.name shouldBe "FAILED"
        }

        // ── Test 4: Duplicate enrollment returns conflict ────────────────────

        "duplicate enrollment returns conflict" {
            cleanup()
            val owner = saveUser()
            val player = saveUser()
            val playerToken = jwtService.generateToken(player.id!!, player.email)
            val campaign = saveCampaign(owner = owner)
            val campaignId = campaign.id!!

            // First join — should succeed
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isOk)

            // Second join — should return 409 Conflict
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isConflict)
        }

        // ── Test 5: Owner cannot join own campaign ───────────────────────────

        "owner cannot join own campaign" {
            cleanup()
            val owner = saveUser()
            val ownerToken = jwtService.generateToken(owner.id!!, owner.email)
            val campaign = saveCampaign(owner = owner)
            val campaignId = campaign.id!!

            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $ownerToken")
            )
                .andExpect(status().isConflict)
        }

        // ── Test 6: Campaign full prevents new enrollment ────────────────────

        "campaign full prevents new enrollment" {
            cleanup()
            val owner = saveUser()
            val player1 = saveUser()
            val player2 = saveUser()
            val player1Token = jwtService.generateToken(player1.id!!, player1.email)
            val player2Token = jwtService.generateToken(player2.id!!, player2.email)
            val campaign = saveCampaign(owner = owner, maxPlayers = 1)
            val campaignId = campaign.id!!

            // Player 1 joins — fills the campaign
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $player1Token")
            )
                .andExpect(status().isOk)

            // Player 2 tries to join — campaign is full
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $player2Token")
            )
                .andExpect(status().isConflict)
        }

        // ── Test 7: Search with text filter returns only matching campaigns ──

        "search with text filter returns only matching campaigns" {
            cleanup()
            val owner = saveUser()
            val viewer = saveUser()
            val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

            saveCampaign(owner = owner, name = "Dragon Quest Adventure")
            saveCampaign(owner = owner, name = "Goblin Dungeon Crawl")

            val searchResponse = mockMvc.perform(
                get("/api/campaigns/search")
                    .header("Authorization", "Bearer $viewerToken")
                    .param("searchText", "Dragon")
            )
                .andExpect(status().isOk)
                .andReturn()

            val body = objectMapper.readTree(searchResponse.response.contentAsString)
            val campaigns = body.get("campaigns")
            campaigns.size() shouldBe 1
            campaigns[0].get("name").asText() shouldBe "Dragon Quest Adventure"
        }

        // ── Test 8: Search with price filter returns only campaigns in range ─

        "search with price filter returns only campaigns in range" {
            cleanup()
            val owner = saveUser()
            val viewer = saveUser()
            val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

            saveCampaign(owner = owner, name = "Free Campaign", joinPrice = BigDecimal("0.00"))
            saveCampaign(owner = owner, name = "Cheap Campaign", joinPrice = BigDecimal("5.00"))
            saveCampaign(owner = owner, name = "Expensive Campaign", joinPrice = BigDecimal("15.00"))

            val searchResponse = mockMvc.perform(
                get("/api/campaigns/search")
                    .header("Authorization", "Bearer $viewerToken")
                    .param("maxPrice", "10")
            )
                .andExpect(status().isOk)
                .andReturn()

            val body = objectMapper.readTree(searchResponse.response.contentAsString)
            val campaigns = body.get("campaigns")
            campaigns.size() shouldBe 2
        }

        // ── Test 9: Unauthenticated request returns 401 or 403 ───────────────

        "unauthenticated request returns 401 or 403" {
            cleanup()
            val response = mockMvc.perform(
                get("/api/campaigns/search")
                // No Authorization header
            )
                .andReturn()

            val status = response.response.status
            (status == 401 || status == 403) shouldBe true
        }

        // ── Test 10: Availability endpoint reflects enrollment state ─────────

        "availability endpoint reflects enrollment state" {
            cleanup()
            val owner = saveUser()
            val player = saveUser()
            val playerToken = jwtService.generateToken(player.id!!, player.email)
            val campaign = saveCampaign(owner = owner, maxPlayers = 2)
            val campaignId = campaign.id!!

            // Before enrollment: hasAvailableSlots=true
            mockMvc.perform(
                get("/api/campaigns/$campaignId/availability")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.hasAvailableSlots").value(true))

            // Enroll player
            mockMvc.perform(
                post("/api/campaigns/$campaignId/join")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isOk)

            // After enrollment: currentPlayers=1
            mockMvc.perform(
                get("/api/campaigns/$campaignId/availability")
                    .header("Authorization", "Bearer $playerToken")
            )
                .andExpect(status().isOk)
                .andExpect(jsonPath("$.currentPlayers").value(1))
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun cleanup() {
        enrollmentRepository.deleteAll()
        paymentTransactionRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
        // Clear Spring cache to avoid stale data between tests
        cacheManager.cacheNames.forEach { cacheManager.getCache(it)?.clear() }
    }

    private fun saveUser(): User = userRepository.save(
        User(
            name = "User_${UUID.randomUUID()}",
            email = "user_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
    )

    private fun saveCampaign(
        owner: User,
        name: String = "Campaign_${UUID.randomUUID()}",
        joinPrice: BigDecimal = BigDecimal.ZERO,
        maxPlayers: Int = 4,
        visibility: CampaignVisibility = CampaignVisibility.PUBLIC
    ): Campaign = campaignRepository.save(
        Campaign(
            name = name,
            description = "A test campaign",
            owner = owner,
            maxPlayers = maxPlayers,
            joinPrice = joinPrice,
            visibility = visibility
        )
    )
}

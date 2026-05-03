package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.element
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.pair
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

// Standalone ObjectMapper instance — not autowired to avoid bean lookup issues in test context
private val mapper = ObjectMapper()

/**
 * Feature: search-campaigns
 *
 * Property 1: Public Campaign Visibility Filtering
 * Validates: Requirements 1.1, 1.5
 *
 * Property 7: Price Range Filtering
 * Validates: Requirements 3.1
 *
 * Property 8: Capacity Filtering
 * Validates: Requirements 3.2
 *
 * Tests are performed against the full Spring Boot application stack via MockMvc
 * to validate the complete request-response cycle including security, controller,
 * service, and repository layers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignSearchControllerPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var enrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var paymentTransactionRepository: PaymentTransactionRepository
    @Autowired lateinit var jwtService: JwtService

    init {

        /**
         * Feature: search-campaigns, Property 1: Public Campaign Visibility Filtering
         * Validates: Requirements 1.1, 1.5
         *
         * For any set of campaigns with mixed visibility levels, the Campaign_Discovery_System
         * should only return campaigns with PUBLIC visibility to non-owner users.
         *
         * Strategy: create campaigns with each visibility type, call GET /api/campaigns/search,
         * and assert that only PUBLIC campaigns appear in the response.
         */
        "Property 1: GET /api/campaigns/search returns only PUBLIC campaigns to non-owner users" {
            // Sample from a fixed set of counts to keep tests fast and deterministic
            val publicCounts = listOf(1, 2, 3, 4, 5)
            val nonPublicCounts = listOf(1, 2, 3)

            checkAll(
                100,
                Arb.element(publicCounts),
                Arb.element(nonPublicCounts)
            ) { numPublic, numNonPublic ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Create PUBLIC campaigns — must appear in results
                repeat(numPublic) { i ->
                    saveCampaign(
                        owner = owner,
                        name = "Public Campaign $i ${UUID.randomUUID()}",
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                // Create PRIVATE campaigns — must NOT appear in results
                repeat(numNonPublic) {
                    saveCampaign(
                        owner = owner,
                        name = "Private Campaign ${UUID.randomUUID()}",
                        visibility = CampaignVisibility.PRIVATE
                    )
                }

                val response = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = mapper.readTree(response.response.contentAsString)
                val campaigns = body.get("campaigns")

                // Property: total returned count equals the number of PUBLIC campaigns
                campaigns.size() shouldBe numPublic

                // Property: every returned campaign has PUBLIC visibility
                campaigns.forEach { campaign ->
                    campaign.get("visibility").asText() shouldBe "PUBLIC"
                }
            }
        }

        "Property 1 (edge case): no PUBLIC campaigns returns empty list" {
            checkAll(100, Arb.int(1, 5)) { numPrivate ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Only PRIVATE campaigns — none should appear
                repeat(numPrivate) {
                    saveCampaign(
                        owner = owner,
                        name = "Private Campaign ${UUID.randomUUID()}",
                        visibility = CampaignVisibility.PRIVATE
                    )
                }

                mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                )
                    .andExpect(status().isOk)
                    .andExpect(jsonPath("$.campaigns").isArray)
                    .andExpect(jsonPath("$.campaigns.length()").value(0))
            }
        }

        /**
         * Feature: search-campaigns, Property 7: Price Range Filtering
         * Validates: Requirements 3.1
         *
         * For any price range filter and campaign dataset, only campaigns with join prices
         * within the specified range should be returned.
         *
         * Strategy: create campaigns at known price points, apply a price range filter,
         * and assert that only campaigns within the range appear in the response.
         */
        "Property 7: GET /api/campaigns/search with price range returns only campaigns within range" {
            // Fixed price tiers to keep tests deterministic
            val priceTiers = listOf(
                BigDecimal("0.00"),
                BigDecimal("5.00"),
                BigDecimal("10.00"),
                BigDecimal("25.00"),
                BigDecimal("50.00"),
                BigDecimal("100.00")
            )

            // Generate (minIndex, maxIndex) pairs where min <= max
            val rangePairs = Arb.pair(
                Arb.int(0, priceTiers.size - 2),
                Arb.int(1, priceTiers.size - 1)
            ).map { (a, b) -> if (a <= b) Pair(a, b) else Pair(b, a) }

            checkAll(100, rangePairs) { (minIdx, maxIdx) ->
                val minPrice = priceTiers[minIdx]
                val maxPrice = priceTiers[maxIdx]

                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Create one campaign at each price tier
                priceTiers.forEachIndexed { idx, price ->
                    saveCampaign(
                        owner = owner,
                        name = "Campaign Price $idx ${UUID.randomUUID()}",
                        joinPrice = price,
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                val response = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                        .param("minPrice", minPrice.toPlainString())
                        .param("maxPrice", maxPrice.toPlainString())
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = mapper.readTree(response.response.contentAsString)
                val campaigns = body.get("campaigns")

                // Property: every returned campaign has a price within [minPrice, maxPrice]
                campaigns.forEach { campaign ->
                    val price = BigDecimal(campaign.get("joinPrice").asText())
                    (price >= minPrice && price <= maxPrice) shouldBe true
                }

                // Property: no campaign outside the range is returned
                val expectedCount = priceTiers.count { it >= minPrice && it <= maxPrice }
                campaigns.size() shouldBe expectedCount
            }
        }

        "Property 7 (minPrice only): campaigns below minPrice are excluded" {
            val priceTiers = listOf(
                BigDecimal("0.00"),
                BigDecimal("5.00"),
                BigDecimal("15.00"),
                BigDecimal("30.00")
            )

            checkAll(100, Arb.element(priceTiers)) { minPrice ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                priceTiers.forEachIndexed { idx, price ->
                    saveCampaign(
                        owner = owner,
                        name = "Campaign $idx ${UUID.randomUUID()}",
                        joinPrice = price,
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                val response = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                        .param("minPrice", minPrice.toPlainString())
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = mapper.readTree(response.response.contentAsString)
                val campaigns = body.get("campaigns")

                // Property: every returned campaign has price >= minPrice
                campaigns.forEach { campaign ->
                    val price = BigDecimal(campaign.get("joinPrice").asText())
                    (price >= minPrice) shouldBe true
                }
            }
        }

        /**
         * Feature: search-campaigns, Property 8: Capacity Filtering
         * Validates: Requirements 3.2
         *
         * For any capacity filter and campaign dataset, only campaigns matching the
         * specified capacity criteria should be returned.
         *
         * Strategy: create campaigns with known maxPlayers values, apply minPlayers/maxPlayers
         * filters, and assert that only campaigns within the capacity range appear.
         */
        "Property 8: GET /api/campaigns/search with capacity filter returns only matching campaigns" {
            // Fixed capacity tiers: small (1-4), medium (5-6), large (7+)
            val capacityTiers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 10)

            // Generate (minPlayers, maxPlayers) pairs where min <= max
            val capacityRanges = Arb.pair(
                Arb.int(1, 8),
                Arb.int(2, 10)
            ).map { (a, b) -> if (a <= b) Pair(a, b) else Pair(b, a) }

            checkAll(100, capacityRanges) { (minPlayers, maxPlayers) ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Create one campaign at each capacity tier
                capacityTiers.forEachIndexed { idx, capacity ->
                    saveCampaign(
                        owner = owner,
                        name = "Campaign Capacity $idx ${UUID.randomUUID()}",
                        maxPlayers = capacity,
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                val response = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                        .param("minPlayers", minPlayers.toString())
                        .param("maxPlayers", maxPlayers.toString())
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = mapper.readTree(response.response.contentAsString)
                val campaigns = body.get("campaigns")

                // Property: every returned campaign has maxPlayers within [minPlayers, maxPlayers]
                campaigns.forEach { campaign ->
                    val capacity = campaign.get("maxPlayers").asInt()
                    (capacity >= minPlayers && capacity <= maxPlayers) shouldBe true
                }

                // Property: the count matches the expected number of campaigns in range
                val expectedCount = capacityTiers.count { it in minPlayers..maxPlayers }
                campaigns.size() shouldBe expectedCount
            }
        }

        "Property 8 (small group filter): minPlayers=1, maxPlayers=4 returns only small campaigns" {
            checkAll(100, Arb.int(1, 4)) { numSmall ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Small campaigns (1-4 players)
                repeat(numSmall) { i ->
                    saveCampaign(
                        owner = owner,
                        name = "Small Campaign $i ${UUID.randomUUID()}",
                        maxPlayers = (i % 4) + 1,
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                // Large campaigns (7+ players) — must NOT appear
                repeat(2) { i ->
                    saveCampaign(
                        owner = owner,
                        name = "Large Campaign $i ${UUID.randomUUID()}",
                        maxPlayers = 7 + i,
                        visibility = CampaignVisibility.PUBLIC
                    )
                }

                val response = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                        .param("minPlayers", "1")
                        .param("maxPlayers", "4")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = mapper.readTree(response.response.contentAsString)
                val campaigns = body.get("campaigns")

                // Property: only small campaigns (1-4 players) are returned
                campaigns.size() shouldBe numSmall
                campaigns.forEach { campaign ->
                    val capacity = campaign.get("maxPlayers").asInt()
                    (capacity in 1..4) shouldBe true
                }
            }
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun cleanup() {
        enrollmentRepository.deleteAll()
        paymentTransactionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
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
        description: String = "A test campaign",
        joinPrice: BigDecimal = BigDecimal.ZERO,
        maxPlayers: Int = 4,
        visibility: CampaignVisibility = CampaignVisibility.PUBLIC
    ): Campaign = campaignRepository.save(
        Campaign(
            name = name,
            description = description,
            owner = owner,
            maxPlayers = maxPlayers,
            joinPrice = joinPrice,
            visibility = visibility
        )
    )

    private fun saveEnrollment(campaign: Campaign, user: User): CampaignEnrollment =
        enrollmentRepository.save(
            CampaignEnrollment(
                campaign = campaign,
                user = user,
                enrolledAt = LocalDateTime.now()
            )
        )
}

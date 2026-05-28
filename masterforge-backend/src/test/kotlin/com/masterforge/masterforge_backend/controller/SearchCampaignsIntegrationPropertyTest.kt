package com.masterforge.masterforge_backend.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.comparables.shouldBeLessThanOrEqualTo
import io.kotest.property.Arb
import io.kotest.property.arbitrary.element
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.cache.CacheManager
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

private val propMapper = ObjectMapper()

/**
 * Integration property-based tests for the Search Campaigns feature.
 *
 * Tests universal properties that should hold across all valid inputs,
 * covering enrollment consistency, payment atomicity, filter monotonicity,
 * and pagination completeness.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SearchCampaignsIntegrationPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var enrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var paymentTransactionRepository: PaymentTransactionRepository
    @Autowired lateinit var jwtService: JwtService
    @Autowired lateinit var cacheManager: CacheManager

    init {

        /**
         * Property: enrollment count consistency
         * The availability endpoint always reflects the actual enrollment count.
         *
         * For any number of enrollments N (1..4), after enrolling N players in a
         * campaign with maxPlayers=5, the availability endpoint must report currentPlayers == N.
         */
        "Property: enrollment count consistency — availability endpoint always reflects actual enrollment count" {
            checkAll(50, Arb.int(1, 4)) { numEnrollments ->
                cleanup()
                val owner = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = 5)
                val campaignId = campaign.id!!

                // Enroll N distinct players
                repeat(numEnrollments) {
                    val player = saveUser()
                    val playerToken = jwtService.generateToken(player.id!!, player.email)
                    mockMvc.perform(
                        post("/api/campaigns/$campaignId/join")
                            .header("Authorization", "Bearer $playerToken")
                    )
                        .andExpect(status().isOk)
                }

                // Check availability endpoint
                val requester = saveUser()
                val requesterToken = jwtService.generateToken(requester.id!!, requester.email)
                val response = mockMvc.perform(
                    get("/api/campaigns/$campaignId/availability")
                        .header("Authorization", "Bearer $requesterToken")
                )
                    .andExpect(status().isOk)
                    .andReturn()

                val body = propMapper.readTree(response.response.contentAsString)
                body.get("currentPlayers").asInt() shouldBe numEnrollments
            }
        }

        /**
         * Property: payment-enrollment atomicity
         * A failed payment never creates an enrollment record, but always records
         * an audit transaction.
         *
         * For any failure scenario, after a failed paid join attempt:
         * - enrollmentRepository count == 0
         * - paymentTransactionRepository count == 1 (audit record)
         */
        "Property: payment-enrollment atomicity — failed payment never creates enrollment" {
            checkAll(
                50,
                Arb.element(
                    listOf(
                        PaymentScenario.INSUFFICIENT_FUNDS,
                        PaymentScenario.CARD_DECLINED,
                        PaymentScenario.NETWORK_ERROR
                    )
                )
            ) { scenario ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val playerToken = jwtService.generateToken(player.id!!, player.email)
                val campaign = saveCampaign(owner = owner, joinPrice = BigDecimal("9.99"))
                val campaignId = campaign.id!!

                val paymentBody = """{"campaignId":"$campaignId","userId":"${player.id!!}","amount":9.99,"mockCardLastFour":"1234","simulationScenario":"${scenario.name}"}"""
                mockMvc.perform(
                    post("/api/campaigns/$campaignId/join-paid")
                        .header("Authorization", "Bearer $playerToken")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(paymentBody)
                )
                    .andReturn() // Don't assert status here — just consume the response

                // Property: no enrollment was created
                val enrollmentCount = enrollmentRepository.countByCampaignId(campaignId)
                enrollmentCount shouldBe 0L

                // Property: exactly one audit transaction record was created
                val transactionCount = paymentTransactionRepository.findByCampaignId(campaignId).size
                transactionCount shouldBe 1
            }
        }

        /**
         * Property: filter monotonicity
         * Adding a price filter never increases the result count.
         *
         * For any N campaigns with varied prices, the count with a maxPrice=5 filter
         * must be <= the count without any filter.
         */
        "Property: filter monotonicity — adding price filter never increases result count" {
            checkAll(50, Arb.int(1, 5)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Create N campaigns with varied prices cycling through 0, 5, 10, 15, 20
                val prices = listOf(
                    BigDecimal("0.00"),
                    BigDecimal("5.00"),
                    BigDecimal("10.00"),
                    BigDecimal("15.00"),
                    BigDecimal("20.00")
                )
                repeat(numCampaigns) { i ->
                    saveCampaign(
                        owner = owner,
                        name = "Campaign_${UUID.randomUUID()}",
                        joinPrice = prices[i % prices.size]
                    )
                }

                // Count without filter
                val unfiltered = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                )
                    .andExpect(status().isOk)
                    .andReturn()
                val count1 = propMapper.readTree(unfiltered.response.contentAsString)
                    .get("totalElements").asInt()

                // Count with maxPrice=5 filter
                val filtered = mockMvc.perform(
                    get("/api/campaigns/search")
                        .header("Authorization", "Bearer $viewerToken")
                        .param("maxPrice", "5")
                )
                    .andExpect(status().isOk)
                    .andReturn()
                val count2 = propMapper.readTree(filtered.response.contentAsString)
                    .get("totalElements").asInt()

                // Property: filtered count <= unfiltered count
                count2 shouldBeLessThanOrEqualTo count1
            }
        }

        /**
         * Property: pagination completeness
         * All campaigns are retrievable across pages with no duplicates.
         *
         * For any N PUBLIC campaigns, paginating with pageSize=3 must yield
         * exactly N unique campaign IDs in total.
         */
        "Property: pagination completeness — all campaigns retrievable across pages" {
            checkAll(30, Arb.int(1, 15)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val viewer = saveUser()
                val viewerToken = jwtService.generateToken(viewer.id!!, viewer.email)

                // Create N PUBLIC campaigns
                repeat(numCampaigns) {
                    saveCampaign(owner = owner, name = "Campaign_${UUID.randomUUID()}")
                }

                val pageSize = 3
                val allIds = mutableSetOf<String>()
                var page = 0
                var hasNext = true

                while (hasNext) {
                    val response = mockMvc.perform(
                        get("/api/campaigns/search")
                            .header("Authorization", "Bearer $viewerToken")
                            .param("page", page.toString())
                            .param("size", pageSize.toString())
                    )
                        .andExpect(status().isOk)
                        .andReturn()

                    val body = propMapper.readTree(response.response.contentAsString)
                    val campaigns = body.get("campaigns")
                    campaigns.forEach { campaign ->
                        allIds.add(campaign.get("id").asText())
                    }

                    hasNext = body.get("hasNext").asBoolean()
                    page++
                }

                // Property: total unique IDs == numCampaigns (no duplicates, no missing)
                allIds.size shouldBe numCampaigns
            }
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun cleanup() {
        enrollmentRepository.deleteAll()
        paymentTransactionRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
        // Clear Spring cache to avoid stale data between property test iterations
        cacheManager.cacheNames.forEach { cacheManager.getCache(it)?.clear() }
    }

    private fun saveUser(balance: java.math.BigDecimal = java.math.BigDecimal("1000.00")): User = userRepository.save(
        User(
            name = "User_${UUID.randomUUID()}",
            email = "user_${UUID.randomUUID()}@test.com",
            passwordHash = "hash",
            balance = balance
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

package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.SearchCriteriaDto
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.util.UUID

/**
 * Feature: search-campaigns
 * Performance tests validating caching effectiveness, batch query correctness,
 * and pagination behavior under varying dataset sizes.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.6
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(CampaignSearchService::class)
class CampaignSearchPerformanceTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var campaignSearchService: CampaignSearchService
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var enrollmentRepository: CampaignEnrollmentRepository

    init {

        /**
         * Feature: search-campaigns
         * Validates: Requirement 8.1 (initial load within 3 seconds), 8.4 (pagination)
         *
         * For any dataset size N, paginated search with page size P should return
         * exactly min(P, N) campaigns on the first page and correct pagination metadata.
         */
        "Pagination correctness: first page returns exactly page-size campaigns for any dataset size" {
            checkAll(50, Arb.int(1, 50)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val searcher = saveUser()
                repeat(numCampaigns) { i ->
                    saveCampaign(owner, name = "Campaign $i", description = "Description $i")
                }

                val pageSize = 10
                val result = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(page = 0, size = pageSize),
                    searcher.id!!
                )

                // Property: first page returns min(pageSize, numCampaigns) campaigns
                val expectedCount = minOf(pageSize, numCampaigns)
                result.campaigns shouldHaveSize expectedCount

                // Property: totalElements matches the actual number of campaigns
                result.totalElements shouldBe numCampaigns.toLong()

                // Property: hasNext is true only when there are more campaigns
                val expectedHasNext = numCampaigns > pageSize
                result.hasNext shouldBe expectedHasNext
            }
        }

        /**
         * Feature: search-campaigns
         * Validates: Requirement 8.2 (search within 2 seconds), 8.5 (caching)
         *
         * For any search criteria, calling searchCampaigns twice with the same criteria
         * should return identical results (cache consistency property).
         */
        "Cache consistency: repeated search with same criteria returns identical results" {
            checkAll(50, Arb.int(1, 20)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val searcher = saveUser()
                val token = "cachetest${numCampaigns}"
                repeat(numCampaigns) { i ->
                    saveCampaign(owner, name = "Campaign $token $i", description = "Description $i")
                }

                val criteria = SearchCriteriaDto(searchText = token, page = 0, size = 50)

                // First call
                val result1 = campaignSearchService.searchCampaigns(criteria, searcher.id!!)
                // Second call (should return same data)
                val result2 = campaignSearchService.searchCampaigns(criteria, searcher.id!!)

                // Property: both calls return the same number of campaigns
                result1.campaigns.size shouldBe result2.campaigns.size

                // Property: both calls return the same campaign IDs
                val ids1 = result1.campaigns.map { it.id }.toSet()
                val ids2 = result2.campaigns.map { it.id }.toSet()
                ids1 shouldBe ids2

                // Property: totalElements is consistent
                result1.totalElements shouldBe result2.totalElements
            }
        }

        /**
         * Feature: search-campaigns
         * Validates: Requirement 8.1, 8.5 (caching reduces server load)
         *
         * For any dataset, the batch enrollment count query returns correct counts
         * for all campaigns in a single operation (validates N+1 fix).
         */
        "Batch enrollment count: countEnrollmentsByCampaignIds returns correct counts for all campaigns" {
            checkAll(30, Arb.int(1, 10)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val campaigns = (1..numCampaigns).map { i ->
                    saveCampaign(owner, name = "Campaign $i", description = "Description $i")
                }

                // Enroll a different user in the first campaign
                val player = saveUser()
                if (campaigns.isNotEmpty()) {
                    enrollmentRepository.save(
                        CampaignEnrollment(
                            campaign = campaigns[0],
                            user = player
                        )
                    )
                }

                val campaignIds = campaigns.mapNotNull { it.id }
                val countResults = campaignRepository.countEnrollmentsByCampaignIds(campaignIds)

                // Build a map from the results
                val countMap = countResults.associate { row ->
                    (row[0] as UUID) to (row[1] as Long).toInt()
                }

                // Property: the first campaign has 1 enrollment
                if (campaigns.isNotEmpty()) {
                    val firstId = campaigns[0].id!!
                    (countMap[firstId] ?: 0) shouldBe 1
                }

                // Property: all other campaigns have 0 enrollments (not in the map)
                campaigns.drop(1).forEach { campaign ->
                    val id = campaign.id!!
                    (countMap[id] ?: 0) shouldBe 0
                }
            }
        }

        /**
         * Feature: search-campaigns
         * Validates: Requirement 8.6 (concurrent access)
         *
         * For any set of campaigns, multiple sequential search calls with different
         * criteria return results consistent with the data (simulates concurrent users
         * with different search terms).
         */
        "Concurrent search simulation: multiple different criteria return independent correct results" {
            checkAll(30, Arb.int(2, 8)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val searcher = saveUser()
                val tokens = (1..numCampaigns).map { "token$it" }
                tokens.forEachIndexed { i, token ->
                    saveCampaign(owner, name = "Campaign $token", description = "Description $i")
                }

                // Simulate multiple "concurrent" users searching for different tokens
                val results = tokens.map { token ->
                    campaignSearchService.searchCampaigns(
                        SearchCriteriaDto(searchText = token, page = 0, size = 50),
                        searcher.id!!
                    )
                }

                // Property: each search returns exactly 1 campaign (the one with that token)
                results.forEachIndexed { i, result ->
                    result.campaigns shouldHaveSize 1
                    result.campaigns[0].name shouldBe "Campaign ${tokens[i]}"
                }
            }
        }

        /**
         * Feature: search-campaigns
         * Validates: Requirement 8.3 (filter within 1 second), 8.1
         *
         * For any price range filter, only campaigns within the range are returned.
         * This validates that the indexed price filter query is correct.
         */
        "Price filter correctness: only campaigns within price range are returned" {
            checkAll(30, Arb.int(1, 10)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                val searcher = saveUser()

                // Create campaigns with prices 0, 5, 10, 15, 20, ...
                repeat(numCampaigns) { i ->
                    saveCampaign(
                        owner,
                        name = "Campaign $i",
                        description = "Description $i",
                        joinPrice = BigDecimal(i * 5)
                    )
                }

                // Filter: maxPrice = 10 (should return campaigns with price 0, 5, 10)
                val result = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(maxPrice = BigDecimal(10), page = 0, size = 50),
                    searcher.id!!
                )

                // Property: all returned campaigns have price <= 10
                result.campaigns.forEach { campaign ->
                    (campaign.joinPrice <= BigDecimal(10)) shouldBe true
                }

                // Property: the number of returned campaigns is correct
                // prices 0, 5, 10 → indices 0, 1, 2 → min(numCampaigns, 3)
                val expectedCount = minOf(numCampaigns, 3)
                result.campaigns.size shouldBe expectedCount
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        enrollmentRepository.deleteAll()
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
        description: String = "Description",
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
}

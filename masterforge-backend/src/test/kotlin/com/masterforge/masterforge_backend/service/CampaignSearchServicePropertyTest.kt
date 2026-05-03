package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.SearchCriteriaDto
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.string
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
 *
 * Property 4: Search Text Matching
 * Validates: Requirement 2.1
 *
 * Property 5: Case-Insensitive Search
 * Validates: Requirement 2.2
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(CampaignSearchService::class)
class CampaignSearchServicePropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired
    lateinit var campaignSearchService: CampaignSearchService

    @Autowired
    lateinit var campaignRepository: CampaignRepository

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var enrollmentRepository: CampaignEnrollmentRepository

    init {

        /**
         * Feature: search-campaigns, Property 4: Search Text Matching
         * Validates: Requirement 2.1
         *
         * For any search text and campaign dataset, the Search_Engine should return
         * campaigns where the search text appears in either the campaign name or description.
         * Campaigns that do not contain the search text in name or description must not appear.
         */
        "Property 4: searchCampaigns returns only campaigns matching the search text in name or description" {
            // Use a fixed set of safe alphanumeric tokens to avoid SQL injection or special char issues
            val tokens = listOf("alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel")
            checkAll(100, Arb.int(0, tokens.size - 1)) { idx ->
                val token = tokens[idx]
                cleanup()
                val owner = saveUser()

                // Campaign whose name contains the token — MUST appear
                val matchingByName = saveCampaign(
                    owner = owner,
                    name = "Campaign $token Adventure",
                    description = "A generic description without the keyword"
                )

                // Campaign whose description contains the token — MUST appear
                val matchingByDesc = saveCampaign(
                    owner = owner,
                    name = "Generic Campaign Name",
                    description = "This campaign features $token as a theme"
                )

                // Campaign with no match — must NOT appear
                saveCampaign(
                    owner = owner,
                    name = "Unrelated Campaign",
                    description = "Nothing relevant here"
                )

                val result = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = token, page = 0, size = 50)
                )

                val returnedIds = result.campaigns.map { it.id }.toSet()

                // Property: both matching campaigns are returned
                returnedIds.contains(matchingByName.id).shouldBeTrue()
                returnedIds.contains(matchingByDesc.id).shouldBeTrue()

                // Property: every returned campaign contains the token in name or description
                result.campaigns.forEach { dto ->
                    val nameContains = dto.name.contains(token, ignoreCase = true)
                    val descContains = dto.description.contains(token, ignoreCase = true)
                    (nameContains || descContains).shouldBeTrue()
                }
            }
        }

        "Property 4 (edge case): empty search text returns all public campaigns" {
            checkAll(100, Arb.int(1, 5)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                repeat(numCampaigns) { i ->
                    saveCampaign(owner, name = "Campaign $i", description = "Description $i")
                }

                val result = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = "", page = 0, size = 50)
                )

                // Property: empty search returns all public campaigns
                result.campaigns.size shouldBe numCampaigns
            }
        }

        "Property 4 (no match): search text with no matches returns empty results" {
            checkAll(100, Arb.int(1, 3)) { numCampaigns ->
                cleanup()
                val owner = saveUser()
                repeat(numCampaigns) { i ->
                    saveCampaign(owner, name = "Campaign $i", description = "Description $i")
                }

                // Use a UUID-based token that is guaranteed not to appear in any campaign
                val noMatchToken = "NOMATCH_${UUID.randomUUID().toString().replace("-", "")}"
                val result = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = noMatchToken, page = 0, size = 50)
                )

                // Property: no campaigns match an unrecognised token
                result.campaigns.shouldBeEmpty()
            }
        }

        /**
         * Feature: search-campaigns, Property 5: Case-Insensitive Search
         * Validates: Requirement 2.2
         *
         * For any search text in any case combination, the Search_Engine should return
         * the same results regardless of the case of the search text.
         */
        "Property 5: searchCampaigns returns the same results regardless of search text case" {
            val tokens = listOf("alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel")
            checkAll(100, Arb.int(0, tokens.size - 1)) { idx ->
                val token = tokens[idx]
                cleanup()
                val owner = saveUser()

                // Create a campaign whose name contains the token in lowercase
                saveCampaign(
                    owner = owner,
                    name = "Campaign ${token.lowercase()} Quest",
                    description = "A standard description"
                )

                // Create a campaign whose description contains the token in uppercase
                saveCampaign(
                    owner = owner,
                    name = "Another Campaign",
                    description = "Features ${token.uppercase()} prominently"
                )

                // Search with lowercase token
                val lowerResult = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = token.lowercase(), page = 0, size = 50)
                )

                // Search with uppercase token
                val upperResult = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = token.uppercase(), page = 0, size = 50)
                )

                // Property: same number of results regardless of case
                lowerResult.campaigns.size shouldBe upperResult.campaigns.size

                // Property: same campaign IDs returned regardless of case
                val lowerIds = lowerResult.campaigns.map { it.id }.toSet()
                val upperIds = upperResult.campaigns.map { it.id }.toSet()
                lowerIds shouldBe upperIds
            }
        }

        "Property 5 (mixed case): search with mixed case returns same results as lowercase" {
            val tokens = listOf("alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel")
            checkAll(100, Arb.int(0, tokens.size - 1)) { idx ->
                val token = tokens[idx]
                cleanup()
                val owner = saveUser()

                saveCampaign(
                    owner = owner,
                    name = "The ${token.lowercase()} Chronicles",
                    description = "An epic adventure"
                )

                // Build a mixed-case version by alternating upper/lower
                val mixedCase = token.mapIndexed { i, c ->
                    if (i % 2 == 0) c.uppercaseChar() else c.lowercaseChar()
                }.joinToString("")

                val lowerResult = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = token.lowercase(), page = 0, size = 50)
                )
                val mixedResult = campaignSearchService.searchCampaigns(
                    SearchCriteriaDto(searchText = mixedCase, page = 0, size = 50)
                )

                // Property: mixed-case search returns the same results as lowercase
                lowerResult.campaigns.map { it.id }.toSet() shouldBe
                    mixedResult.campaigns.map { it.id }.toSet()
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

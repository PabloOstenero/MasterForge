package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
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
import java.time.LocalDateTime
import java.util.UUID

/**
 * Feature: search-campaigns
 *
 * Property 12: Free Campaign Enrollment
 * Validates: Requirement 4.1
 *
 * Property 14: Duplicate Enrollment Prevention
 * Validates: Requirement 4.3
 *
 * Property 15: Owner Self-Enrollment Prevention
 * Validates: Requirement 4.4
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Import(EnrollmentService::class, MockPaymentService::class)
class EnrollmentServicePropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired
    lateinit var enrollmentService: EnrollmentService

    @Autowired
    lateinit var campaignRepository: CampaignRepository

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var enrollmentRepository: CampaignEnrollmentRepository

    init {

        /**
         * Feature: search-campaigns, Property 12: Free Campaign Enrollment
         * Validates: Requirement 4.1
         *
         * For any free campaign with available slots, a user should be successfully
         * enrolled when requesting to join.
         */
        "Property 12: enrollInFreeCampaign succeeds for any free campaign with available slots" {
            checkAll(100, Arb.int(1, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(
                    owner = owner,
                    joinPrice = BigDecimal.ZERO,
                    maxPlayers = maxPlayers
                )

                val result = enrollmentService.enrollInFreeCampaign(campaign.id!!, player.id!!)

                // Property: enrollment succeeds
                result.success.shouldBeTrue()
                result.campaignId shouldBe campaign.id

                // Property: enrollment record is persisted
                val enrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaign.id!!, player.id!!)
                enrolled.shouldBeTrue()

                // Property: enrollment has no payment transaction (free campaign)
                val enrollment = enrollmentRepository.findByCampaignIdAndUserId(campaign.id!!, player.id!!)
                enrollment?.paymentTransactionId shouldBe null
            }
        }

        "Property 12 (count): enrollment count increases by exactly 1 after successful enrollment" {
            checkAll(100, Arb.int(2, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                val countBefore = enrollmentRepository.countByCampaignId(campaign.id!!)
                enrollmentService.enrollInFreeCampaign(campaign.id!!, player.id!!)
                val countAfter = enrollmentRepository.countByCampaignId(campaign.id!!)

                // Property: exactly one new enrollment was created
                countAfter shouldBe countBefore + 1
            }
        }

        "Property 12 (full campaign): enrollment fails when campaign is full" {
            checkAll(100, Arb.int(1, 3)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                // Fill the campaign to capacity
                repeat(maxPlayers) {
                    val existingPlayer = saveUser()
                    enrollmentRepository.save(
                        CampaignEnrollment(
                            campaign = campaign,
                            user = existingPlayer,
                            enrolledAt = LocalDateTime.now()
                        )
                    )
                }

                val newPlayer = saveUser()
                val result = enrollmentService.enrollInFreeCampaign(campaign.id!!, newPlayer.id!!)

                // Property: enrollment fails when campaign is full
                result.success.shouldBeFalse()
            }
        }

        /**
         * Feature: search-campaigns, Property 14: Duplicate Enrollment Prevention
         * Validates: Requirement 4.3
         *
         * For any user and campaign where the user is already enrolled,
         * subsequent join attempts should be prevented.
         */
        "Property 14: enrollInFreeCampaign prevents duplicate enrollment for already-enrolled user" {
            checkAll(100, Arb.int(2, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                // First enrollment — should succeed
                val firstResult = enrollmentService.enrollInFreeCampaign(campaign.id!!, player.id!!)
                firstResult.success.shouldBeTrue()

                // Second enrollment attempt — must be rejected
                val secondResult = enrollmentService.enrollInFreeCampaign(campaign.id!!, player.id!!)
                secondResult.success.shouldBeFalse()

                // Property: only one enrollment record exists for this user/campaign pair
                val enrollmentCount = enrollmentRepository.findByCampaignId(campaign.id!!)
                    .count { it.user.id == player.id }
                enrollmentCount shouldBe 1
            }
        }

        "Property 14 (eligibility check): checkEligibility returns isAlreadyEnrolled=true for enrolled user" {
            checkAll(100, Arb.int(2, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                // Enroll the player
                enrollmentRepository.save(
                    CampaignEnrollment(
                        campaign = campaign,
                        user = player,
                        enrolledAt = LocalDateTime.now()
                    )
                )

                val eligibility = enrollmentService.checkEligibility(campaign.id!!, player.id!!)

                // Property: already-enrolled user is not eligible and reason is reported
                eligibility.eligible.shouldBeFalse()
                eligibility.isAlreadyEnrolled.shouldBeTrue()
            }
        }

        /**
         * Feature: search-campaigns, Property 15: Owner Self-Enrollment Prevention
         * Validates: Requirement 4.4
         *
         * For any campaign and its owner, the owner should be prevented from
         * joining their own campaign.
         */
        "Property 15: enrollInFreeCampaign prevents campaign owner from joining their own campaign" {
            checkAll(100, Arb.int(1, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                val result = enrollmentService.enrollInFreeCampaign(campaign.id!!, owner.id!!)

                // Property: owner cannot enroll in their own campaign
                result.success.shouldBeFalse()

                // Property: no enrollment record was created for the owner
                val enrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaign.id!!, owner.id!!)
                enrolled.shouldBeFalse()
            }
        }

        "Property 15 (eligibility check): checkEligibility returns isOwner=true for campaign owner" {
            checkAll(100, Arb.int(1, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                val eligibility = enrollmentService.checkEligibility(campaign.id!!, owner.id!!)

                // Property: owner is not eligible and isOwner flag is set
                eligibility.eligible.shouldBeFalse()
                eligibility.isOwner.shouldBeTrue()
            }
        }

        "Property 15 (non-owner): non-owner user is not blocked by owner check" {
            checkAll(100, Arb.int(2, 6)) { maxPlayers ->
                cleanup()
                val owner = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(owner = owner, maxPlayers = maxPlayers)

                val eligibility = enrollmentService.checkEligibility(campaign.id!!, player.id!!)

                // Property: non-owner with available slots is eligible
                eligibility.eligible.shouldBeTrue()
                eligibility.isOwner.shouldBeFalse()
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
        joinPrice: BigDecimal = BigDecimal.ZERO,
        maxPlayers: Int = 4,
        visibility: CampaignVisibility = CampaignVisibility.PUBLIC
    ): Campaign = campaignRepository.save(
        Campaign(
            name = "Campaign_${UUID.randomUUID()}",
            description = "A test campaign",
            owner = owner,
            maxPlayers = maxPlayers,
            joinPrice = joinPrice,
            visibility = visibility
        )
    )
}

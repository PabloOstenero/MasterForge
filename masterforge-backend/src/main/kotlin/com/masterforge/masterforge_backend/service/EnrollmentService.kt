package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.EligibilityResultDto
import com.masterforge.masterforge_backend.model.dto.EnrollmentResultDto
import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.cache.annotation.CacheEvict
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.util.UUID

/**
 * Service responsible for campaign enrollment operations.
 *
 * Handles free campaign enrollment, paid campaign enrollment (via [MockPaymentService]),
 * duplicate prevention, owner self-enrollment prevention, and concurrent enrollment
 * safety via database-level unique constraints.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 5.5, 7.6
 */
@Service
class EnrollmentService(
    private val enrollmentRepository: CampaignEnrollmentRepository,
    private val campaignRepository: CampaignRepository,
    private val userRepository: UserRepository,
    private val paymentService: PaymentService
) {

    /**
     * Check whether a user is eligible to enroll in a campaign.
     *
     * A user is ineligible if they:
     * - Are the campaign owner (Req 4.4)
     * - Are already enrolled (Req 4.3)
     * - The campaign has no available slots (Req 4.5)
     *
     * @param campaignId the campaign to check
     * @param userId the user to check eligibility for
     * @return eligibility result with reason if ineligible
     */
    @Transactional(readOnly = true)
    fun checkEligibility(campaignId: UUID, userId: UUID): EligibilityResultDto {
        val campaign = campaignRepository.findById(campaignId).orElse(null)
            ?: return EligibilityResultDto(eligible = false, reason = "Campaign not found")

        val isOwner = campaign.owner.id == userId
        if (isOwner) {
            return EligibilityResultDto(
                eligible = false,
                reason = "Campaign owners cannot join their own campaigns",
                isOwner = true
            )
        }

        val isAlreadyEnrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaignId, userId)
        if (isAlreadyEnrolled) {
            return EligibilityResultDto(
                eligible = false,
                reason = "User is already enrolled in this campaign",
                isAlreadyEnrolled = true
            )
        }

        val currentCount = enrollmentRepository.countByCampaignId(campaignId)
        if (currentCount >= campaign.maxPlayers) {
            return EligibilityResultDto(
                eligible = false,
                reason = "Campaign is full",
                isFull = true
            )
        }

        return EligibilityResultDto(eligible = true)
    }

    /**
     * Enroll a user in a free campaign immediately.
     *
     * Validates eligibility before enrolling. Uses database unique constraint
     * on (campaign_id, user_id) to prevent duplicate enrollments under concurrent
     * access (Req 7.6).
     *
     * Evicts the campaignSearch cache so subsequent searches reflect the new enrollment (Req 8.5).
     *
     * @param campaignId the campaign to join
     * @param userId the user requesting enrollment
     * @return enrollment result with success status and message
     */
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    @Transactional
    fun enrollInFreeCampaign(campaignId: UUID, userId: UUID): EnrollmentResultDto {
        val eligibility = checkEligibility(campaignId, userId)
        if (!eligibility.eligible) {
            return EnrollmentResultDto(
                success = false,
                message = eligibility.reason ?: "Not eligible to join this campaign",
                campaignId = campaignId
            )
        }

        val campaign = campaignRepository.findById(campaignId).get()
        val user = userRepository.findById(userId).orElse(null)
            ?: return EnrollmentResultDto(
                success = false,
                message = "User not found",
                campaignId = campaignId
            )

        return try {
            val enrollment = enrollmentRepository.save(
                CampaignEnrollment(
                    campaign = campaign,
                    user = user,
                    enrolledAt = LocalDateTime.now(),
                    paymentTransactionId = null
                )
            )
            EnrollmentResultDto(
                success = true,
                message = "Successfully enrolled in campaign",
                campaignId = campaignId,
                enrollmentDate = enrollment.enrolledAt
            )
        } catch (ex: Exception) {
            // Catches unique constraint violations from concurrent enrollment attempts
            EnrollmentResultDto(
                success = false,
                message = "Enrollment failed: you may already be enrolled or the campaign is now full",
                campaignId = campaignId
            )
        }
    }

    /**
     * Enroll a user in a paid campaign after a successful payment transaction.
     *
     * Links the enrollment to the payment transaction for audit purposes (Req 5.6).
     * Evicts the campaignSearch cache so subsequent searches reflect the new enrollment (Req 8.5).
     *
     * @param campaignId the campaign to join
     * @param userId the user requesting enrollment
     * @param paymentTransactionId the ID of the completed payment transaction
     * @return enrollment result with success status and message
     */
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    @Transactional
    fun enrollInPaidCampaign(campaignId: UUID, userId: UUID, paymentTransactionId: UUID): EnrollmentResultDto {
        val eligibility = checkEligibility(campaignId, userId)
        if (!eligibility.eligible) {
            return EnrollmentResultDto(
                success = false,
                message = eligibility.reason ?: "Not eligible to join this campaign",
                campaignId = campaignId
            )
        }

        val campaign = campaignRepository.findById(campaignId).get()
        val user = userRepository.findById(userId).orElse(null)
            ?: return EnrollmentResultDto(
                success = false,
                message = "User not found",
                campaignId = campaignId
            )

        return try {
            val enrollment = enrollmentRepository.save(
                CampaignEnrollment(
                    campaign = campaign,
                    user = user,
                    enrolledAt = LocalDateTime.now(),
                    paymentTransactionId = paymentTransactionId
                )
            )
            EnrollmentResultDto(
                success = true,
                message = "Successfully enrolled in campaign after payment",
                campaignId = campaignId,
                enrollmentDate = enrollment.enrolledAt
            )
        } catch (ex: Exception) {
            EnrollmentResultDto(
                success = false,
                message = "Enrollment failed after payment: please contact support",
                campaignId = campaignId
            )
        }
    }

    /**
     * Get the current enrollment count for a campaign.
     *
     * @param campaignId the campaign to count enrollments for
     * @return number of enrolled users
     */
    @Transactional(readOnly = true)
    fun getEnrollmentCount(campaignId: UUID): Int =
        enrollmentRepository.countByCampaignId(campaignId).toInt()

    /**
     * Process a paid campaign enrollment end-to-end.
     *
     * ACADEMIC DISCLAIMER: Payment processing is a mock simulation for educational purposes only.
     *
     * Steps:
     * 1. Check eligibility — if not eligible, return failure immediately (no payment attempted).
     * 2. Call [MockPaymentService.processPayment] to simulate the payment.
     * 3. If payment succeeds, call [enrollInPaidCampaign] to create the enrollment record.
     * 4. If payment fails, return a failure result with the payment error message.
     *
     * Transaction semantics: the payment transaction record is NOT rolled back on enrollment
     * failure because it serves as an audit record (Req 5.6). The enrollment itself is
     * rolled back if it fails after a successful payment.
     *
     * @param campaignId the campaign to join
     * @param userId the user requesting enrollment
     * @param paymentRequest the mock payment details
     * @return enrollment result with success status and message
     */
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    @Transactional
    fun processPaidEnrollment(
        campaignId: UUID,
        userId: UUID,
        paymentRequest: PaymentRequest
    ): EnrollmentResultDto {
        // Step 1: eligibility check
        val eligibility = checkEligibility(campaignId, userId)
        if (!eligibility.eligible) {
            return EnrollmentResultDto(
                success = false,
                message = eligibility.reason ?: "Not eligible to join this campaign",
                campaignId = campaignId
            )
        }

        val campaign = campaignRepository.findById(campaignId).orElseThrow()
        val dmId = campaign.owner.id!!

        // Step 2: Process internal transfer from Player to DM
        // Requirements: 5.4, 5.5, Economy Fix
        val paymentResult = paymentService.processInternalTransfer(
            fromUserId = userId,
            toUserId = dmId,
            amount = campaign.joinPrice,
            type = "CAMPAIGN_JOIN",
            campaignId = campaignId
        )

        // Step 3: handle payment outcome
        if (!paymentResult.success) {
            return EnrollmentResultDto(
                success = false,
                message = paymentResult.errorMessage ?: "Payment failed: please try again",
                campaignId = campaignId
            )
        }

        // Step 4: enroll the user
        val transactionId = paymentResult.transactionId!!
        return enrollInPaidCampaign(campaignId, userId, transactionId)
    }

}

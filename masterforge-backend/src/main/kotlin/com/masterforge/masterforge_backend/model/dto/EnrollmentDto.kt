package com.masterforge.masterforge_backend.model.dto

import java.time.LocalDateTime
import java.util.UUID

/**
 * DTO representing the result of a campaign enrollment attempt.
 */
data class EnrollmentResultDto(
    val success: Boolean,
    val message: String,
    val campaignId: UUID,
    val enrollmentDate: LocalDateTime? = null
)

/**
 * DTO for eligibility check results before enrollment.
 */
data class EligibilityResultDto(
    val eligible: Boolean,
    val reason: String? = null,
    val isOwner: Boolean = false,
    val isAlreadyEnrolled: Boolean = false,
    val isFull: Boolean = false
)

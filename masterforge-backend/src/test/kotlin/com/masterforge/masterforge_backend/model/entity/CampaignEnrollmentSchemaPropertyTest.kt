package com.masterforge.masterforge_backend.model.entity

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.uuid
import io.kotest.property.checkAll
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * Property-based test for Campaign Enrollment schema integrity.
 *
 * **Feature: search-campaigns, Property 21: Payment Transaction Recording (Extended)**
 * **Validates: Requirements 5.6, 4.1, 4.3, 4.4**
 *
 * Ensures that campaign enrollment entities maintain proper relationships and constraints.
 */
class CampaignEnrollmentSchemaPropertyTest : StringSpec({

    /**
     * Feature: search-campaigns, Property 21 (extended): Campaign Enrollment Entity Integrity
     * Validates: Requirements 4.1, 4.3, 4.4
     *
     * For any valid enrollment data, the CampaignEnrollment entity should maintain
     * all required fields and handle optional payment transaction references correctly.
     */
    "Campaign Enrollment Entity Integrity - All enrollments should maintain proper structure" {
        checkAll(100, Arb.uuid(), Arb.uuid(), Arb.boolean()) { campaignId, userId, hasPaid ->
            val mockUser = User(
                id = userId,
                name = "Test User",
                email = "test_${UUID.randomUUID()}@example.com",
                passwordHash = "hashedpassword"
            )
            val mockCampaign = Campaign(
                id = campaignId,
                name = "Test Campaign",
                description = "Test Description",
                owner = mockUser,
                maxPlayers = 4,
                joinPrice = BigDecimal.ZERO,
                visibility = CampaignVisibility.PUBLIC
            )
            val paymentTransactionId = if (hasPaid) UUID.randomUUID() else null
            val enrolledAt = LocalDateTime.now()

            val enrollment = CampaignEnrollment(
                campaign = mockCampaign,
                user = mockUser,
                enrolledAt = enrolledAt,
                paymentTransactionId = paymentTransactionId
            )

            // Property: required fields are properly set
            enrollment.campaign shouldBe mockCampaign
            enrollment.user shouldBe mockUser
            enrollment.enrolledAt shouldBe enrolledAt

            // Property: optional payment transaction ID is handled correctly
            enrollment.paymentTransactionId shouldBe paymentTransactionId
        }
    }

    "Enrollment Timestamp Validation - Enrollment timestamps should be valid" {
        checkAll(100, Arb.uuid(), Arb.uuid()) { campaignId, userId ->
            val mockUser = User(
                id = userId,
                name = "Test User",
                email = "test_${UUID.randomUUID()}@example.com",
                passwordHash = "hashedpassword"
            )
            val mockCampaign = Campaign(
                id = campaignId,
                name = "Test Campaign",
                description = "Test Description",
                owner = mockUser,
                maxPlayers = 4,
                joinPrice = BigDecimal.ZERO,
                visibility = CampaignVisibility.PUBLIC
            )
            val enrolledAt = LocalDateTime.now()

            val enrollment = CampaignEnrollment(
                campaign = mockCampaign,
                user = mockUser,
                enrolledAt = enrolledAt
            )

            // Property: timestamp is stored correctly
            enrollment.enrolledAt shouldBe enrolledAt
            // Property: timestamp is not in the future (within a small tolerance)
            enrollment.enrolledAt.isBefore(LocalDateTime.now().plusMinutes(1)) shouldBe true
        }
    }

    "Payment Transaction Reference Validation - Payment references should be optional" {
        checkAll(100, Arb.uuid(), Arb.uuid(), Arb.boolean()) { campaignId, userId, hasPaid ->
            val mockUser = User(
                id = userId,
                name = "Test User",
                email = "test_${UUID.randomUUID()}@example.com",
                passwordHash = "hashedpassword"
            )
            val mockCampaign = Campaign(
                id = campaignId,
                name = "Test Campaign",
                description = "Test Description",
                owner = mockUser,
                maxPlayers = 4,
                joinPrice = BigDecimal.ZERO,
                visibility = CampaignVisibility.PUBLIC
            )
            val paymentTransactionId = if (hasPaid) UUID.randomUUID() else null

            val enrollment = CampaignEnrollment(
                campaign = mockCampaign,
                user = mockUser,
                enrolledAt = LocalDateTime.now(),
                paymentTransactionId = paymentTransactionId
            )

            // Property: null payment transaction IDs are allowed (free campaigns)
            if (paymentTransactionId == null) {
                enrollment.paymentTransactionId.shouldBeNull()
            } else {
                enrollment.paymentTransactionId.shouldNotBeNull()
                enrollment.paymentTransactionId shouldBe paymentTransactionId
            }
        }
    }
})

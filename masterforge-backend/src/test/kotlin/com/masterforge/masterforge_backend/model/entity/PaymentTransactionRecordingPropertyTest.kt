package com.masterforge.masterforge_backend.model.entity

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.enum
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.uuid
import io.kotest.property.checkAll
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDateTime

/**
 * Property-based test for Payment Transaction Recording functionality.
 *
 * **Feature: search-campaigns, Property 21: Payment Transaction Recording**
 * **Validates: Requirements 5.6**
 *
 * For any payment attempt (successful or failed), a transaction record should be
 * created and stored with all required fields properly set.
 *
 * ACADEMIC DISCLAIMER: This tests a mock payment system for educational purposes only.
 */
class PaymentTransactionRecordingPropertyTest : StringSpec({

    /**
     * Feature: search-campaigns, Property 21: Payment Transaction Recording
     * Validates: Requirement 5.6
     *
     * For any payment attempt (successful or failed), a transaction record should
     * be created and stored with all required fields properly set.
     */
    "Payment Transaction Recording - All payment attempts should create transaction records" {
        checkAll(100, Arb.uuid(), Arb.uuid(), Arb.enum<PaymentStatus>(), Arb.int(0, 99999)) {
            userId, campaignId, status, amountCents ->

            val amount = BigDecimal.valueOf(amountCents.toLong(), 2)
                .setScale(2, RoundingMode.HALF_UP)

            val transaction = PaymentTransaction(
                userId = userId,
                campaignId = campaignId,
                amount = amount,
                status = status,
                processedAt = LocalDateTime.now()
            )

            // Property: all required fields are properly set
            transaction.userId shouldBe userId
            transaction.campaignId shouldBe campaignId
            transaction.amount shouldBe amount
            transaction.status shouldBe status
            transaction.processedAt.shouldNotBeNull()

            // Property: academic disclaimer is always present
            transaction.academicDisclaimer shouldBe "MOCK_TRANSACTION_FOR_ACADEMIC_PURPOSES_ONLY"

            // Property: default transaction type is set
            transaction.transactionType shouldBe "CAMPAIGN_JOIN"
        }
    }

    /**
     * Feature: search-campaigns, Property 21 (status): All payment statuses are supported
     * Validates: Requirement 5.6
     */
    "Payment Transaction Status Validation - All payment statuses should be supported" {
        checkAll(100, Arb.uuid(), Arb.uuid(), Arb.enum<PaymentStatus>()) {
            userId, campaignId, status ->

            val transaction = PaymentTransaction(
                userId = userId,
                campaignId = campaignId,
                amount = BigDecimal("9.99"),
                status = status,
                processedAt = LocalDateTime.now()
            )

            // Property: status is stored correctly for all enum values
            transaction.status shouldBe status
        }
    }

    /**
     * Feature: search-campaigns, Property 22: Payment Scenario Simulation
     * Validates: Requirement 5.8
     *
     * For any payment scenario type, the system should correctly record that scenario.
     */
    "Payment Scenario Simulation - All simulation scenarios should be supported" {
        checkAll(100, Arb.uuid(), Arb.uuid(), Arb.enum<PaymentScenario>()) {
            userId, campaignId, scenario ->

            val transaction = PaymentTransaction(
                userId = userId,
                campaignId = campaignId,
                amount = BigDecimal("19.99"),
                status = PaymentStatus.PENDING,
                simulationScenario = scenario,
                processedAt = LocalDateTime.now()
            )

            // Property: simulation scenario is stored correctly for all enum values
            transaction.simulationScenario shouldBe scenario
        }
    }

    "Payment Transaction Amount Precision - Amounts should be stored with 2 decimal places" {
        checkAll(100, Arb.int(0, 99999)) { amountCents ->
            val amount = BigDecimal.valueOf(amountCents.toLong(), 2)
                .setScale(2, RoundingMode.HALF_UP)

            val transaction = PaymentTransaction(
                userId = java.util.UUID.randomUUID(),
                campaignId = java.util.UUID.randomUUID(),
                amount = amount,
                status = PaymentStatus.COMPLETED,
                processedAt = LocalDateTime.now()
            )

            // Property: amount is stored with correct scale
            transaction.amount.scale() shouldBe 2
            transaction.amount shouldBe amount
        }
    }
})

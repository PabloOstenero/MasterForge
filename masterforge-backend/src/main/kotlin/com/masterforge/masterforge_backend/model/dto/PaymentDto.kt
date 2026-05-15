package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonAlias
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import java.math.BigDecimal
import java.util.UUID

/**
 * DTO representing a mock payment request for academic demonstration.
 *
 * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
 * No real financial transactions are processed.
 *
 * All fields are optional with defaults so Jackson can deserialize any subset
 * of fields the frontend sends without throwing a 400.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class PaymentRequest(
    val campaignId: String? = null,
    val userId: UUID? = null,          // overridden from JWT in controller
    val amount: BigDecimal? = null,
    val mockCardLastFour: String? = null,
    @JsonAlias("cardData")
    val mockCardData: MockCardDataDto? = null,
    val simulationScenario: PaymentScenario? = null
) {
    /**
     * Returns the last four digits of the card.
     * Prefers mockCardLastFour if set, otherwise extracts from mockCardData.cardNumber.
     */
    fun resolvedCardLastFour(): String {
        if (!mockCardLastFour.isNullOrBlank()) return mockCardLastFour.takeLast(4)
        val cardNumber = mockCardData?.cardNumber?.replace("\\s".toRegex(), "") ?: ""
        return if (cardNumber.length >= 4) cardNumber.takeLast(4) else "0000"
    }

    /** Returns the amount as BigDecimal, defaulting to zero if not provided. */
    fun resolvedAmount(): BigDecimal = amount ?: BigDecimal.ZERO

    /** Returns the campaignId as UUID, or null if not provided or invalid. */
    fun resolvedCampaignId(): UUID? {
        return try {
            campaignId?.let { UUID.fromString(it) }
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * Mock credit card data sent by the frontend payment form.
 *
 * ACADEMIC DISCLAIMER: All card data is simulated — no real payment gateway is used.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class MockCardDataDto(
    val cardNumber: String? = null,
    val expiryDate: String? = null,
    val cvv: String? = null,
    val cardholderName: String? = null
)

/**
 * DTO representing the result of a mock payment attempt.
 *
 * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
 * No real financial transactions are processed.
 */
data class PaymentResult(
    val success: Boolean,
    val transactionId: UUID?,
    val errorMessage: String?,
    val scenario: PaymentScenario,
    val academicDisclaimer: String = "MOCK_PAYMENT_FOR_ACADEMIC_PURPOSES_ONLY"
)

/**
 * DTO for explicitly requesting a specific payment simulation scenario.
 *
 * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
 * No real financial transactions are processed.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class SimulationRequest(
    val campaignId: String? = null,
    val userId: UUID? = null,
    val amount: BigDecimal? = null,
    val mockCardLastFour: String? = null,
    val scenario: PaymentScenario? = null
)

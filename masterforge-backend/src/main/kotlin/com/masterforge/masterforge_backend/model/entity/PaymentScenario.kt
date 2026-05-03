package com.masterforge.masterforge_backend.model.entity

/**
 * Represents different payment simulation scenarios for academic demonstration.
 * These scenarios allow testing various payment outcomes without real transactions.
 */
enum class PaymentScenario {
    SUCCESS,
    INSUFFICIENT_FUNDS,
    CARD_DECLINED,
    NETWORK_ERROR,
    TIMEOUT
}
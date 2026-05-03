package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.dto.PaymentResult
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import com.masterforge.masterforge_backend.model.entity.PaymentTransaction
import java.util.UUID

/**
 * Abstraction for payment processing.
 *
 * Depend on this interface rather than any concrete implementation so that
 * different features (campaign enrollment, homebrew purchases, etc.) can reuse
 * payment processing without coupling to a specific provider.
 *
 * The current implementation is [MockPaymentService], which simulates payments
 * for academic demonstration. A real payment gateway implementation can be
 * swapped in by providing a different Spring bean without changing any caller.
 */
interface PaymentService {

    /**
     * Process a payment request and return the result.
     *
     * The outcome is determined by [PaymentRequest.simulationScenario] in the
     * mock implementation, and by the actual gateway in a real implementation.
     *
     * @param request payment details including amount, card data, and optional scenario
     * @return result indicating success or failure with a transaction ID on success
     */
    fun processPayment(request: PaymentRequest): PaymentResult

    /**
     * Explicitly simulate a specific payment scenario.
     *
     * Useful for testing and academic demonstration of different payment outcomes.
     *
     * @param request payment details
     * @param scenario the scenario to simulate
     * @return result matching the requested scenario
     */
    fun simulatePaymentScenario(request: PaymentRequest, scenario: PaymentScenario): PaymentResult

    /**
     * Retrieve the full payment transaction history for a user.
     *
     * @param userId the user whose history to retrieve
     * @return list of all transactions (successful and failed) for the user
     */
    fun getTransactionHistory(userId: UUID): List<PaymentTransaction>
}

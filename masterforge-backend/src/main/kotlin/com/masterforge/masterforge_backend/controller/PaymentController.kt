package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.dto.PaymentResult
import com.masterforge.masterforge_backend.model.dto.SimulationRequest
import com.masterforge.masterforge_backend.model.entity.PaymentTransaction
import com.masterforge.masterforge_backend.service.PaymentService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/**
 * REST controller for mock payment processing operations.
 *
 * ACADEMIC DISCLAIMER: This controller handles a mock payment system for educational
 * purposes only. No real financial transactions are processed. All payment scenarios
 * are simulated to demonstrate the complete enrollment workflow for academic evaluation.
 *
 * All endpoints require authentication (enforced by SecurityConfig).
 *
 * Requirements: 5.2, 5.6, 5.7, 5.8
 */
@RestController
@RequestMapping("/api/payments")
class PaymentController(
    private val paymentService: PaymentService
) {

    /**
     * Process a mock payment request.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     * No real financial transactions are processed.
     *
     * Simulates payment processing and stores a transaction record for audit purposes (Req 5.6).
     * The outcome is determined by the optional [PaymentRequest.simulationScenario] field:
     * - null or SUCCESS → payment succeeds
     * - INSUFFICIENT_FUNDS, CARD_DECLINED, NETWORK_ERROR, TIMEOUT → payment fails
     *
     * POST /api/payments/process
     *
     * @param request mock payment details including campaign, amount, and optional scenario
     * @return payment result with success status, transaction ID, and academic disclaimer
     */
    @PostMapping("/process")
    fun processPayment(@RequestBody request: PaymentRequest): ResponseEntity<PaymentResult> {
        val userId = getCurrentUserId()
        val resolvedRequest = request.copy(userId = userId)
        val result = paymentService.processPayment(resolvedRequest)
        return if (result.success) {
            ResponseEntity.ok(result)
        } else {
            ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(result)
        }
    }

    /**
     * Simulate a specific payment scenario for testing and demonstration.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     * No real financial transactions are processed.
     *
     * Allows explicit selection of a payment scenario (success, failure, timeout, etc.)
     * to demonstrate different payment outcomes (Req 5.8). Stores a transaction record
     * for every simulation attempt (Req 5.6).
     *
     * POST /api/payments/simulate
     *
     * @param request simulation request with explicit scenario selection
     * @return payment result matching the requested scenario
     */
    @PostMapping("/simulate")
    fun simulatePayment(@RequestBody request: SimulationRequest): ResponseEntity<PaymentResult> {
        val userId = getCurrentUserId()
        val paymentRequest = PaymentRequest(
            campaignId = request.campaignId,
            userId = userId,
            amount = request.amount,
            mockCardLastFour = request.mockCardLastFour ?: "",
            simulationScenario = null
        )
        val result = paymentService.simulatePaymentScenario(paymentRequest, request.scenario ?: com.masterforge.masterforge_backend.model.entity.PaymentScenario.SUCCESS)
        return if (result.success) {
            ResponseEntity.ok(result)
        } else {
            ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(result)
        }
    }

    /**
     * Retrieve the mock payment transaction history for the authenticated user.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     * No real financial transactions are processed.
     *
     * Returns all transaction records (successful and failed) for audit and
     * demonstration purposes (Req 5.6, 5.7).
     *
     * GET /api/payments/history
     *
     * @return list of all mock payment transactions for the current user
     */
    @GetMapping("/history")
    fun getPaymentHistory(): ResponseEntity<List<PaymentTransaction>> {
        val userId = getCurrentUserId()
        val history = paymentService.getTransactionHistory(userId)
        return ResponseEntity.ok(history)
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Extract the authenticated user's UUID from the security context.
     *
     * Delegates to [SecurityUtils.getCurrentUserId].
     */
    private fun getCurrentUserId(): UUID = SecurityUtils.getCurrentUserId()
}

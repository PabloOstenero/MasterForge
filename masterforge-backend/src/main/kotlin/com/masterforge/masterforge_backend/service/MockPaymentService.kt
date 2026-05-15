package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.dto.PaymentResult
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import com.masterforge.masterforge_backend.model.entity.PaymentStatus
import com.masterforge.masterforge_backend.model.entity.PaymentTransaction
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * Mock payment service for academic demonstration purposes.
 *
 * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
 * No real financial transactions are processed. All payment scenarios are simulated
 * to demonstrate the complete enrollment workflow for academic evaluation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */
@Service
class MockPaymentService(
    private val paymentTransactionRepository: PaymentTransactionRepository,
    private val userRepository: UserRepository,
    @Value("\${mock.payment.delay-ms:100}") private val simulatedDelayMs: Long = 100L
) : PaymentService {

    /**
     * Process a mock payment request.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     *
     * Requirements: 5.2, 5.3, 5.4, 5.5, 5.6
     */
    @Transactional
    override fun processPayment(request: PaymentRequest): PaymentResult {
        val scenario = request.simulationScenario ?: PaymentScenario.SUCCESS
        return doSimulate(
            campaignId = request.resolvedCampaignId(),
            userId = request.userId ?: UUID.randomUUID(),
            amount = request.resolvedAmount(),
            mockCardLastFour = request.resolvedCardLastFour(),
            scenario = scenario,
            transactionType = "CAMPAIGN_JOIN"
        )
    }

    @Transactional
    override fun topUpBalance(userId: UUID, request: PaymentRequest): PaymentResult {
        val amount = request.resolvedAmount()
        if (amount <= BigDecimal.ZERO) {
            return PaymentResult(
                success = false,
                transactionId = null,
                errorMessage = "Invalid top-up amount. Must be greater than zero.",
                scenario = PaymentScenario.SUCCESS
            )
        }
        
        val scenario = request.simulationScenario ?: PaymentScenario.SUCCESS
        val result = doSimulate(
            campaignId = null,
            userId = userId,
            amount = amount,
            mockCardLastFour = request.resolvedCardLastFour(),
            scenario = scenario,
            transactionType = "BALANCE_TOPUP"
        )

        if (result.success) {
            val user = userRepository.findById(userId).orElseThrow()
            user.balance = user.balance.add(request.resolvedAmount())
            userRepository.saveAndFlush(user)
        }

        return result
    }

    @Transactional
    override fun processInternalTransfer(
        fromUserId: UUID,
        toUserId: UUID,
        amount: BigDecimal,
        type: String,
        campaignId: UUID?
    ): PaymentResult {
        val fromUser = userRepository.findById(fromUserId).orElseThrow()
        val toUser = userRepository.findById(toUserId).orElseThrow()

        // Check sufficient funds
        if (fromUser.balance < amount) {
            return PaymentResult(
                success = false,
                transactionId = null,
                errorMessage = "Insufficient funds. Required: $amount, Available: ${fromUser.balance}",
                scenario = PaymentScenario.SUCCESS // Normal flow, just no funds
            )
        }

        // Perform transfer
        fromUser.balance = fromUser.balance.subtract(amount)
        toUser.balance = toUser.balance.add(amount)

        userRepository.saveAndFlush(fromUser)
        userRepository.saveAndFlush(toUser)

        // Log transaction for the payer (DEBIT)
        paymentTransactionRepository.save(
            PaymentTransaction(
                userId = fromUserId,
                relatedUserId = toUserId,
                campaignId = campaignId,
                amount = amount,
                status = PaymentStatus.COMPLETED,
                transactionType = type,
                isCredit = false,
                processedAt = LocalDateTime.now(),
                mockCardLastFour = "WALLET"
            )
        )

        // Log transaction for the receiver (CREDIT)
        val transaction = paymentTransactionRepository.save(
            PaymentTransaction(
                userId = toUserId,
                relatedUserId = fromUserId,
                campaignId = campaignId,
                amount = amount,
                status = PaymentStatus.COMPLETED,
                transactionType = type,
                isCredit = true,
                processedAt = LocalDateTime.now(),
                mockCardLastFour = "WALLET"
            )
        )

        return PaymentResult(
            success = true,
            transactionId = transaction.id,
            errorMessage = null,
            scenario = PaymentScenario.SUCCESS
        )
    }

    @Transactional
    override fun subscribeUser(userId: UUID, request: PaymentRequest): PaymentResult {
        val scenario = request.simulationScenario ?: PaymentScenario.SUCCESS
        val result = doSimulate(
            campaignId = null,
            userId = userId,
            amount = request.resolvedAmount(),
            mockCardLastFour = request.resolvedCardLastFour(),
            scenario = scenario,
            transactionType = "SUBSCRIPTION"
        )

        if (result.success) {
            val user = userRepository.findById(userId).orElseThrow()
            user.subscriptionTier = "PRO"
            
            // For testing expiration: if the scenario is EXPIRED_SUBSCRIPTION, set to yesterday
            if (scenario == PaymentScenario.EXPIRED_SUBSCRIPTION) {
                user.subscriptionExpiresAt = LocalDateTime.now().minusDays(1)
            } else {
                user.subscriptionExpiresAt = LocalDateTime.now().plusDays(30)
            }
            
            userRepository.saveAndFlush(user)
        }

        return result
    }

    /**
     * Simulate a specific payment scenario explicitly.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     *
     * Requirements: 5.8
     */
    @Transactional
    override fun simulatePaymentScenario(request: PaymentRequest, scenario: PaymentScenario): PaymentResult {
        return doSimulate(
            campaignId = request.resolvedCampaignId(),
            userId = request.userId ?: UUID.randomUUID(),
            amount = request.resolvedAmount(),
            mockCardLastFour = request.resolvedCardLastFour(),
            scenario = scenario,
            transactionType = "SIMULATION"
        )
    }

    /**
     * Retrieve the full mock transaction history for a user.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     *
     * Requirements: 5.6, 5.7
     */
    @Transactional(readOnly = true)
    override fun getTransactionHistory(userId: UUID): List<PaymentTransaction> =
        paymentTransactionRepository.findByUserId(userId)

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Core simulation logic.
     *
     * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
     */
    private fun doSimulate(
        campaignId: UUID?,
        userId: UUID,
        amount: BigDecimal,
        mockCardLastFour: String,
        scenario: PaymentScenario,
        transactionType: String
    ): PaymentResult {
        // Simulate realistic payment gateway latency (Req 5.3)
        Thread.sleep(simulatedDelayMs)

        val (status, errorMessage) = when (scenario) {
            PaymentScenario.SUCCESS -> Pair(PaymentStatus.COMPLETED, null)
            PaymentScenario.INSUFFICIENT_FUNDS -> Pair(
                PaymentStatus.FAILED,
                "Payment declined: insufficient funds on the simulated card"
            )
            PaymentScenario.CARD_DECLINED -> Pair(
                PaymentStatus.FAILED,
                "Payment declined: simulated card was declined by the issuer"
            )
            PaymentScenario.NETWORK_ERROR -> Pair(
                PaymentStatus.FAILED,
                "Payment failed: simulated network error while contacting payment gateway"
            )
            PaymentScenario.TIMEOUT -> Pair(
                PaymentStatus.FAILED,
                "Payment failed: simulated timeout — payment gateway did not respond in time"
            )
            PaymentScenario.EXPIRED_SUBSCRIPTION -> Pair(PaymentStatus.COMPLETED, null)
        }

        // Store every transaction attempt for audit purposes (Req 5.6)
        val transaction = paymentTransactionRepository.save(
            PaymentTransaction(
                userId = userId,
                campaignId = campaignId,
                amount = amount,
                status = status,
                transactionType = transactionType,
                processedAt = LocalDateTime.now(),
                mockCardLastFour = mockCardLastFour,
                simulationScenario = scenario,
                isCredit = (transactionType == "BALANCE_TOPUP" && status == PaymentStatus.COMPLETED)
            )
        )

        return PaymentResult(
            success = status == PaymentStatus.COMPLETED,
            transactionId = transaction.id,
            errorMessage = errorMessage,
            scenario = scenario
        )
    }
}

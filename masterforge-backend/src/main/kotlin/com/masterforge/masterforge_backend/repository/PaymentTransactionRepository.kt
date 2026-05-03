package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.PaymentTransaction
import com.masterforge.masterforge_backend.model.entity.PaymentStatus
import com.masterforge.masterforge_backend.model.entity.PaymentScenario
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.UUID

/**
 * Repository interface for PaymentTransaction entities.
 * Provides data access methods for mock payment transaction operations.
 * 
 * ACADEMIC DISCLAIMER: This repository handles mock payment data for educational purposes only.
 */
@Repository
interface PaymentTransactionRepository : JpaRepository<PaymentTransaction, UUID> {
    
    /**
     * Find all payment transactions for a specific user.
     */
    fun findByUserId(userId: UUID): List<PaymentTransaction>
    
    /**
     * Find all payment transactions for a specific campaign.
     */
    fun findByCampaignId(campaignId: UUID): List<PaymentTransaction>
    
    /**
     * Find transactions by status.
     */
    fun findByStatus(status: PaymentStatus): List<PaymentTransaction>
    
    /**
     * Find transactions by simulation scenario.
     */
    fun findBySimulationScenario(scenario: PaymentScenario): List<PaymentTransaction>
    
    /**
     * Find transactions within a date range.
     */
    @Query("SELECT t FROM PaymentTransaction t WHERE t.processedAt BETWEEN :startDate AND :endDate")
    fun findByProcessedAtBetween(
        @Param("startDate") startDate: LocalDateTime,
        @Param("endDate") endDate: LocalDateTime
    ): List<PaymentTransaction>
    
    /**
     * Find successful transactions for a user.
     */
    @Query("SELECT t FROM PaymentTransaction t WHERE t.userId = :userId AND t.status = 'COMPLETED'")
    fun findSuccessfulTransactionsByUserId(@Param("userId") userId: UUID): List<PaymentTransaction>
    
    /**
     * Find failed transactions for audit purposes.
     */
    @Query("SELECT t FROM PaymentTransaction t WHERE t.status IN ('FAILED', 'CANCELLED')")
    fun findFailedTransactions(): List<PaymentTransaction>
    
    /**
     * Get transaction history for a user and campaign.
     */
    @Query("SELECT t FROM PaymentTransaction t WHERE t.userId = :userId AND t.campaignId = :campaignId ORDER BY t.processedAt DESC")
    fun findByUserIdAndCampaignIdOrderByProcessedAtDesc(
        @Param("userId") userId: UUID,
        @Param("campaignId") campaignId: UUID
    ): List<PaymentTransaction>
    
    /**
     * Count transactions by status for reporting.
     */
    @Query("SELECT COUNT(t) FROM PaymentTransaction t WHERE t.status = :status")
    fun countByStatus(@Param("status") status: PaymentStatus): Long
    
    /**
     * Get daily transaction summary for audit reporting.
     */
    @Query("""
        SELECT DATE(t.processedAt) as transactionDate, 
               COUNT(t) as transactionCount, 
               SUM(t.amount) as totalAmount,
               t.status as status
        FROM PaymentTransaction t 
        WHERE t.processedAt >= :startDate 
        GROUP BY DATE(t.processedAt), t.status
        ORDER BY transactionDate DESC
    """)
    fun getDailyTransactionSummary(@Param("startDate") startDate: LocalDateTime): List<Any>
    
    /**
     * Find transactions that need retry (failed with specific scenarios).
     */
    @Query("""
        SELECT t FROM PaymentTransaction t 
        WHERE t.status = 'FAILED' 
        AND t.simulationScenario IN ('NETWORK_ERROR', 'TIMEOUT')
        AND t.processedAt >= :retryAfter
    """)
    fun findRetryableTransactions(@Param("retryAfter") retryAfter: LocalDateTime): List<PaymentTransaction>
    
    /**
     * Get payment statistics for a campaign.
     */
    @Query("""
        SELECT COUNT(t) as totalTransactions,
               SUM(CASE WHEN t.status = 'COMPLETED' THEN t.amount ELSE 0 END) as totalRevenue,
               COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END) as successfulPayments,
               COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failedPayments
        FROM PaymentTransaction t 
        WHERE t.campaignId = :campaignId
    """)
    fun getCampaignPaymentStatistics(@Param("campaignId") campaignId: UUID): List<Any>
    
    /**
     * Find suspicious transaction patterns for audit.
     */
    @Query("""
        SELECT t FROM PaymentTransaction t 
        WHERE t.userId = :userId 
        AND t.processedAt >= :timeWindow
        AND t.status = 'FAILED'
        GROUP BY t.userId
        HAVING COUNT(t) > :maxFailures
    """)
    fun findSuspiciousTransactionPatterns(
        @Param("userId") userId: UUID,
        @Param("timeWindow") timeWindow: LocalDateTime,
        @Param("maxFailures") maxFailures: Long
    ): List<PaymentTransaction>
}
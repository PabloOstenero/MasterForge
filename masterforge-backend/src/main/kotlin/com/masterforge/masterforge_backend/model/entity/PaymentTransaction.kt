package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * Represents a mock payment transaction for academic demonstration purposes.
 * This entity stores simulated payment data for campaign enrollment fees.
 * 
 * ACADEMIC DISCLAIMER: This is a mock payment system for educational purposes only.
 * No real financial transactions are processed.
 */
@Entity
@Table(
    name = "payment_transactions",
    indexes = [
        Index(name = "idx_payment_transactions_user_id", columnList = "user_id"),
        Index(name = "idx_payment_transactions_campaign_id", columnList = "campaign_id"),
        Index(name = "idx_payment_transactions_status", columnList = "status"),
        Index(name = "idx_payment_transactions_processed_at", columnList = "processed_at")
    ]
)
class PaymentTransaction(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,
    
    @Column(name = "user_id", nullable = false)
    val userId: UUID = UUID.randomUUID(),
    
    @Column(name = "campaign_id", nullable = true)
    val campaignId: UUID? = null,
    
    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    val amount: BigDecimal = BigDecimal.ZERO,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    val status: PaymentStatus = PaymentStatus.COMPLETED,
    
    @Column(name = "transaction_type", nullable = false)
    val transactionType: String = "CAMPAIGN_JOIN",
    
    @Column(name = "processed_at", nullable = false)
    val processedAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "mock_card_last_four")
    val mockCardLastFour: String? = null,
    
    @Enumerated(EnumType.STRING)
    @Column(name = "simulation_scenario")
    val simulationScenario: PaymentScenario? = null,
    
    @Column(name = "related_user_id", nullable = true)
    val relatedUserId: UUID? = null,
    
    @Column(name = "is_credit", nullable = false, columnDefinition = "boolean default false")
    val isCredit: Boolean = false,

    @Column(name = "academic_disclaimer", nullable = false)
    val academicDisclaimer: String = "MOCK_TRANSACTION_FOR_ACADEMIC_PURPOSES_ONLY"
)
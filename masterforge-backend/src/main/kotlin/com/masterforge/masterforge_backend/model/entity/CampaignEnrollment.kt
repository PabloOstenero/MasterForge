package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.UUID

/**
 * Represents a user's enrollment in a campaign.
 * This entity tracks when users join campaigns and links to payment transactions for paid campaigns.
 */
@Entity
@Table(
    name = "campaign_enrollments",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["campaign_id", "user_id"])
    ],
    indexes = [
        Index(name = "idx_campaign_enrollments_campaign_id", columnList = "campaign_id"),
        Index(name = "idx_campaign_enrollments_user_id", columnList = "user_id"),
        Index(name = "idx_campaign_enrollments_enrolled_at", columnList = "enrolled_at")
    ]
)
data class CampaignEnrollment(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign,
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,
    
    @Column(name = "enrolled_at", nullable = false)
    val enrolledAt: LocalDateTime = LocalDateTime.now(),
    
    @Column(name = "payment_transaction_id")
    val paymentTransactionId: UUID? = null
)
package com.masterforge.masterforge_backend.model.entity

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.persistence.*
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

/**
 * Represents a single game session within a campaign.
 */
@Entity
@Table(name = "sessions")
@JsonIgnoreProperties(ignoreUnknown = true, value = ["hibernateLazyInitializer", "handler"])
data class Session(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "scheduled_date", nullable = false)
    val scheduledDate: Timestamp,

    @Column(nullable = false)
    val price: BigDecimal,

    // The campaign this session belongs to.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign
)
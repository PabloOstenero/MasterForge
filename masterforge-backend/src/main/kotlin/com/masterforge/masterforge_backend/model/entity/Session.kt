package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

@Entity
@Table(name = "sessions")
data class Session(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(name = "scheduled_date", nullable = false)
    val scheduledDate: Timestamp,

    @Column(nullable = false)
    val price: BigDecimal,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign
)
package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

import com.masterforge.masterforge_backend.model.entity.Campaign

@Entity
@Table(name = "sessions")
data class Session(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign,

    @Column(nullable = false)
    val scheduledDate: LocalDateTime,

    @Column(nullable = false)
    val price: BigDecimal
)

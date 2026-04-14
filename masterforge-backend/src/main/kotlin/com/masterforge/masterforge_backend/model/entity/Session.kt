package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(name = "sessions")
data class Session(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val campaignId: UUID,

    @Column(nullable = false)
    val scheduledDate: LocalDateTime,

    @Column(nullable = false)
    val price: BigDecimal
)

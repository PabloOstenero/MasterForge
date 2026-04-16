package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "monsters")
data class Monster(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val name: String,

    @Column(name = "challenge_rating", nullable = false)
    val challengeRating: BigDecimal,

    @Column(name = "stats_data", columnDefinition = "jsonb", nullable = false)
    val statsData: String, // JSONB

    // Relaciones
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    val author: User
)

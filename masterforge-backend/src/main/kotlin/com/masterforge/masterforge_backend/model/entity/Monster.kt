package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

/**
 * Represents a monster, which can be official (system-owned)
 * or homebrew (created by a user).
 */
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
    val statsData: String, // Represents the monster's stat block as a JSON object

    /**
     * The author of the monster. If null, it is considered a system-provided (official) monster.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
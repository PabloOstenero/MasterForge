package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

/**
 * Represents a campaign, which is a container for game sessions and characters.
 * Each campaign is owned by a single user (the Game Master).
 */
@Entity
@Table(name = "campaigns")
data class Campaign(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val description: String,

    // Each campaign must have a single user as its owner (Game Master).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    val owner: User
)
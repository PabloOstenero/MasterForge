package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

/**
 * Tracks homebrew content that a user has acquired/bought.
 */
@Entity
@Table(
    name = "homebrew_collections",
    uniqueConstraints = [
        UniqueConstraint(columnNames = ["user_id", "content_type", "content_id"])
    ]
)
data class HomebrewCollection(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(name = "content_type", nullable = false)
    val contentType: String, // CLASS, SUBCLASS, RACE, MONSTER, SPELL, ITEM

    @Column(name = "content_id", nullable = false)
    val contentId: String // ID of the content (can be UUID or Int depending on the type)
)

package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "spells")
data class Spell(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val level: Int, // 0 for Cantrips, 1-9 for the rest

    @Column(nullable = false)
    val school: String, // Ex: "Evocation", "Nigromancy"

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    /**
     * The author of the class. If null, it is considered a system-provided (official) class.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
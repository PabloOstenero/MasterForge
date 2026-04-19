package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.util.UUID

@Entity
@Table(name = "items")
data class Item(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val type: String, // Ex: "Weapon", "Armor", "Potion"

    @Column(nullable = false)
    val weight: Double = 0.0,

    // Here we store specific things like the damage (1d8) or properties
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    val properties: Map<String, Any> = emptyMap(),

    /**
     * The author of the class. If null, it is considered a system-provided (official) class.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
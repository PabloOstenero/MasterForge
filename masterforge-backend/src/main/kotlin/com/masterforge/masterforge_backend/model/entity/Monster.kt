package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
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
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val type: String, // Ex: "Humanoid", "Dragon", "Undead"

    @Column(nullable = false)
    val size: String, // Small, Medium, Large, Giant

    // --- STATISTICS ---
    @Column(name = "armor_class", nullable = false) val armorClass: Int,
    @Column(name = "hit_points", nullable = false) val hitPoints: Int,
    @Column(nullable = false) val speed: String, // Ex: "30 ft., fly 60 ft."

    // Base atributes
    @Column(nullable = false) val str: Int,
    @Column(nullable = false) val dex: Int,
    @Column(nullable = false) val con: Int,
    @Column(nullable = false) val intStat: Int,
    @Column(nullable = false) val wis: Int,
    @Column(nullable = false) val cha: Int,

    @Column(name = "challenge_rating", nullable = false)
    val challengeRating: Double, // CR, ex: 0.25, 1.0, 15.0

    @Column(nullable = false)
    val xp: Int,

    // --- ACTION LIST ---
    // Here we store: Resistances, Inmunities, Actions, Attacks, Lair Actions...
    // Ex: {"actions": [{"name": "Claws", "desc": "Melee Attack..."}], "immunities": ["Fire", "Poison"]}
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "combat_mechanics", columnDefinition = "jsonb")
    val combatMechanics: Map<String, Any> = emptyMap(),

    /**
     * The author of the monster. If null, it is considered a system-provided (official) monster.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
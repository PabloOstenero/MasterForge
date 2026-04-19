package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

/**
 * Represents a Dungeons & Dragons race, which can be official (system-owned)
 * or homebrew (created by a user).
 */
@Entity
@Table(name = "dnd_races")
data class DndRace(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int = 0,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val price: BigDecimal,

    // --- Ability Score Bonuses ---
    @Column(name = "bonus_str", nullable = false)
    val bonusStr: Int,

    @Column(name = "bonus_dex", nullable = false)
    val bonusDex: Int,

    @Column(name = "bonus_con", nullable = false)
    val bonusCon: Int,

    @Column(name = "bonus_int", nullable = false)
    val bonusInt: Int,

    @Column(name = "bonus_wis", nullable = false)
    val bonusWis: Int,

    @Column(name = "bonus_cha", nullable = false)
    val bonusCha: Int,

    @OneToMany(mappedBy = "race", cascade = [CascadeType.ALL])
    val traits: MutableList<RaceTrait> = mutableListOf(),

    /**
     * The author of the race. If null, it is considered a system-provided (official) race.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
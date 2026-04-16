package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

/**
 * Represents a player's character in a campaign.
 */
@Entity
@Table(name = "characters")
data class Character(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val level: Int,

    @Column(name = "current_hp", nullable = false)
    val currentHp: Int,

    // --- Base Ability Scores ---
    @Column(name = "base_str", nullable = false)
    val baseStr: Int,

    @Column(name = "base_dex", nullable = false)
    val baseDex: Int,

    @Column(name = "base_con", nullable = false)
    val baseCon: Int,

    @Column(name = "base_int", nullable = false)
    val baseInt: Int,

    @Column(name = "base_wis", nullable = false)
    val baseWis: Int,

    @Column(name = "base_cha", nullable = false)
    val baseCha: Int,

    @Column(name = "skill_proficiencies", columnDefinition = "jsonb", nullable = false)
    val skillProficiencies: String, // Represents skill proficiencies as a JSON object

    // --- Relationships ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    val campaign: Campaign,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_race_id", nullable = false)
    val dndRace: DndRace,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_class_id", nullable = false)
    val dndClass: DndClass
)
package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
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

    @Column(name = "max_hp", nullable = false)
    val maxHp: Int,

    @Column(name = "current_hp", nullable = false)
    val currentHp: Int,

    @Column(name = "temp_hp", nullable = false)
    val tempHp: Int = 0,  // Temporary hit points

    @Column(name = "armor_class", nullable = false)
    val armorClass: Int = 10,

    @Column(nullable = false)
    val speed: Int = 30,  // Speed in feet

    @Column(name = "hit_dice_total", nullable = false)
    val hitDiceTotal: Int = 1,  // Total number of hit dice

    @Column(name = "hit_dice_spent", nullable = false)
    val hitDiceSpent: Int = 0,

    // --- BIOGRAPHY ---
    @Column(nullable = false)
    val background: String = "Héroe del Pueblo",

    @Column(nullable = false)
    val alignment: String = "Neutral",

    @Column(nullable = false)
    val xp: Int = 0,

    // --- ECONOMY ---
    @Column(nullable = false) val cp: Int = 0, // Copper
    @Column(nullable = false) val sp: Int = 0, // Silver
    @Column(nullable = false) val ep: Int = 0, // Electrum
    @Column(nullable = false) val gp: Int = 0, // Gold
    @Column(nullable = false) val pp: Int = 0, // Platinum

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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "skill_proficiencies", columnDefinition = "jsonb", nullable = false)
    val skillProficiencies: Map<String, Any> = emptyMap(),

    // ---Spell Slots ---
    // It will store something like this: {"level_1": {"max": 4, "available": 2}, "level_2": {"max": 2, "available": 2}}
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spell_slots", columnDefinition = "jsonb")
    val spellSlots: Map<String, Any> = emptyMap(),

    // --- Relationships ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = true)
    val campaign: Campaign? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_race_id", nullable = false)
    val dndRace: DndRace,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dnd_class_id", nullable = false)
    val dndClass: DndClass,

    // The subclass is optional because it's not selected at level 1
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subclass_id")
    val subclass: DndSubclass? = null,

    // Here we store the player choices when leveling up
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "choices_json", columnDefinition = "jsonb")
    val choicesJson: Map<String, Any> = emptyMap(),

    @OneToMany(mappedBy = "character", cascade = [CascadeType.ALL])
    val inventory: MutableList<InventorySlot> = mutableListOf()
)

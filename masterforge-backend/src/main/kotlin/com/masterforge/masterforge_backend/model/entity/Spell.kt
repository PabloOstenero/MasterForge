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

    @Column(name = "casting_time", nullable = false)
    val castingTime: String,

    @Column(nullable = false)
    val range: String,

    @Column(nullable = false)
    val duration: String,

    @Column(nullable = false)
    val verbal: Boolean = false,

    @Column(nullable = false)
    val somatic: Boolean = false,

    @Column(nullable = false)
    val material: Boolean = false,

    @Column(name = "material_component")
    val materialComponent: String? = null,

    @Column(nullable = false)
    val concentration: Boolean = false,

    @Column(nullable = false)
    val ritual: Boolean = false,

    @Column(name = "damage_types", length = 500)
    val damageTypes: String? = null,

    @Column(name = "saving_throw", length = 50)
    val savingThrow: String? = null,

    @Column(name = "spell_classes", length = 500)
    val spellClasses: String? = null,

    @Column(name = "higher_level_description", columnDefinition = "TEXT")
    val higherLevelDescription: String? = null,

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    /**
     * The author of the class. If null, it is considered a system-provided (official) spell.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null,
)

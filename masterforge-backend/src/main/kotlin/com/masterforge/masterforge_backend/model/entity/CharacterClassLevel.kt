package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import com.fasterxml.jackson.annotation.JsonIgnore

@Entity
@Table(name = "character_class_levels")
data class CharacterClassLevel(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    val character: Character,

    @ManyToOne(fetch = FetchType.EAGER) // Eager because we always need class details
    @JoinColumn(name = "dnd_class_id", nullable = false)
    val dndClass: DndClass,

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "subclass_id")
    val subclass: DndSubclass? = null,

    @Column(nullable = false)
    val level: Int
)

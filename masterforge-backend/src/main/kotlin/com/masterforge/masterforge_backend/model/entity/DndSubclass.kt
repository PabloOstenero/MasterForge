package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "dnd_subclasses")
data class DndSubclass(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String, // Ej: "Soldier", "Assasin", "Life Cleric"

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    // Every subclass MUST come from a class
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    val parentClass: DndClass,

    /**
     * The author of the class. If null, it is considered a system-provided (official) class.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
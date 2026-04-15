package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "dnd_classes")
data class DndClass(

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, name = "hit_die")
    val hitDie: Int,

    @Column(nullable = false, name = "saving_throws")
    val savingThrows: String
)

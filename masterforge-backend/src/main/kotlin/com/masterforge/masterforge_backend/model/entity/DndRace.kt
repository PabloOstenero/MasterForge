package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "dnd_races")
data class DndRace(

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val bonusDex: Int
)

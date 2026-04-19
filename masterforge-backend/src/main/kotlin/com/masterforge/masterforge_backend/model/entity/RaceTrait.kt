package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "race_traits")
data class RaceTrait(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    // It connects to the DndRace entity using a foreign key
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", nullable = false)
    val race: DndRace
)
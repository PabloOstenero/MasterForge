package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*

@Entity
@Table(name = "class_features")
data class ClassFeature(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    @Column(name = "level_required", nullable = false)
    val levelRequired: Int,

    // It connects to the DndClass entity using a foreign key
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    val dndClass: DndClass
)
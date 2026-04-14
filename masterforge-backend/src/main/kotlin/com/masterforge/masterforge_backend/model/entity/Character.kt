package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

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

    @Column(nullable = false)
    val currentHp: Int
)

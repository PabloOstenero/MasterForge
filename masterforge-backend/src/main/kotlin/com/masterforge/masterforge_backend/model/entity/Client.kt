package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "clients")
data class Client(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val gmId: UUID,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val email: String,

    @Column(nullable = false)
    val isActive: Boolean
)

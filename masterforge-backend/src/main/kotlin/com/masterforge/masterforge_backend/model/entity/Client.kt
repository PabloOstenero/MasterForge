package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

import com.masterforge.masterforge_backend.model.entity.User

@Entity
@Table(name = "clients")
data class Client(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val email: String,

    @Column(nullable = false)
    val isActive: Boolean
)

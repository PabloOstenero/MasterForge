package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

@Entity
@Table(name = "users")
data class User(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false, unique = true)
    val email: String,

    @Column(nullable = false, name = "password_hash")
    val passwordHash: String,

    @Column(nullable = false, name = "subscription_tier")
    val subscriptionTier: String = "FREE"
)
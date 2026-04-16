package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID = UUID.randomUUID(),

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, unique = true)
    val email: String,

    @Column(name = "password_hash", nullable = false)
    val passwordHash: String,

    @Column(name = "subscription_tier", nullable = false)
    val subscriptionTier: String = "FREE",

    @Column(nullable = false)
    val balance: BigDecimal = BigDecimal.ZERO,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true
)
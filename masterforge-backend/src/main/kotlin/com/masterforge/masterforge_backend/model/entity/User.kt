package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.util.UUID

import com.masterforge.masterforge_backend.model.entity.Client
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Monster

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
    val subscriptionTier: String = "FREE",

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val clients: MutableList<Client> = mutableListOf(),

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val campaigns: MutableList<Campaign> = mutableListOf(),

    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val monsters: MutableList<Monster> = mutableListOf()
)
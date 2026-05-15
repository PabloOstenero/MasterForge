package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import com.fasterxml.jackson.annotation.JsonIgnore
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * Represents a user of the application. A user can be a Game Master, a player,
 * or a content creator.
 */
@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false, unique = true)
    var email: String = "",

    @JsonIgnore
    @Column(name = "password_hash", nullable = false)
    var passwordHash: String = "",

    @Column(name = "subscription_tier", nullable = false)
    var subscriptionTier: String = "FREE",

    @Column(name = "subscription_expires_at")
    var subscriptionExpiresAt: LocalDateTime? = null,

    @Column(nullable = false)
    var balance: BigDecimal = BigDecimal.ZERO,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @JsonIgnore
    @OneToMany(mappedBy = "user", cascade = [CascadeType.ALL], fetch = FetchType.LAZY)
    val characters: MutableList<Character> = mutableListOf(),

    @JsonIgnore
    @Column(name = "two_factor_secret")
    var twoFactorSecret: String? = null,

    @Column(name = "is_2fa_enabled", nullable = false, columnDefinition = "boolean default false")
    var is2faEnabled: Boolean = false,

    @Column(name = "session_notifications", nullable = false, columnDefinition = "boolean default true")
    var sessionNotifications: Boolean = true,

    @JsonIgnore
    @ElementCollection
    @CollectionTable(name = "user_recovery_codes", joinColumns = [JoinColumn(name = "user_id")])
    @Column(name = "recovery_code")
    val recoveryCodes: MutableList<String> = mutableListOf(),

    @JsonIgnore
    @ElementCollection
    @CollectionTable(name = "user_fcm_tokens", joinColumns = [JoinColumn(name = "user_id")])
    @Column(name = "fcm_token")
    val fcmTokens: MutableSet<String> = mutableSetOf(),

    @JsonIgnore
    @Column(name = "discord_id", unique = true)
    var discordId: String? = null,

    @Column(name = "discord_username")
    var discordUsername: String? = null
) {
    /**
     * Checks if the user has an active Pro subscription.
     * Returns true if tier is PRO and it hasn't expired yet.
     */
    fun isPro(): Boolean {
        if (subscriptionTier != "PRO") return false
        val expiry = subscriptionExpiresAt ?: return false
        return expiry.isAfter(LocalDateTime.now())
    }
}

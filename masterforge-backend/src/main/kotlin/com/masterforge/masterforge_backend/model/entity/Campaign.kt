package com.masterforge.masterforge_backend.model.entity

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.math.BigDecimal
import java.util.UUID

/**
 * Represents a campaign, which is a container for game sessions and characters.
 * Each campaign is owned by a single user (the Game Master).
 */
@JsonIgnoreProperties(ignoreUnknown = true, value = ["hibernateLazyInitializer", "handler"])
@Entity
@Table(name = "campaigns")
data class Campaign(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false)
    val description: String,

    // Each campaign must have a single user as its owner (Game Master).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    val owner: User,

    @Column(name = "max_players", nullable = false)
    val maxPlayers: Int,

    @Column(name = "join_price", nullable = false, precision = 10, scale = 2)
    val joinPrice: BigDecimal,

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    val visibility: CampaignVisibility,

    @Column(name = "enrollment_closed", nullable = false, columnDefinition = "boolean default false")
    val enrollmentClosed: Boolean = false,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "combat_state", columnDefinition = "jsonb")
    val combatState: Map<String, Any>? = null
)
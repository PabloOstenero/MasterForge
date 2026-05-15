package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import com.fasterxml.jackson.annotation.JsonIgnore
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.math.BigDecimal
import java.util.UUID

/**
 * Represents a Dungeons & Dragons race, which can be official (system-owned)
 * or homebrew (created by a user).
 */
@Entity
@Table(name = "dnd_races")
data class DndRace(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int = 0,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = true)
    val price: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = true)
    val size: String? = null,

    @Column(nullable = true, columnDefinition = "TEXT")
    val description: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "race_features", columnDefinition = "jsonb")
    val raceFeatures: Map<String, Any>? = emptyMap(),

    @JsonIgnore
    @OneToMany(mappedBy = "race", cascade = [CascadeType.ALL])
    val traits: MutableList<RaceTrait> = mutableListOf(),

    /**
     * The author of the race. If null, it is considered a system-provided (official) race.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
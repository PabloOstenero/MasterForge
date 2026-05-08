package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import com.fasterxml.jackson.annotation.JsonIgnore
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.math.BigDecimal

/**
 * Represents a Dungeons & Dragons class, which can be official (system-owned)
 * or homebrew (created by a user).
 */
@Entity
@Table(name = "dnd_classes")
data class DndClass(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int = 0,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = true, columnDefinition = "TEXT")
    val description: String? = null,

    @Column(nullable = false)
    val price: BigDecimal,

    @Column(name = "hit_die", nullable = false)
    val hitDie: Int,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "saving_throws", columnDefinition = "jsonb", nullable = false)
    val savingThrows: Map<String, Any> = emptyMap(),

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "class_features", columnDefinition = "jsonb", nullable = true)
    val classFeatures: Map<String, Any>? = null,

    @OneToMany(mappedBy = "dndClass", cascade = [CascadeType.ALL])
    val features: MutableList<ClassFeature> = mutableListOf(),

    @JsonIgnore
    @OneToMany(mappedBy = "parentClass", cascade = [CascadeType.ALL])
    val subclasses: MutableList<DndSubclass> = mutableListOf(),

    /**
     * The author of the class. If null, it is considered a system-provided (official) class.
     * If a user is specified, it is considered homebrew content.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null
)
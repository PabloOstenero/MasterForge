package com.masterforge.masterforge_backend.model.entity


import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

@Entity
@Table(name = "dnd_subclasses")
data class DndSubclass(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Int? = null,

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    val description: String,

    // Every subclass MUST come from a class
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    val parentClass: DndClass,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    val author: User? = null,

    @OneToMany(mappedBy = "dndSubclass", cascade = [CascadeType.ALL])
    val features: MutableList<ClassFeature> = mutableListOf(),

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "subclass_features", columnDefinition = "jsonb", nullable = true)
    val subclassFeatures: Map<String, Any>? = null
)
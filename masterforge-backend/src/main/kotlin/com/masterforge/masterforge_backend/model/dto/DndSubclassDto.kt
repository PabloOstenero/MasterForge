package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class DndSubclassDto(
    val id: Int?,
    val name: String,
    val description: String,
    val price: java.math.BigDecimal? = null,
    val parentClassId: Int,
    val authorId: java.util.UUID?,
    val subclassFeatures: Map<String, Any>? = null, // Deprecated
    val features: List<ClassFeatureDto>? = null
)

package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class DndClassDto(
    val name: String,
    val description: String? = null,
    val price: BigDecimal,
    val hitDie: Int,
    val savingThrows: Map<String, Any>,
    val classFeatures: Map<String, Any>? = null,
    val authorId: UUID? = null
)

package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class DndClassDto(
    val name: String,
    val price: BigDecimal,
    val hitDie: Int,
    val savingThrows: String,
    val authorId: UUID? = null
)
package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class MonsterDto(
    val name: String,
    val challengeRating: BigDecimal,
    val statsData: String, // JSONB
    val authorId: UUID? = null
)
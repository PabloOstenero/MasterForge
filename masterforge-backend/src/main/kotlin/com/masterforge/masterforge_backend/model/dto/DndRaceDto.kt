package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class DndRaceDto(
    val name: String,
    val price: BigDecimal,
    val description: String? = null,
    val size: String? = null,
    val raceFeatures: Map<String, Any>? = null,
    val authorId: UUID? = null,
    val isOfficial: Boolean? = null
)
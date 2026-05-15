package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal

data class RaceTraitSummary(
    val id: Int,
    val name: String,
    val description: String,
    val levelRequired: Int = 1,
    val options: Map<String, Any>? = null,
    val properties: Map<String, Any>? = null
)

data class DndRaceResponseDto(
    val id: Int,
    val name: String,
    val price: BigDecimal,
    val description: String?,
    val size: String?,
    val raceFeatures: Map<String, Any>,
    val traits: List<RaceTraitSummary>
)

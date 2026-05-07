package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal

data class RaceTraitSummary(
    val id: Int,
    val name: String,
    val description: String
)

data class DndRaceResponseDto(
    val id: Int,
    val name: String,
    val price: BigDecimal,
    val description: String?,
    val size: String?,
    val bonusStr: Int,
    val bonusDex: Int,
    val bonusCon: Int,
    val bonusInt: Int,
    val bonusWis: Int,
    val bonusCha: Int,
    val raceFeatures: Map<String, Any>,
    val traits: List<RaceTraitSummary>
)

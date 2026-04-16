package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class DndRaceDto(
    val name: String,
    val price: BigDecimal,
    val bonusStr: Int,
    val bonusDex: Int,
    val bonusCon: Int,
    val bonusInt: Int,
    val bonusWis: Int,
    val bonusCha: Int,
    val authorId: UUID? = null
)
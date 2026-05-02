package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class CampaignDto(
    val name: String,
    val description: String,
    val ownerId: UUID,
    val maxPlayers: Int,
    val joinPrice: BigDecimal,
    val visibility: String
)

package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class PlayerCampaignSummaryDto(
    val campaignId: UUID,
    val campaignName: String,
    val dmName: String,
    val nextSessionDate: String?   // ISO-8601, null si no hay sesiones futuras
)

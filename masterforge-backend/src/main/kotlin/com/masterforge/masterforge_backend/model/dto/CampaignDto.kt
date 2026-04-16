package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CampaignDto(
    val name: String,
    val description: String,
    val ownerId: UUID
)

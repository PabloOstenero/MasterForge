package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CampaignPlayerDto(
    val id: UUID,
    val name: String,
    val email: String,
    val subscriptionTier: String,
    val discordUsername: String? = null,
    val characters: List<CharacterSimpleDto>
)

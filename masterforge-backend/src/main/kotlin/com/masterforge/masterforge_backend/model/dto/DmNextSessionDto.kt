package com.masterforge.masterforge_backend.model.dto

data class DmNextSessionDto(
    val nextSessionDate: String?,   // ISO 8601 or null
    val campaignId: String?         // UUID string or null
)

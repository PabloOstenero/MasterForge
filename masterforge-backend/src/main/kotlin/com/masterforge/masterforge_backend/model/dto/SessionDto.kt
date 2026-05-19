package com.masterforge.masterforge_backend.model.dto

import java.sql.Timestamp
import java.util.UUID

data class SessionDto(
    val name: String,
    val scheduledDate: Timestamp,
    val campaignId: UUID
)

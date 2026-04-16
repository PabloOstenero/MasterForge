package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.sql.Timestamp
import java.util.UUID

data class SessionDto(
    val scheduledDate: Timestamp,
    val price: BigDecimal,
    val campaignId: UUID
)

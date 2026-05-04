package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal
import java.util.UUID

data class SessionSummaryDto(
    val id: UUID,
    val name: String,
    val scheduledDate: String,   // ISO-8601 formatted from Timestamp
    val price: BigDecimal
)

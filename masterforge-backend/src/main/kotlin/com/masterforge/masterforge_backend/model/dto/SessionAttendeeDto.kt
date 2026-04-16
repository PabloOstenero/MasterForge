package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class SessionAttendeeDto(
    val sessionId: UUID,
    val userId: UUID,
    val hasPaid: Boolean
)

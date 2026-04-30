package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CharacterSummaryDto(
    val id: UUID,
    val name: String,
    val level: Int,
    val dndClass: String,
    val dndRace: String,
    val subclass: String? = null
)

package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class ItemDto(
    val id: UUID?,
    val name: String,
    val type: String,
    val weight: Double,
    val properties: Map<String, Any>,
    val authorId: UUID?
)

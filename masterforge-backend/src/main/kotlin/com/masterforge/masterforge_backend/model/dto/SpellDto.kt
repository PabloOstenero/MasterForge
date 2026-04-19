package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class SpellDto(
    val id: UUID?,
    val name: String,
    val level: Int,
    val school: String,
    val description: String,
    val authorId: UUID?
)

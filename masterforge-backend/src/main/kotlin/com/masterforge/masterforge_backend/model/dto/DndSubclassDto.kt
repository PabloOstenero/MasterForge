package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class DndSubclassDto(
    val id: Int?,
    val name: String,
    val description: String,
    val parentClassId: Int,
    val authorId: UUID?
)

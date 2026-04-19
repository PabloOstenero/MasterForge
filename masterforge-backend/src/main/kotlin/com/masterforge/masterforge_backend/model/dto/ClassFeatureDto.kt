package com.masterforge.masterforge_backend.model.dto

data class ClassFeatureDto(
    val id: Int?,
    val name: String,
    val description: String,
    val levelRequired: Int,
    val dndClassId: Int
)

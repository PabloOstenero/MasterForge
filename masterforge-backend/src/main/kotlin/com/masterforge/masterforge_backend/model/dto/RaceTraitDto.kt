package com.masterforge.masterforge_backend.model.dto

data class RaceTraitDto(
    val id: Int?,
    val name: String,
    val description: String,
    val levelRequired: Int = 1,
    val raceId: Int,
    val options: Map<String, Any>? = null,
    val properties: Map<String, Any>? = null
)

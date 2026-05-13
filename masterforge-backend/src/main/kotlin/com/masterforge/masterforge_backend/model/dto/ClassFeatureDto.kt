package com.masterforge.masterforge_backend.model.dto

data class ClassFeatureDto(
    val id: Int?,
    val name: String,
    val description: String,
    val levelRequired: Int,
    val dndClassId: Int? = null,
    val subclassId: Int? = null,
    val options: Map<String, Any>? = null,
    val properties: Map<String, Any>? = null
)

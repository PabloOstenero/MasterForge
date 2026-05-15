package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class ItemDto(
    val id: java.util.UUID?,
    val name: String,
    val price: java.math.BigDecimal? = null,
    val type: String,
    val weight: Double,
    val properties: Map<String, Any>? = null,
    val authorId: java.util.UUID?
)

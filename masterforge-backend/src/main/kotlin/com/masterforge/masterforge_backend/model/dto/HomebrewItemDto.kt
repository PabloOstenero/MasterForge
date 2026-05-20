package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.math.BigDecimal

data class HomebrewItemDto(
    val id: String,
    val name: String,
    val authorName: String,
    val contentType: String,
    val price: BigDecimal = BigDecimal.ZERO,
    @get:JsonProperty("isOwned")
    val isOwned: Boolean = false,
    val description: String? = null
)

package com.masterforge.masterforge_backend.model.dto

import java.math.BigDecimal

data class UserDto(
    val name: String,
    val email: String,
    val passwordHash: String,
    val subscriptionTier: String,
    val balance: BigDecimal,
    val isActive: Boolean,
    val characters: List<CharacterDto> = emptyList()
)

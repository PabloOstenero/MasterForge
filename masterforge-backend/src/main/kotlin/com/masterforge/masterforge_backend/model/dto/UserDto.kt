package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonSetter
import com.fasterxml.jackson.annotation.Nulls
import java.math.BigDecimal

data class UserDto(
    val name: String,
    val email: String,
    val passwordHash: String,
    val subscriptionTier: String,
    val balance: BigDecimal,
    val isActive: Boolean,
    @JsonSetter(nulls = Nulls.AS_EMPTY)
    val characters: List<CharacterDto> = emptyList()
)

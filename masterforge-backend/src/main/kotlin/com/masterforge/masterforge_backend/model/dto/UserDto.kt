package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonSetter
import com.fasterxml.jackson.annotation.Nulls
import java.math.BigDecimal

data class UserDto(
    val name: String? = null,
    val email: String? = null,
    val passwordHash: String? = null,
    val currentPassword: String? = null,
    val subscriptionTier: String? = null,
    val balance: BigDecimal? = null,
    val isActive: Boolean? = null,
    @JsonSetter(nulls = Nulls.AS_EMPTY)
    val characters: List<CharacterDto>? = emptyList()
)

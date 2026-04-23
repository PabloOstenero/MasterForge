package com.masterforge.masterforge_backend.model.dto

import com.masterforge.masterforge_backend.model.entity.User
import java.math.BigDecimal
import java.util.UUID

data class CharacterSimpleDto(
    val id: UUID,
    val name: String,
    val level: Int,
    val dndClass: String,
    val dndRace: String
)

data class UserResponseDto(
    val id: UUID,
    val name: String,
    val email: String,
    val subscriptionTier: String,
    val balance: BigDecimal,
    val isActive: Boolean,
    val characters: List<CharacterSimpleDto>
) {
    companion object {
        fun fromEntity(user: User): UserResponseDto {
            return UserResponseDto(
                id = user.id!!,
                name = user.name,
                email = user.email,
                subscriptionTier = user.subscriptionTier.toString(),
                balance = user.balance,
                isActive = user.isActive,
                characters = user.characters.map {
                    CharacterSimpleDto(
                        id = it.id!!,
                        name = it.name,
                        level = it.level,
                        dndClass = it.dndClass.name,
                        dndRace = it.dndRace.name
                    )
                }
            )
        }
    }
}
package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
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
    @get:JsonProperty("isActive")
    val isActive: Boolean,
    @get:JsonProperty("is2faEnabled")
    val is2faEnabled: Boolean,
    @get:JsonProperty("sessionNotifications")
    val sessionNotifications: Boolean,
    val recoveryCodes: List<String> = emptyList(),
    val characters: List<CharacterSimpleDto>,
    val discordId: String? = null,
    val discordUsername: String? = null,
    @get:JsonProperty("subscriptionExpiresAt")
    val subscriptionExpiresAt: String? = null
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
                is2faEnabled = user.is2faEnabled,
                sessionNotifications = user.sessionNotifications,
                recoveryCodes = user.recoveryCodes,
                characters = user.characters.map {
                    CharacterSimpleDto(
                        id = it.id!!,
                        name = it.name,
                        level = it.level,
                        dndClass = it.dndClass.name,
                        dndRace = it.dndRace.name
                    )
                },
                discordId = user.discordId,
                discordUsername = user.discordUsername,
                subscriptionExpiresAt = user.subscriptionExpiresAt?.toString()
            )
        }
    }
}
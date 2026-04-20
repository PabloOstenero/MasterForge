package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class InventorySlotDto(
    val id: Int?,
    val characterId: UUID,
    val itemId: UUID,
    val quantity: Int,
    val isEquipped: Boolean,
    val isAttuned: Boolean
)

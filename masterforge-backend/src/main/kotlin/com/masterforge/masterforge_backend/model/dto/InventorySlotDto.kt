package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class InventorySlotDto(
    val characterId: UUID,
    val item: ItemRef,
    val quantity: Int,
    val isEquipped: Boolean = false,
    val isAttuned: Boolean = false
) {
    // Helper property to maintain compatibility with existing InventorySlotController logic
    val itemId: UUID get() = item.id
}

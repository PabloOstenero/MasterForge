package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.util.UUID

data class CharacterDto(
    val name: String,
    val level: Int,
    val maxHp: Int,
    val currentHp: Int,
    val tempHp: Int = 0,
    val armorClass: Int = 10,
    val speed: Int = 30,
    val hitDiceTotal: Int = 1,
    val hitDiceSpent: Int = 0,
    val background: String,
    val alignment: String,
    val xp: Int = 0,
    val cp: Int = 0,
    val sp: Int = 0,
    val ep: Int = 0,
    val gp: Int = 0,
    val pp: Int = 0,
    val baseStr: Int,
    val baseDex: Int,
    val baseCon: Int,
    val baseInt: Int,
    val baseWis: Int,
    val baseCha: Int,
    val skillProficiencies: Map<String, Any> = emptyMap(),
    val spellSlots: Map<String, Any> = emptyMap(),
    
    // Support for the nested object structure sent in JSON
    val user: UserRef,
    
    @JsonProperty("race")
    val dndRace: RaceRef,
    
    val dndClass: ClassRef,
    
    // Campaign is mandatory in Entity, so it must be here too.
    val campaign: CampaignRef? = null,
    
    val subclassId: Int? = null, // For requests, we send the ID
    val choicesJson: Map<String, Any> = emptyMap(),

    val inventory: List<InventorySlotRequestDto> = emptyList() // Use Request DTO for input
)

data class UserRef(val id: UUID)
data class RaceRef(val id: Int)
data class ClassRef(val id: Int)
data class CampaignRef(val id: UUID)

// DTO for Item within InventorySlotRequestDto (for requests)
data class ItemRequestDto(
    val id: UUID,
    val name: String,
    val type: String,
    val weight: Double,
    val properties: Map<String, Any> = emptyMap()
)

// DTO for InventorySlot in CharacterDto (for requests)
data class InventorySlotRequestDto(
    val id: Long? = null, // Optional for new slots, used for updates
    val item: ItemRequestDto, // Now expects a full ItemRequestDto
    val quantity: Int,
    val attuned: Boolean,
    val equipped: Boolean
)

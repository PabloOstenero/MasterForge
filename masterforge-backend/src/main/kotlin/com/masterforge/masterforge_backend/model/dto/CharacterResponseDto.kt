package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.InventorySlot
import com.masterforge.masterforge_backend.model.entity.Item
import java.util.UUID

// Simplified DTO for User in Character response to avoid recursion
data class UserSimpleDto(
    val id: UUID,
    val name: String,
    val email: String
)

// DTO for DndRace in Character response
data class DndRaceResponseDto(
    val id: Int,
    val name: String,
    val bonusStr: Int,
    val bonusDex: Int,
    val bonusCon: Int,
    val bonusInt: Int,
    val bonusWis: Int,
    val bonusCha: Int
    // Add other fields from DndRace entity as needed, e.g., traits, author, price
) {
    companion object {
        fun fromEntity(race: DndRace): DndRaceResponseDto {
            return DndRaceResponseDto(
                id = race.id!!,
                name = race.name,
                bonusStr = race.bonusStr,
                bonusDex = race.bonusDex,
                bonusCon = race.bonusCon,
                bonusInt = race.bonusInt,
                bonusWis = race.bonusWis,
                bonusCha = race.bonusCha
            )
        }
    }
}

// DTO for DndClass in Character response
data class DndClassResponseDto(
    val id: Int,
    val name: String,
    val hitDie: Int,
    val savingThrows: Map<String, Any>
    // Add other fields from DndClass entity as needed, e.g., features, subclasses, author, price
) {
    companion object {
        fun fromEntity(dndClass: DndClass): DndClassResponseDto {
            return DndClassResponseDto(
                id = dndClass.id!!,
                name = dndClass.name,
                hitDie = dndClass.hitDie,
                savingThrows = dndClass.savingThrows
            )
        }
    }
}

// DTO for Item in InventorySlot response
data class ItemResponseDto(
    val id: UUID,
    val name: String,
    val type: String,
    val weight: Double,
    val properties: Map<String, Any> = emptyMap()
    // Add other fields from Item entity as needed
) {
    companion object {
        fun fromEntity(item: Item): ItemResponseDto {
            return ItemResponseDto(
                id = item.id!!,
                name = item.name,
                type = item.type,
                weight = item.weight,
                properties = item.properties
            )
        }
    }
}

// DTO for InventorySlot in Character response
data class InventorySlotResponseDto(
    val id: Int,
    val item: ItemResponseDto,
    val quantity: Int,
    val attuned: Boolean,
    val equipped: Boolean
) {
    companion object {
        fun fromEntity(slot: InventorySlot): InventorySlotResponseDto {
            return InventorySlotResponseDto(
                id = slot.id!!,
                item = ItemResponseDto.fromEntity(slot.item),
                quantity = slot.quantity,
                attuned = slot.isAttuned,
                equipped = slot.isEquipped
            )
        }
    }
}

data class CharacterResponseDto(
    val id: UUID,
    val name: String,
    val level: Int,
    val maxHp: Int,
    val currentHp: Int,
    val tempHp: Int,
    val speed: Int,
    val hitDiceTotal: Int,
    val hitDiceSpent: Int,
    val background: String,
    val alignment: String,
    val xp: Int,
    val cp: Int,
    val sp: Int,
    val ep: Int,
    val gp: Int,
    val pp: Int,
    val baseStr: Int,
    val baseDex: Int,
    val baseCon: Int,
    val baseInt: Int,
    val baseWis: Int,
    val baseCha: Int,
    val savingThrowsProficiencies: Map<String, Any>,
    val skillProficiencies: Map<String, Any>,
    val spellSlots: Map<String, Any>,
    val user: UserSimpleDto,
    @JsonProperty("dndRace")
    val dndRace: DndRaceResponseDto,
    @JsonProperty("dndClass")
    val dndClass: DndClassResponseDto,
    val campaign: CampaignRef? = null,
    val subclass: ClassRef? = null, // User's output JSON has "subclass": null
    val choicesJson: Map<String, Any>,
    val inventory: List<InventorySlotResponseDto>
) {
    companion object {
        fun fromEntity(character: Character): CharacterResponseDto {
            val userSimpleDto = UserSimpleDto(
                id = character.user.id!!,
                name = character.user.name,
                email = character.user.email
            )

            return CharacterResponseDto(
                id = character.id!!,
                name = character.name,
                level = character.level,
                maxHp = character.maxHp,
                currentHp = character.currentHp,
                tempHp = character.tempHp,
                speed = character.speed,
                hitDiceTotal = character.hitDiceTotal,
                hitDiceSpent = character.hitDiceSpent,
                background = character.background,
                alignment = character.alignment,
                xp = character.xp,
                cp = character.cp,
                sp = character.sp,
                ep = character.ep,
                gp = character.gp,
                pp = character.pp,
                baseStr = character.baseStr,
                baseDex = character.baseDex,
                baseCon = character.baseCon,
                baseInt = character.baseInt,
                baseWis = character.baseWis,
                baseCha = character.baseCha,
                savingThrowsProficiencies = character.savingThrowsProficiencies,
                skillProficiencies = character.skillProficiencies,
                spellSlots = character.spellSlots,
                user = userSimpleDto,
                dndRace = DndRaceResponseDto.fromEntity(character.dndRace),
                dndClass = DndClassResponseDto.fromEntity(character.dndClass),
                campaign = character.campaign?.let { CampaignRef(it.id!!) },
                subclass = character.subclass?.let { ClassRef(it.id!!) }, // Map subclass to ClassRef if not null
                choicesJson = character.choicesJson,
                inventory = character.inventory.map { InventorySlotResponseDto.fromEntity(it) }
            )
        }
    }
}
package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.masterforge.masterforge_backend.model.entity.*
import java.util.UUID

// Simplified DTO for User in Character response to avoid recursion
data class UserSimpleDto(
    val id: UUID,
    val name: String,
    val email: String
)

// DTO for DndRace in Character response (minimal summary)
data class DndRaceSummaryDto(
    val id: Int,
    val name: String,
    val bonusStr: Int,
    val bonusDex: Int,
    val bonusCon: Int,
    val bonusInt: Int,
    val bonusWis: Int,
    val bonusCha: Int,
    val traits: List<RaceTraitDto> = emptyList(),
    val raceFeatures: Map<String, Any> = emptyMap()
    // Add other fields from DndRace entity as needed, e.g., traits, author, price
) {
    companion object {
        fun fromEntity(race: DndRace): DndRaceSummaryDto {
            return DndRaceSummaryDto(
                id = race.id!!,
                name = race.name,
                bonusStr = race.bonusStr,
                bonusDex = race.bonusDex,
                bonusCon = race.bonusCon,
                bonusInt = race.bonusInt,
                bonusWis = race.bonusWis,
                bonusCha = race.bonusCha,
                traits = race.traits.map {
                    RaceTraitDto(
                        id = it.id,
                        name = it.name,
                        description = it.description,
                        levelRequired = it.levelRequired,
                        raceId = race.id!!,
                        options = it.options,
                        properties = it.properties
                    )
                },
                raceFeatures = race.raceFeatures ?: emptyMap()
            )
        }
    }
}

data class CharacterSpellResponseDto(
    val id: Int?,
    val spell: SpellDto,
    @JsonProperty("isPrepared")
    val isPrepared: Boolean
) {
    companion object {
        fun fromEntity(characterSpell: CharacterSpell): CharacterSpellResponseDto {
            val s = characterSpell.spell
            val spellDto = SpellDto(
                id = s.id,
                name = s.name,
                level = s.level,
                school = s.school,
                castingTime = s.castingTime,
                range = s.range,
                duration = s.duration,
                verbal = s.verbal,
                somatic = s.somatic,
                material = s.material,
                materialComponent = s.materialComponent,
                concentration = s.concentration,
                ritual = s.ritual,
                damageTypes = s.damageTypes?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() },
                savingThrow = s.savingThrow,
                spellClasses = s.spellClasses?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() },
                higherLevelDescription = s.higherLevelDescription,
                description = s.description,
                authorId = s.author?.id
            )
            return CharacterSpellResponseDto(
                id = characterSpell.id,
                spell = spellDto,
                isPrepared = characterSpell.isPrepared
            )
        }
    }
}

// DTO for DndClass in Character response
data class DndClassResponseDto(
    val id: Int,
    val name: String,
    val hitDie: Int,
    val savingThrows: Map<String, Any>,
    val features: List<ClassFeatureDto> = emptyList(),
    val classFeatures: Map<String, Any> = emptyMap()
) {
    companion object {
        fun fromEntity(dndClass: DndClass, characterLevel: Int): DndClassResponseDto {
            return DndClassResponseDto(
                id = dndClass.id!!,
                name = dndClass.name,
                hitDie = dndClass.hitDie,
                savingThrows = dndClass.savingThrows ?: emptyMap(),
                features = dndClass.features
                    .map { ClassFeatureDto(it.id, it.name, it.description, it.levelRequired, dndClass.id!!, it.options, it.properties) },
                classFeatures = dndClass.classFeatures ?: emptyMap()
            )
        }
    }
}

data class SubclassResponseDto(
    val id: Int,
    val name: String,
    val subclassFeatures: Map<String, Any> = emptyMap()
) {
    companion object {
        fun fromEntity(subclass: DndSubclass, characterLevel: Int): SubclassResponseDto {
            // Return all subclass features without filtering by level
            return SubclassResponseDto(
                id = subclass.id!!,
                name = subclass.name,
                subclassFeatures = subclass.subclassFeatures ?: emptyMap()
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
                properties = item.properties ?: emptyMap()
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

data class CharacterClassLevelResponseDto(
    val dndClass: DndClassResponseDto,
    val subclass: SubclassResponseDto? = null,
    val level: Int
) {
    companion object {
        fun fromEntity(entity: CharacterClassLevel): CharacterClassLevelResponseDto {
            return CharacterClassLevelResponseDto(
                dndClass = DndClassResponseDto.fromEntity(entity.dndClass, entity.level),
                subclass = entity.subclass?.let { SubclassResponseDto.fromEntity(it, entity.level) },
                level = entity.level
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
    val bonusMaxHp: Int,
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
    val dndRace: DndRaceSummaryDto,
    @JsonProperty("dndClass")
    val dndClass: DndClassResponseDto,
    val campaign: CampaignRef? = null,
    val subclass: SubclassResponseDto? = null,
    val classLevels: List<CharacterClassLevelResponseDto> = emptyList(),
    val choicesJson: Map<String, Any>,
    val inventory: List<InventorySlotResponseDto>,
    val spells: List<CharacterSpellResponseDto> = emptyList(),
    val resourceCounters: Map<String, Any> = emptyMap()
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
                bonusMaxHp = character.bonusMaxHp,
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
                savingThrowsProficiencies = character.savingThrowsProficiencies ?: emptyMap(),
                skillProficiencies = character.skillProficiencies ?: emptyMap(),
                spellSlots = character.spellSlots ?: emptyMap(),
                user = userSimpleDto,
                dndRace = DndRaceSummaryDto.fromEntity(character.dndRace),
                dndClass = DndClassResponseDto.fromEntity(character.dndClass, character.level),
                campaign = character.campaign?.let { CampaignRef(it.id!!) },
                subclass = character.subclass?.let { SubclassResponseDto.fromEntity(it, character.level) },
                classLevels = character.classLevels.map { CharacterClassLevelResponseDto.fromEntity(it) },
                choicesJson = character.choicesJson ?: emptyMap(),
                inventory = character.inventory.map { InventorySlotResponseDto.fromEntity(it) },
                resourceCounters = character.resourceCounters ?: emptyMap()
            )
        }

        fun fromEntity(character: Character, spells: List<CharacterSpell>): CharacterResponseDto {
            val dto = fromEntity(character)
            return dto.copy(
                spells = spells.map { CharacterSpellResponseDto.fromEntity(it) }
            )
        }
    }
}
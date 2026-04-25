package com.masterforge.masterforge_backend.model.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.util.UUID

data class UserRef(val id: UUID)
data class CampaignRef(val id: UUID)
data class RaceRef(val id: Int)
data class ClassRef(val id: Int)
data class ItemRef(val id: UUID)

data class CharacterDto(
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
    val user: UserRef,
    val campaign: CampaignRef? = null,
    val dndRace: RaceRef,
    val dndClass: ClassRef,
    val subclassId: Int? = null,
    val choicesJson: Map<String, Any>,
    val inventory: List<InventorySlotDto> = emptyList()
)

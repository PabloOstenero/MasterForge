package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CharacterDto(
    val name: String,
    val level: Int,
    val maxHp: Int,
    val currentHp: Int,
    val tempHp: Int,
    val armorClass: Int,
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
    val skillProficiencies: String,
    val spellSlots: Map<String, Any>,
    val userId: UUID,
    val campaignId: UUID,
    val dndRaceId: Int,
    val dndClassId: Int,
    val subclassId: Int?,
    val choicesJson: Map<String, Any>
)

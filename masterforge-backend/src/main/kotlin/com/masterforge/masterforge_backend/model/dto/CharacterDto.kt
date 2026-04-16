package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CharacterDto(
    val name: String,
    val level: Int,
    val currentHp: Int,
    val baseStr: Int,
    val baseDex: Int,
    val baseCon: Int,
    val baseInt: Int,
    val baseWis: Int,
    val baseCha: Int,
    val skillProficiencies: String, // JSONB
    val userId: UUID,
    val campaignId: UUID,
    val dndRaceId: Int,
    val dndClassId: Int
)

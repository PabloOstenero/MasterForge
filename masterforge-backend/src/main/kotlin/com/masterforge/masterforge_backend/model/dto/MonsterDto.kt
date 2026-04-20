package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class MonsterDto(
    val name: String,
    val type: String,
    val size: String,
    val armorClass: Int,
    val hitPoints: Int,
    val speed: String,
    val str: Int,
    val dex: Int,
    val con: Int,
    val intStat: Int,
    val wis: Int,
    val cha: Int,
    val challengeRating: Double,
    val xp: Int,
    val combatMechanics: Map<String, Any>,
    val authorId: UUID? = null
)
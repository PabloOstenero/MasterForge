package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class SpellDto(
    val id: java.util.UUID? = null,
    val name: String,
    val price: java.math.BigDecimal? = null,
    val level: Int,
    val school: String,
    val castingTime: String,
    val range: String,
    val duration: String,
    val verbal: Boolean = false,
    val somatic: Boolean = false,
    val material: Boolean = false,
    val materialComponent: String? = null,
    val concentration: Boolean = false,
    val ritual: Boolean = false,
    val damageTypes: List<String>? = null,
    val savingThrow: String? = null,
    val spellClasses: List<String>? = null,
    val higherLevelDescription: String? = null,
    val description: String,
    val authorId: java.util.UUID? = null,
    val isOfficial: Boolean? = null

)

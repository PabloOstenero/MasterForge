package com.masterforge.masterforge_backend.model.dto

import java.util.UUID

data class CharacterSpellDto(
    val id: Int?,
    val characterId: UUID,
    val spellId: UUID,
    val isPrepared: Boolean
)

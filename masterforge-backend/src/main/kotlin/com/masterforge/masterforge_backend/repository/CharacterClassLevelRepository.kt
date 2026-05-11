package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.CharacterClassLevel
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CharacterClassLevelRepository : JpaRepository<CharacterClassLevel, Long> {
    fun findByCharacterId(characterId: java.util.UUID): List<CharacterClassLevel>
}

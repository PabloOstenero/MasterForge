package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.CharacterSpell
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CharacterSpellRepository : JpaRepository<CharacterSpell, Int>

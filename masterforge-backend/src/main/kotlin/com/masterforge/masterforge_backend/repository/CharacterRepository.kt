package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Character
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CharacterRepository : JpaRepository<Character, UUID> {

    @Query("SELECT COUNT(DISTINCT c.user.id) FROM Character c WHERE c.campaign.owner.email = :ownerEmail")
    fun countDistinctPlayersByOwnerEmail(@Param("ownerEmail") ownerEmail: String): Long
}


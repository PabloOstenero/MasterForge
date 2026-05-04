package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Character
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CharacterRepository : JpaRepository<Character, UUID> {

    @Query("SELECT COUNT(DISTINCT c.user.id) FROM Character c WHERE c.campaign.owner.id = :ownerId")
    fun countDistinctPlayersByOwnerId(@Param("ownerId") ownerId: UUID): Long

    @Query("SELECT COUNT(DISTINCT c.user.id) FROM Character c WHERE c.campaign.owner.email = :ownerEmail")
    fun countDistinctPlayersByOwnerEmail(@Param("ownerEmail") ownerEmail: String): Long

    @Query("SELECT c FROM Character c WHERE c.user.id = :userId")
    fun findByUserId(@Param("userId") userId: UUID): List<Character>

    @Query("SELECT COUNT(c) FROM Character c WHERE c.user.id = :userId")
    fun countByUserId(@Param("userId") userId: UUID): Long

    @Query("""
        SELECT c FROM Character c
        WHERE c.campaign IS NOT NULL
          AND c.campaign.owner.id = :dmId
    """)
    fun findCharactersByDmId(@Param("dmId") dmId: UUID): List<Character>

    fun findByCampaignIdAndUserId(campaignId: UUID, userId: UUID): List<Character>
}


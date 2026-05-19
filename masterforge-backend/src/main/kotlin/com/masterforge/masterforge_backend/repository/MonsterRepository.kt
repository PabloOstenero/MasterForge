package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Monster
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

@Repository
interface MonsterRepository : JpaRepository<Monster, UUID> {
    fun findByAuthorId(authorId: UUID): List<Monster>
    fun findByAuthorIdNotAndAuthorIdIsNotNull(authorId: UUID): List<Monster>
    fun findByAuthorIdIsNull(): List<Monster>

    @Query("SELECT m FROM Monster m WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.type) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:type IS NULL OR :type = '' OR LOWER(m.type) = LOWER(:type)) AND " +
           "(:challengeRating IS NULL OR m.challengeRating = :challengeRating)")
    fun searchMonsters(
        @Param("search") search: String?,
        @Param("type") type: String?,
        @Param("challengeRating") challengeRating: Double?
    ): List<Monster>
}


package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.DndRace
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DndRaceRepository : JpaRepository<DndRace, Int> {
    fun findByAuthorId(authorId: UUID): List<DndRace>
    fun findByAuthorIdNotAndAuthorIdIsNotNull(authorId: UUID): List<DndRace>
    fun findByAuthorIdIsNull(): List<DndRace>
}

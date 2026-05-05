package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.DndClass
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface DndClassRepository : JpaRepository<DndClass, Int> {
    fun findByAuthorId(authorId: UUID): List<DndClass>
}

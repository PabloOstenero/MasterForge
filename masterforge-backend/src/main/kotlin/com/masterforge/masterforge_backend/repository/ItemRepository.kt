package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Item
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ItemRepository : JpaRepository<Item, UUID> {
    fun findByAuthorId(authorId: UUID): List<Item>
    fun findByAuthorIdNotAndAuthorIdIsNotNull(authorId: UUID): List<Item>
    fun findByAuthorIdIsNull(): List<Item>
}

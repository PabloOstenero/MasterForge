package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.HomebrewCollection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface HomebrewCollectionRepository : JpaRepository<HomebrewCollection, UUID> {
    fun findByUserId(userId: UUID): List<HomebrewCollection>
    fun existsByUserIdAndContentTypeAndContentId(userId: UUID, contentType: String, contentId: String): Boolean
}

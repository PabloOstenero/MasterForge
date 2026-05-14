package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Notification
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface NotificationRepository : JpaRepository<Notification, UUID> {
    fun findByUserIdOrderByCreatedAtDesc(userId: UUID): List<Notification>
    fun countByUserIdAndIsReadFalse(userId: UUID): Long
}

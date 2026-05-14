package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Notification
import com.masterforge.masterforge_backend.service.NotificationService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/notifications")
class NotificationController(
    private val notificationService: NotificationService
) {

    @GetMapping("/me")
    fun getMyNotifications(): List<Notification> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: throw RuntimeException("Unauthorized")
        return notificationService.getNotificationsForUser(UUID.fromString(userId))
    }

    @GetMapping("/me/unread-count")
    fun getMyUnreadCount(): Map<String, Long> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: throw RuntimeException("Unauthorized")
        val count = notificationService.getUnreadCount(UUID.fromString(userId))
        return mapOf("count" to count)
    }

    @PostMapping("/{id}/read")
    fun markAsRead(@PathVariable id: UUID): ResponseEntity<Void> {
        notificationService.markAsRead(id)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/me/read-all")
    fun markAllAsRead(): ResponseEntity<Void> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: throw RuntimeException("Unauthorized")
        notificationService.markAllAsRead(UUID.fromString(userId))
        return ResponseEntity.ok().build()
    }
}

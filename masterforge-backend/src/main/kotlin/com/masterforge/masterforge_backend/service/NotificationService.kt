package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.entity.Notification
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.NotificationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class NotificationService(
    private val notificationRepository: NotificationRepository
) {
    @Transactional
    fun createNotification(user: User, title: String, message: String, link: String? = null, type: String = "SESSION_ALERT"): Notification? {
        // Only create if the user has session notifications enabled for this type
        if (type == "SESSION_ALERT" && !user.sessionNotifications) {
            return null
        }

        val notification = Notification(
            user = user,
            title = title,
            message = message,
            link = link,
            type = type
        )
        return notificationRepository.save(notification)
    }

    @Transactional(readOnly = true)
    fun getNotificationsForUser(userId: UUID): List<Notification> {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
    }

    @Transactional(readOnly = true)
    fun getUnreadCount(userId: UUID): Long {
        return notificationRepository.countByUserIdAndIsReadFalse(userId)
    }

    @Transactional
    fun markAsRead(notificationId: UUID) {
        notificationRepository.findById(notificationId).ifPresent {
            it.isRead = true
            notificationRepository.save(it)
        }
    }

    @Transactional
    fun markAllAsRead(userId: UUID) {
        val notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
        notifications.forEach { if (!it.isRead) it.isRead = true }
        notificationRepository.saveAll(notifications)
    }
}

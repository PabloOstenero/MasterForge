package com.masterforge.masterforge_backend.service

import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.Message
import com.google.firebase.messaging.Notification
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class PushNotificationService {

    private val logger = LoggerFactory.getLogger(PushNotificationService::class.java)

    fun sendPushNotification(tokens: Set<String>, title: String, body: String, data: Map<String, String> = emptyMap()) {
        if (tokens.isEmpty()) return

        tokens.forEach { token ->
            try {
                val notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build()

                val message = Message.builder()
                    .setToken(token)
                    .setNotification(notification)
                    .putAllData(data)
                    .build()

                FirebaseMessaging.getInstance().send(message)
                logger.debug("Push notification sent successfully to token: $token")
            } catch (e: Exception) {
                logger.error("Error sending push notification to token $token: ${e.message}")
            }
        }
    }
}

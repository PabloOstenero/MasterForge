package com.masterforge.masterforge_backend.config

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ClassPathResource
import java.io.IOException

@Configuration
class FirebaseConfig {

    private val logger = LoggerFactory.getLogger(FirebaseConfig::class.java)

    @PostConstruct
    fun initialize() {
        try {
            val serviceAccount = ClassPathResource("firebase-service-account.json")
            if (serviceAccount.exists()) {
                val options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount.inputStream))
                    .build()

                if (FirebaseApp.getApps().isEmpty()) {
                    FirebaseApp.initializeApp(options)
                    logger.info("Firebase Admin SDK initialized successfully.")
                }
            } else {
                logger.warn("firebase-service-account.json not found in resources. Push notifications will not be sent.")
            }
        } catch (e: IOException) {
            logger.error("Error initializing Firebase Admin SDK: ${e.message}")
        }
    }
}

package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.repository.UserRepository
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PasswordMigrationService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {
    private val logger = LoggerFactory.getLogger(PasswordMigrationService::class.java)

    @PostConstruct
    @Transactional
    fun migratePasswords() {
        logger.info("Starting password migration check...")
        val users = userRepository.findAll()
        var migratedCount = 0

        users.forEach { user ->
            // BCrypt hashes typically start with $2a$, $2b$ or $2y$
            if (!user.passwordHash.startsWith("$2")) {
                logger.info("Migrating password for user: ${user.email}")
                val hashedPassword = passwordEncoder.encode(user.passwordHash)!!
                
                // We use a custom query or save to update
                // Since it's a small number of users usually, save() is fine
                val updatedUser = user.copy(passwordHash = hashedPassword)
                userRepository.save(updatedUser)
                migratedCount++
            }
        }

        if (migratedCount > 0) {
            logger.info("Successfully migrated $migratedCount users to BCrypt.")
        } else {
            logger.info("No users required password migration.")
        }
    }
}

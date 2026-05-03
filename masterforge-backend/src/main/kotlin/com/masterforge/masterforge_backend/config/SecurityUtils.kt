package com.masterforge.masterforge_backend.config

import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/**
 * Stateless utility for extracting authentication data from the Spring Security context.
 *
 * Centralises the repeated pattern of reading the current user's UUID from the JWT
 * principal so controllers don't each duplicate the same logic (SRP).
 */
object SecurityUtils {

    /**
     * Extracts the authenticated user's UUID from the security context.
     *
     * The JWT filter stores the user ID as the authentication principal name.
     *
     * @throws ResponseStatusException 401 if no authentication is present
     * @throws ResponseStatusException 401 if the principal name is not a valid UUID
     */
    fun getCurrentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        return try {
            UUID.fromString(authentication.name)
        } catch (ex: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication token")
        }
    }
}

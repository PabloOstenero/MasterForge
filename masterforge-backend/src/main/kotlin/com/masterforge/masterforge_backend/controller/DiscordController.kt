package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.service.DiscordService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * REST Controller for Discord account linking operations.
 */
@RestController
@RequestMapping("/api/discord")
class DiscordController(private val discordService: DiscordService) {

    /**
     * Returns the Discord authorization URL to initiate the OAuth2 flow.
     */
    @GetMapping("/auth-url")
    fun getAuthUrl(): ResponseEntity<Map<String, String>> {
        val userId = SecurityUtils.getCurrentUserId()
        return ResponseEntity.ok(mapOf("url" to discordService.getAuthUrl(userId)))
    }

    /**
     * Callback endpoint for Discord OAuth2 redirection.
     * Expects a 'code' parameter which is exchanged for user information.
     */
    @GetMapping("/callback")
    fun callback(
        @RequestParam code: String,
        @RequestParam state: String
    ): ResponseEntity<Map<String, String>> {
        return try {
            val userId = SecurityUtils.getCurrentUserId()
            discordService.linkAccount(userId, code, state)
            ResponseEntity.ok(mapOf("status" to "success", "message" to "Account linked successfully"))
        } catch (e: IllegalStateException) {
            ResponseEntity.status(409).body(mapOf("status" to "error", "message" to e.message!!))
        } catch (e: Exception) {
            ResponseEntity.status(400).body(mapOf("status" to "error", "message" to (e.message ?: "Unknown error")))
        }
    }

    /**
     * Unlinks the Discord account from the currently authenticated user.
     */
    @DeleteMapping("/unlink")
    fun unlink(): ResponseEntity<Map<String, String>> {
        val userId = SecurityUtils.getCurrentUserId()
        discordService.unlinkAccount(userId)
        return ResponseEntity.ok(mapOf("status" to "success", "message" to "Account unlinked successfully"))
    }
}

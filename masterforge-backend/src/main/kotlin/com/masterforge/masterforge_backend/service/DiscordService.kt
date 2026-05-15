package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.web.client.RestTemplate
import java.util.*

/**
 * Service to handle Discord OAuth2 flow and account linking.
 */
@Service
class DiscordService(
    private val userRepository: UserRepository,
    @Value("\${discord.client.id}") private val clientId: String,
    @Value("\${discord.client.secret}") private val clientSecret: String,
    @Value("\${discord.redirect.uri}") private val redirectUri: String
) {
    private val restTemplate = RestTemplate()

    /**
     * Generates a verifiable state for OAuth2 to prevent CSRF.
     */
    fun generateState(userId: UUID): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest((userId.toString() + clientSecret).toByteArray())
        val hash = hashBytes.joinToString("") { "%02x".format(it) }
        return Base64.getEncoder().encodeToString("$userId:$hash".toByteArray())
    }

    /**
     * Verifies the state returned by Discord.
     */
    fun verifyState(userId: UUID, state: String) {
        try {
            val decoded = String(Base64.getDecoder().decode(state))
            val parts = decoded.split(":")
            if (parts.size != 2 || parts[0] != userId.toString()) {
                throw RuntimeException("Estado inválido")
            }
            
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest((userId.toString() + clientSecret).toByteArray())
            val expectedHash = hashBytes.joinToString("") { "%02x".format(it) }
            
            if (parts[1] != expectedHash) {
                throw RuntimeException("Fallo en la verificación del estado")
            }
        } catch (e: Exception) {
            throw RuntimeException("Seguridad: Verificación de estado fallida")
        }
    }

    /**
     * Generates the Discord authorization URL with a verifiable state.
     */
    fun getAuthUrl(userId: UUID): String {
        val state = generateState(userId)
        return "https://discord.com/api/oauth2/authorize?client_id=$clientId&redirect_uri=$redirectUri&response_type=code&scope=identify&state=$state"
    }

    /**
     * Exchanges the authorization code for a Discord token, fetches user info,
     * and links it to the MasterForge user.
     */
    fun linkAccount(userId: UUID, code: String, state: String) {
        // 1. Verify OAuth2 State (CSRF protection)
        verifyState(userId, state)

        // 2. Exchange code for token
        val tokenResponse = exchangeCodeForToken(code)
        val accessToken = tokenResponse["access_token"] as? String
            ?: throw RuntimeException("No se recibió el token de acceso de Discord")
        
        // 3. Fetch Discord user info
        val discordUser = fetchDiscordUser(accessToken)
        val discordId = discordUser["id"] as? String
            ?: throw RuntimeException("No se recibió el ID de Discord")
        val username = discordUser["username"] as? String
            ?: throw RuntimeException("No se recibió el nombre de usuario de Discord")
        val discriminator = discordUser["discriminator"] as? String

        val discordUsername = if (discriminator != null && discriminator != "0") {
            "$username#$discriminator"
        } else {
            username
        }

        // 4. Check if this Discord account is already linked to ANOTHER user
        val existingUser = userRepository.findByDiscordId(discordId)
        if (existingUser.isPresent && existingUser.get().id != userId) {
            throw IllegalStateException("Esta cuenta de Discord ya está vinculada a otro usuario de MasterForge")
        }

        val user = userRepository.findById(userId).orElseThrow { 
            RuntimeException("Usuario con ID $userId no encontrado") 
        }
        
        user.discordId = discordId
        user.discordUsername = discordUsername
        userRepository.save(user)
    }

    /**
     * Removes the Discord link from the MasterForge user.
     */
    fun unlinkAccount(userId: UUID) {
        val user = userRepository.findById(userId).orElseThrow { 
            RuntimeException("User with ID $userId not found") 
        }
        user.discordId = null
        user.discordUsername = null
        userRepository.save(user)
    }

    private fun exchangeCodeForToken(code: String): Map<*, *> {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_FORM_URLENCODED

        val map: MultiValueMap<String, String> = LinkedMultiValueMap()
        map.add("client_id", clientId)
        map.add("client_secret", clientSecret)
        map.add("grant_type", "authorization_code")
        map.add("code", code)
        map.add("redirect_uri", redirectUri)

        val request = HttpEntity(map, headers)
        val response = restTemplate.postForEntity(
            "https://discord.com/api/oauth2/token", 
            request, 
            Map::class.java
        )

        if (response.statusCode != HttpStatus.OK) {
            throw RuntimeException("Failed to exchange code for token: ${response.statusCode}")
        }

        return response.body ?: throw RuntimeException("Empty response from Discord token endpoint")
    }

    private fun fetchDiscordUser(accessToken: String): Map<*, *> {
        val headers = HttpHeaders()
        headers.setBearerAuth(accessToken)

        val entity = HttpEntity<Unit>(headers)
        val response = restTemplate.exchange(
            "https://discord.com/api/users/@me",
            HttpMethod.GET,
            entity,
            Map::class.java
        )

        if (response.statusCode != HttpStatus.OK) {
            throw RuntimeException("Failed to fetch Discord user: ${response.statusCode}")
        }

        return response.body ?: throw RuntimeException("Empty response from Discord user endpoint")
    }
}

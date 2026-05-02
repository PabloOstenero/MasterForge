package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.UUID

/**
 * Unit tests for GET /api/users/me/player-campaigns endpoint.
 *
 * Validates: Requirements 3.1, 3.3, 3.6
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PlayerCampaignEndpointTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var userRepository: UserRepository

    @Autowired
    lateinit var sessionAttendeeRepository: SessionAttendeeRepository

    @Autowired
    lateinit var sessionRepository: SessionRepository

    @Autowired
    lateinit var characterRepository: CharacterRepository

    @Autowired
    lateinit var campaignRepository: CampaignRepository

    @Autowired
    lateinit var dndClassRepository: DndClassRepository

    @Autowired
    lateinit var dndRaceRepository: DndRaceRepository

    @Autowired
    lateinit var jwtService: JwtService

    @BeforeEach
    fun cleanup() {
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        characterRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
        dndClassRepository.deleteAll()
        dndRaceRepository.deleteAll()
    }

    /**
     * Requirement 3.6: IF the JWT token is not valid or absent,
     * THEN the endpoint SHALL return HTTP 401.
     */
    @Test
    fun `GET player-campaigns without JWT returns 401`() {
        mockMvc.perform(
            get("/api/users/me/player-campaigns")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isUnauthorized)
    }

    /**
     * Requirement 3.3: WHEN the authenticated user has no SessionAttendee records,
     * THE endpoint SHALL return an empty list with HTTP 200.
     */
    @Test
    fun `GET player-campaigns for user with no sessions returns 200 with empty list`() {
        // Create a user with no session attendee records
        val user = userRepository.save(
            User(
                name = "TestPlayer",
                email = "testplayer_${UUID.randomUUID()}@test.com",
                passwordHash = "hash"
            )
        )

        // Generate a valid JWT for this user
        // Note: the JWT subject is the userId; the controller uses authentication.name
        // which returns the subject. The repository query uses email, so we need to
        // ensure the authentication name matches what the repository expects.
        // Following the same pattern as existing endpoints in UserController.
        val token = jwtService.generateToken(user.id!!, user.email)

        mockMvc.perform(
            get("/api/users/me/player-campaigns")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(0))
    }
}

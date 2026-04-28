package com.masterforge.masterforge_backend

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Bug Condition Exploration Test — Property 1
 *
 * CRITICAL: These tests MUST FAIL on unfixed code.
 * Failure confirms the bug exists. DO NOT fix the code when these fail.
 *
 * Bug condition:
 *   playerCountSource == GET /api/users
 *   AND countShown == COUNT(allUsersInSystem)
 *   AND NOT countShown == COUNT(DISTINCT characters.user WHERE campaign.owner == authenticatedUser)
 *
 * Validates: Requirements 1.1, 1.2
 */
@SpringBootTest
@AutoConfigureMockMvc
class PlayerCountEndpointBugConditionTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    /**
     * P1-BUG-BACKEND-1: GET /api/users/me/player-count must exist (not return 404).
     *
     * On unfixed code: this endpoint does not exist → returns 404.
     * EXPECTED FAILURE: status is 404 (endpoint missing).
     * After fix: status should be 200 or 401 (endpoint exists, auth required).
     *
     * Validates: Requirements 1.1, 1.2
     */
    @Test
    fun `P1-BUG-BACKEND-1 - GET api-users-me-player-count must not return 404`() {
        // Without auth token, the endpoint should return 401 (Unauthorized) if it exists,
        // or 404 if it doesn't exist yet.
        // EXPECTED FAILURE on unfixed code: status is 404 (endpoint missing).
        // After fix: status should be 401 (endpoint exists but requires authentication).
        mockMvc.perform(get("/api/users/me/player-count"))
            .andExpect(
                status().isUnauthorized // 401 — endpoint exists but requires auth
                // On unfixed code this will fail because status is 404 (endpoint missing)
            )
    }
}

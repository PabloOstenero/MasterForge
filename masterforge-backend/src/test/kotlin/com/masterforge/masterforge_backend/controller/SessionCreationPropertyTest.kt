package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.property.Arb
import io.kotest.property.arbitrary.Codepoint
import io.kotest.property.arbitrary.alphanumeric
import io.kotest.property.arbitrary.bind
import io.kotest.property.arbitrary.filter
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.map
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * Property-based test for SessionController — Property 8.
 *
 * Validates that for any valid [SessionDto] with a non-empty name (1–255
 * alphanumeric characters), POST /api/sessions returns HTTP 200 and the
 * persisted [Session] entity has a `name` field equal to the submitted value.
 *
 * Validates: Requirements 3.1
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SessionCreationPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var jwtService: JwtService

    private lateinit var token: String
    private lateinit var campaignId: UUID

    init {
        beforeTest {
            // Clean up in dependency order to avoid FK constraint violations
            sessionRepository.deleteAll()
            campaignEnrollmentRepository.deleteAll()
            campaignRepository.deleteAll()
            userRepository.deleteAll()

            // Create a DM user and a campaign to attach sessions to
            val owner = userRepository.save(
                User(
                    name = "DM_${UUID.randomUUID()}",
                    email = "dm_${UUID.randomUUID()}@test.com",
                    passwordHash = "hash"
                )
            )
            token = jwtService.generateToken(owner.id!!, owner.email)

            // Create a campaign via the API so it goes through the full stack
            val campaignBody = """
                {
                  "name": "Test Campaign",
                  "description": "A campaign for session tests",
                  "ownerId": "${owner.id}",
                  "maxPlayers": 6,
                  "joinPrice": 0.00,
                  "visibility": "PUBLIC"
                }
            """.trimIndent()

            mockMvc.perform(
                post("/api/campaigns")
                    .header("Authorization", "Bearer $token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(campaignBody)
            ).andExpect(status().isOk)

            campaignId = campaignRepository.findAll().first().id!!
        }

        // ── Property 8: Backend name persistence ─────────────────────────────

        // Feature: campaign-session-creation, Property 8: backend name persistence
        "Property 8 — for any valid non-empty name (1–255 alphanumeric chars), POST /api/sessions persists the name exactly" {
            // Generate valid session names: 1–255 alphanumeric characters, non-blank
            val validName = Arb.string(1, 255, Codepoint.alphanumeric())
                .filter { it.isNotBlank() }

            // Generate valid future timestamps (1–365 days from now) as ISO strings
            val validDate: Arb<String> = Arb.int(1, 365).map { daysAhead: Int ->
                Instant.now().plus(daysAhead.toLong(), ChronoUnit.DAYS).toString()
            }

            val validSessionInput: Arb<ValidSessionInput> = Arb.bind(validName, validDate) { name: String, date: String ->
                ValidSessionInput(name, date)
            }

            checkAll(iterations = 50, validSessionInput) { input ->
                // Clean sessions between iterations to keep assertions unambiguous
                sessionRepository.deleteAll()

                val body = sessionJson(
                    name = input.name,
                    scheduledDate = input.scheduledDate,
                    price = BigDecimal.ZERO,
                    campaignId = campaignId
                )

                mockMvc.perform(
                    post("/api/sessions")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                // Verify the persisted entity has the exact name that was submitted
                val saved = sessionRepository.findAll().first()

                assert(saved.name == input.name) {
                    "Expected session name '${input.name}' but got '${saved.name}'"
                }
            }
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Lightweight holder for a valid session creation input. */
    private data class ValidSessionInput(
        val name: String,
        val scheduledDate: String
    )

    /** Escapes a string value for safe embedding inside a JSON string literal. */
    private fun String.escapeJson(): String = this
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")

    /** Builds a session JSON body with the given field values. */
    private fun sessionJson(
        name: String,
        scheduledDate: String,
        price: BigDecimal,
        campaignId: UUID
    ): String = """
        {
          "name": "${name.escapeJson()}",
          "scheduledDate": "${scheduledDate.escapeJson()}",
          "price": ${price.toPlainString()},
          "campaignId": "$campaignId"
        }
    """.trimIndent()
}

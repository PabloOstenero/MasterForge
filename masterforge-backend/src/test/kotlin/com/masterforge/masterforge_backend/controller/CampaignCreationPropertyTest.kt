package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.property.Arb
import io.kotest.property.arbitrary.bind
import io.kotest.property.arbitrary.Codepoint
import io.kotest.property.arbitrary.alphanumeric
import io.kotest.property.arbitrary.double
import io.kotest.property.arbitrary.enum
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
import java.math.RoundingMode
import java.util.UUID

/**
 * Property-based tests for CampaignController — Properties 5, 7, 8, 9.
 *
 * Each property is verified over many generated inputs to provide stronger
 * correctness guarantees than example-based tests alone.
 *
 * Validates: Requirements 4.4, 5.4, 7.2, 7.5
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignCreationPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var jwtService: JwtService

    private lateinit var owner: User
    private lateinit var token: String

    init {
        beforeTest {
            campaignRepository.deleteAll()
            userRepository.deleteAll()
            owner = userRepository.save(
                User(
                    name = "DM_${UUID.randomUUID()}",
                    email = "dm_${UUID.randomUUID()}@test.com",
                    passwordHash = "hash"
                )
            )
            token = jwtService.generateToken(owner.id!!, owner.email)
        }

        // ── Property 5: maxPlayers < 1 rejected on backend ───────────────────

        // Feature: campaign-creation-form, Property 5: maxPlayers < 1 rejected on backend
        "Property 5 — any maxPlayers value less than 1 returns HTTP 400" {
            checkAll(iterations = 50, Arb.int(Int.MIN_VALUE, 0)) { invalidMaxPlayers ->
                val body = campaignJson(
                    name = "Test Campaign",
                    description = "desc",
                    ownerId = owner.id!!,
                    maxPlayers = invalidMaxPlayers,
                    joinPrice = "0.00",
                    visibility = "PUBLIC"
                )

                mockMvc.perform(
                    post("/api/campaigns")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isBadRequest)
            }
        }

        // ── Property 7: negative joinPrice rejected on backend ───────────────

        // Feature: campaign-creation-form, Property 7: negative joinPrice rejected on backend
        "Property 7 — any negative joinPrice value returns HTTP 400" {
            // Generate negative doubles, convert to BigDecimal with 2 decimal places.
            // We filter out NaN/Infinity and values that round to 0.00 to ensure they
            // are genuinely negative after serialisation.
            val negativePrice = Arb.double(-1_000_000.0, -0.01)
                .filter { it.isFinite() }
                .map { BigDecimal(it).setScale(2, RoundingMode.HALF_UP) }
                .filter { it < BigDecimal.ZERO }

            checkAll(iterations = 50, negativePrice) { price ->
                val body = campaignJson(
                    name = "Test Campaign",
                    description = "desc",
                    ownerId = owner.id!!,
                    maxPlayers = 4,
                    joinPrice = price.toPlainString(),
                    visibility = "PUBLIC"
                )

                mockMvc.perform(
                    post("/api/campaigns")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isBadRequest)
            }
        }

        // ── Property 8: all DTO fields are mapped to the Campaign entity ─────

        // Feature: campaign-creation-form, Property 8: all DTO fields mapped to entity
        "Property 8 — all valid DTO fields are persisted correctly in the Campaign entity" {
            // Generate valid DTOs: name (1–100 printable chars, non-blank), description (any printable),
            // maxPlayers (1–100), joinPrice (0.00–9999.99), visibility (any enum value).
            val validName = Arb.string(1, 100, Codepoint.alphanumeric()).filter { it.isNotBlank() }
            val validDescription = Arb.string(0, 200, Codepoint.alphanumeric())
            val validMaxPlayers = Arb.int(1, 100)
            val validJoinPrice = Arb.double(0.0, 9999.99)
                .filter { it.isFinite() }
                .map { BigDecimal(it).setScale(2, RoundingMode.HALF_UP) }
                .filter { it >= BigDecimal.ZERO }
            val validVisibility = Arb.enum<CampaignVisibility>()

            val validDto = Arb.bind(
                validName,
                validDescription,
                validMaxPlayers,
                validJoinPrice,
                validVisibility
            ) { name, description, maxPlayers, joinPrice, visibility ->
                ValidCampaignDto(name, description, maxPlayers, joinPrice, visibility)
            }

            checkAll(iterations = 50, validDto) { dto ->
                // Clean up between iterations so each test starts fresh
                campaignRepository.deleteAll()

                val body = campaignJson(
                    name = dto.name,
                    description = dto.description,
                    ownerId = owner.id!!,
                    maxPlayers = dto.maxPlayers,
                    joinPrice = dto.joinPrice.toPlainString(),
                    visibility = dto.visibility.name
                )

                mockMvc.perform(
                    post("/api/campaigns")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isOk)

                // Verify the persisted entity matches the DTO values exactly
                val saved = campaignRepository.findAll().first()

                assert(saved.name == dto.name) {
                    "Expected name '${dto.name}' but got '${saved.name}'"
                }
                assert(saved.description == dto.description) {
                    "Expected description '${dto.description}' but got '${saved.description}'"
                }
                assert(saved.maxPlayers == dto.maxPlayers) {
                    "Expected maxPlayers ${dto.maxPlayers} but got ${saved.maxPlayers}"
                }
                assert(saved.joinPrice.compareTo(dto.joinPrice) == 0) {
                    "Expected joinPrice ${dto.joinPrice} but got ${saved.joinPrice}"
                }
                assert(saved.visibility == dto.visibility) {
                    "Expected visibility ${dto.visibility} but got ${saved.visibility}"
                }
            }
        }

        // ── Property 9: invalid visibility strings rejected on backend ────────

        // Feature: campaign-creation-form, Property 9: invalid visibility rejected on backend
        "Property 9 — any visibility string not in the enum returns HTTP 400" {
            val validValues = setOf("PUBLIC", "PRIVATE", "INVITE_ONLY")
            val invalidVisibility = Arb.string(0, 50).filter { it !in validValues }

            checkAll(iterations = 50, invalidVisibility) { badVisibility ->
                val body = campaignJson(
                    name = "Test Campaign",
                    description = "desc",
                    ownerId = owner.id!!,
                    maxPlayers = 4,
                    joinPrice = "0.00",
                    visibility = badVisibility
                )

                mockMvc.perform(
                    post("/api/campaigns")
                        .header("Authorization", "Bearer $token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                )
                    .andExpect(status().isBadRequest)
            }
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** Lightweight data holder for a valid campaign DTO used in Property 8. */
    private data class ValidCampaignDto(
        val name: String,
        val description: String,
        val maxPlayers: Int,
        val joinPrice: BigDecimal,
        val visibility: CampaignVisibility
    )

    /** Escapes a string value for safe embedding inside a JSON string literal. */
    private fun String.escapeJson(): String = this
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")

    /** Builds a campaign JSON body with the given field values. */
    private fun campaignJson(
        name: String,
        description: String,
        ownerId: UUID,
        maxPlayers: Int,
        joinPrice: String,
        visibility: String
    ): String = """
        {
          "name": "${name.escapeJson()}",
          "description": "${description.escapeJson()}",
          "ownerId": "$ownerId",
          "maxPlayers": $maxPlayers,
          "joinPrice": $joinPrice,
          "visibility": "${visibility.escapeJson()}"
        }
    """.trimIndent()
}

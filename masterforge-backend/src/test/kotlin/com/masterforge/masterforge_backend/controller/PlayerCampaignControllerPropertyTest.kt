package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.checkAll
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.sql.Timestamp
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

/**
 * Feature: player-campaign-list
 *
 * Property 6: La respuesta contiene todos los campos requeridos del DTO
 *
 * Validates: Requirement 3.2
 *
 * For any user with at least one SessionAttendee record, each object in the list
 * returned by the repository must contain the fields: campaignId, campaignName,
 * dmName, and nextSessionDate (the latter can be null).
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PlayerCampaignControllerPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var sessionAttendeeRepository: SessionAttendeeRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var campaignRepository: CampaignRepository

    init {

        /**
         * Feature: player-campaign-list, Property 6: response contains all required DTO fields
         * Validates: Requirement 3.2
         *
         * For any user with at least one SessionAttendee record, each object in the list
         * must contain campaignId, campaignName, dmName, and nextSessionDate (nullable).
         */
        "Property 6: each DTO in the response contains all required fields (campaignId, campaignName, dmName, nextSessionDate)" {
            checkAll(100, Arb.int(1, 5)) { numCampaigns ->
                cleanup()
                val dm = saveUser("DM")
                val player = saveUser("Player")

                repeat(numCampaigns) {
                    val campaign = saveCampaign(dm)
                    val session = saveSession(campaign, future = true)
                    saveAttendee(player, session)
                }

                val result = sessionAttendeeRepository.findPlayerCampaignsByUserEmail(player.email)

                result.size shouldBe numCampaigns
                result.forEach { dto ->
                    // Property: campaignId must be non-null
                    dto.campaignId shouldNotBe null

                    // Property: campaignName must be non-null and non-empty
                    dto.campaignName shouldNotBe null
                    (dto.campaignName.isNotEmpty()) shouldBe true

                    // Property: dmName must be non-null and non-empty
                    dto.dmName shouldNotBe null
                    (dto.dmName.isNotEmpty()) shouldBe true

                    // Property: nextSessionDate can be null (no constraint on nullability here)
                    // but the field must exist in the DTO (verified by accessing it without error)
                    // nextSessionDate is String? — accessing it is sufficient to verify the field exists
                    @Suppress("UNUSED_VARIABLE")
                    val nextSessionDateValue = dto.nextSessionDate // field access — no exception means field exists
                }
            }
        }

        "Property 6: dmName in each DTO matches the actual campaign owner name" {
            checkAll(100, Arb.int(1, 3)) { numCampaigns ->
                cleanup()
                val dm = saveUser("GameMaster")
                val player = saveUser("Player")

                val campaignNames = mutableListOf<String>()
                repeat(numCampaigns) {
                    val campaign = saveCampaign(dm)
                    campaignNames.add(campaign.name)
                    val session = saveSession(campaign, future = true)
                    saveAttendee(player, session)
                }

                val result = sessionAttendeeRepository.findPlayerCampaignsByUserEmail(player.email)

                result.forEach { dto ->
                    // Property: dmName must equal the DM's actual name
                    dto.dmName shouldBe dm.name
                    // Property: campaignName must be one of the created campaign names
                    (campaignNames.contains(dto.campaignName)) shouldBe true
                }
            }
        }

        "Property 6: campaignId in each DTO is a valid UUID matching an existing campaign" {
            checkAll(100, Arb.int(1, 4)) { numCampaigns ->
                cleanup()
                val dm = saveUser("DM")
                val player = saveUser("Player")

                val campaignIds = mutableListOf<UUID>()
                repeat(numCampaigns) {
                    val campaign = saveCampaign(dm)
                    campaignIds.add(campaign.id!!)
                    val session = saveSession(campaign, future = true)
                    saveAttendee(player, session)
                }

                val result = sessionAttendeeRepository.findPlayerCampaignsByUserEmail(player.email)

                result.forEach { dto ->
                    // Property: campaignId must match one of the created campaigns
                    (campaignIds.contains(dto.campaignId)) shouldBe true
                }
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveUser(role: String = "User"): User = userRepository.save(
        User(name = "${role}_${UUID.randomUUID()}", email = "${role.lowercase()}_${UUID.randomUUID()}@test.com", passwordHash = "hash")
    )

    private fun saveCampaign(owner: User): Campaign = campaignRepository.save(
        Campaign(
            name = "Campaign_${UUID.randomUUID()}",
            description = "desc",
            owner = owner,
            maxPlayers = 4,
            joinPrice = java.math.BigDecimal.ZERO,
            visibility = com.masterforge.masterforge_backend.model.entity.CampaignVisibility.PRIVATE
        )
    )

    private fun saveSession(campaign: Campaign, future: Boolean, offsetDays: Long = 1L): Session {
        val date = if (future)
            Timestamp.from(Instant.now().plus(offsetDays, ChronoUnit.DAYS))
        else
            Timestamp.from(Instant.now().minus(offsetDays, ChronoUnit.DAYS))
        return sessionRepository.save(
            Session(name = "Test Session", scheduledDate = date, price = BigDecimal.ZERO, campaign = campaign)
        )
    }

    private fun saveAttendee(user: User, session: Session): SessionAttendee =
        sessionAttendeeRepository.save(
            SessionAttendee(
                id = SessionAttendeeId(sessionId = session.id!!, userId = user.id!!),
                hasPaid = false,
                session = session,
                user = user
            )
        )
}

package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.User
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
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
 * Property 4: El endpoint agrupa por campaña sin duplicados
 * Property 5: nextSessionDate es siempre la fecha futura más próxima
 *
 * Validates: Requirements 3.4, 3.5
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class PlayerCampaignRepositoryPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var enrollmentRepository: CampaignEnrollmentRepository

    init {

        /**
         * Feature: player-campaign-list, Property 4: endpoint groups by campaign with no duplicates
         * Validates: Requirement 3.4
         *
         * For any user with CampaignEnrollment records distributed across M distinct campaigns
         * (with any number of sessions per campaign), the query must return exactly M elements,
         * one per campaign.
         */
        "Property 4: findPlayerCampaignsByUserId returns exactly M results for M distinct campaigns" {
            checkAll(100, Arb.int(1, 5)) { numCampaigns ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()

                repeat(numCampaigns) {
                    val campaign = saveCampaign(dm)
                    // Add multiple sessions per campaign to verify grouping
                    saveSession(campaign, future = true, offsetDays = 1L)
                    saveSession(campaign, future = true, offsetDays = 2L)
                    saveEnrollment(player, campaign)
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                // Property: exactly M results, one per campaign — no duplicates
                result.size shouldBe numCampaigns
            }
        }

        "Property 4: findPlayerCampaignsByUserId returns 0 results for user with no enrollment records" {
            checkAll(100, Arb.int(0, 3)) { numOtherSessions ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()
                val other = saveUser()

                // Other user has sessions and is enrolled, but not the player
                repeat(numOtherSessions) {
                    val campaign = saveCampaign(dm)
                    saveSession(campaign, future = true)
                    saveEnrollment(other, campaign)
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                // Property: player with no enrollment records gets empty list
                result.size shouldBe 0
            }
        }

        "Property 4: findPlayerCampaignsByUserId is isolated — only returns campaigns for the queried user" {
            checkAll(100, Arb.int(1, 3), Arb.int(1, 3)) { myCount, otherCount ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()
                val other = saveUser()

                repeat(myCount) {
                    val campaign = saveCampaign(dm)
                    saveSession(campaign, future = true)
                    saveEnrollment(player, campaign)
                }
                repeat(otherCount) {
                    val campaign = saveCampaign(dm)
                    saveSession(campaign, future = true)
                    saveEnrollment(other, campaign)
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                // Property: only the player's campaigns are returned
                result.size shouldBe myCount
            }
        }

        /**
         * Feature: player-campaign-list, Property 5: nextSessionDate is always the nearest future date
         * Validates: Requirement 3.5
         *
         * For any campaign with K future sessions (K ≥ 1), the nextSessionDate field returned
         * must equal the minimum of all future session dates for that campaign.
         */
        "Property 5: nextSessionDate equals the minimum future session date for a campaign with K future sessions" {
            checkAll(100, Arb.int(1, 5)) { numFutureSessions ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(dm)
                saveEnrollment(player, campaign)

                val futureDates = (1..numFutureSessions).map { offset ->
                    val session = saveSession(campaign, future = true, offsetDays = offset.toLong())
                    session.scheduledDate
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                result.size shouldBe 1
                val dto = result.first()
                dto.nextSessionDate.shouldNotBeNull()

                // Property: nextSessionDate is the minimum (nearest) future date
                val expectedMin = futureDates.minByOrNull { it.time }!!
                val ldt = java.time.LocalDateTime.parse(dto.nextSessionDate!!.substring(0, 19).replace(' ', 'T'))
                val actualInstant = ldt.toInstant(java.time.ZoneOffset.UTC)
                val diffSeconds = java.lang.Math.abs(actualInstant.epochSecond - expectedMin.toInstant().epochSecond)
                // Timezone difference on host system is at most 14 hours. 
                // Since test sessions are distributed across different days (>= 24-hour gap), 
                // a 15-hour threshold perfectly and uniquely isolates the correct session.
                (diffSeconds < 54000).shouldBeTrue()
            }
        }

        "Property 5: nextSessionDate is null when a campaign has only past sessions" {
            checkAll(100, Arb.int(1, 4)) { numPastSessions ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(dm)
                saveEnrollment(player, campaign)

                repeat(numPastSessions) {
                    saveSession(campaign, future = false)
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                result.size shouldBe 1
                // Property: no future sessions → nextSessionDate is null
                result.first().nextSessionDate.shouldBeNull()
            }
        }

        "Property 5: nextSessionDate ignores past sessions and returns only the nearest future date" {
            checkAll(100, Arb.int(1, 3), Arb.int(1, 3)) { numPast, numFuture ->
                cleanup()
                val dm = saveUser()
                val player = saveUser()
                val campaign = saveCampaign(dm)
                saveEnrollment(player, campaign)

                // Add past sessions
                repeat(numPast) {
                    saveSession(campaign, future = false)
                }

                // Add future sessions and track their dates
                val futureDates = (1..numFuture).map { offset ->
                    val session = saveSession(campaign, future = true, offsetDays = offset.toLong())
                    session.scheduledDate
                }

                val result = enrollmentRepository.findPlayerCampaignsByUserId(player.id!!)

                result.size shouldBe 1
                val dto = result.first()
                dto.nextSessionDate.shouldNotBeNull()

                // Property: nextSessionDate is the minimum future date, ignoring past sessions
                val expectedMin = futureDates.minByOrNull { it.time }!!
                val ldt = java.time.LocalDateTime.parse(dto.nextSessionDate!!.substring(0, 19).replace(' ', 'T'))
                val actualInstant = ldt.toInstant(java.time.ZoneOffset.UTC)
                val diffSeconds = java.lang.Math.abs(actualInstant.epochSecond - expectedMin.toInstant().epochSecond)
                // Use the same 15-hour boundary for timezone-robust matching
                (diffSeconds < 54000).shouldBeTrue()
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        sessionRepository.deleteAll()
        enrollmentRepository.deleteAll()
        characterRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
    }

    private fun saveUser(): User = userRepository.save(
        User(name = "User_${UUID.randomUUID()}", email = "user_${UUID.randomUUID()}@test.com", passwordHash = "hash")
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
            Session(name = "Test Session", scheduledDate = date, campaign = campaign)
        )
    }

    private fun saveEnrollment(user: User, campaign: Campaign): CampaignEnrollment =
        enrollmentRepository.save(
            CampaignEnrollment(
                campaign = campaign,
                user = user
            )
        )
}

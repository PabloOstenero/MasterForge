package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import io.kotest.core.spec.style.StringSpec
import io.kotest.extensions.spring.SpringExtension
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
 * Feature: player-summary-cards
 * Property 4: Each endpoint returns the correct response shape and value for any player
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5
 *
 * Tests the repository queries that back the three UserController endpoints:
 * - GET /api/users/me/next-session       → findNextSessionDateByUserEmail
 * - GET /api/users/me/active-campaigns   → countDistinctCampaignsByUserEmail
 * - GET /api/users/me/active-characters  → countByUserEmail
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
class UserControllerPropertyTest : StringSpec() {

    override fun extensions() = listOf(SpringExtension)

    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionAttendeeRepository: SessionAttendeeRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository

    init {

        /**
         * Feature: player-summary-cards, Property 4: each endpoint returns the correct response shape and value for any player
         * Validates: Requirement 2.5
         */
        "Property 4: countByUserEmail returns value equal to characters owned (including 0)" {
            checkAll(100, Arb.int(0, 5)) { numChars ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val player = savePlayer()
                repeat(numChars) { saveCharacter(player, dndClass, dndRace) }

                val count = characterRepository.countByUserEmail(player.email)

                count shouldBe numChars.toLong()
                (count >= 0) shouldBe true
            }
        }

        "Property 4: countByUserEmail is isolated — only counts characters of the queried player" {
            checkAll(100, Arb.int(0, 3), Arb.int(1, 3)) { myChars, otherChars ->
                cleanup()
                val (dndClass, dndRace) = saveClassAndRace()
                val player = savePlayer()
                val other = savePlayer()

                repeat(myChars) { saveCharacter(player, dndClass, dndRace) }
                repeat(otherChars) { saveCharacter(other, dndClass, dndRace) }

                val count = characterRepository.countByUserEmail(player.email)
                count shouldBe myChars.toLong()
            }
        }

        /**
         * Feature: player-summary-cards, Property 4: each endpoint returns the correct response shape and value for any player
         * Validates: Requirement 2.4
         */
        "Property 4: countDistinctCampaignsByUserEmail returns value equal to distinct campaigns enrolled (including 0)" {
            checkAll(100, Arb.int(0, 4)) { numCampaigns ->
                cleanup()
                val dm = savePlayer()
                val player = savePlayer()

                repeat(numCampaigns) {
                    val campaign = saveCampaign(dm)
                    val session = saveSession(campaign, future = true)
                    saveAttendee(player, session)
                }

                val count = campaignRepository.countDistinctCampaignsByUserEmail(player.email)

                count shouldBe numCampaigns.toLong()
                (count >= 0) shouldBe true
            }
        }

        "Property 4: countDistinctCampaignsByUserEmail counts campaigns not sessions — multiple sessions in same campaign = 1" {
            checkAll(100, Arb.int(1, 4)) { numSessions ->
                cleanup()
                val dm = savePlayer()
                val player = savePlayer()
                val campaign = saveCampaign(dm)

                repeat(numSessions) {
                    val session = saveSession(campaign, future = true)
                    saveAttendee(player, session)
                }

                val count = campaignRepository.countDistinctCampaignsByUserEmail(player.email)
                count shouldBe 1L
            }
        }

        /**
         * Feature: player-summary-cards, Property 4: each endpoint returns the correct response shape and value for any player
         * Validates: Requirement 2.3
         */
        "Property 4: findNextSessionDateByUserEmail returns null when player has no future sessions (including 0 sessions)" {
            checkAll(100, Arb.int(0, 3)) { numPastSessions ->
                cleanup()
                val dm = savePlayer()
                val player = savePlayer()
                val campaign = saveCampaign(dm)

                repeat(numPastSessions) {
                    val session = saveSession(campaign, future = false)
                    saveAttendee(player, session)
                }

                val result = sessionAttendeeRepository.findNextSessionDateByUserEmail(player.email)
                result.shouldBeNull()
            }
        }

        "Property 4: findNextSessionDateByUserEmail returns the earliest future session date" {
            checkAll(100, Arb.int(1, 4)) { numFutureSessions ->
                cleanup()
                val dm = savePlayer()
                val player = savePlayer()
                val campaign = saveCampaign(dm)

                val futureDates = (1..numFutureSessions).map { offset ->
                    val session = saveSession(campaign, future = true, offsetDays = offset.toLong())
                    saveAttendee(player, session)
                    session.scheduledDate
                }

                val result = sessionAttendeeRepository.findNextSessionDateByUserEmail(player.email)

                result.shouldNotBeNull()
                val expectedMin = futureDates.minByOrNull { it.time }!!
                result.time shouldBe expectedMin.time
            }
        }

        "Property 4: findNextSessionDateByUserEmail is isolated — ignores sessions of other players" {
            checkAll(100, Arb.int(1, 3)) { numOtherSessions ->
                cleanup()
                val dm = savePlayer()
                val player = savePlayer()
                val other = savePlayer()
                val campaign = saveCampaign(dm)

                repeat(numOtherSessions) {
                    val session = saveSession(campaign, future = true)
                    saveAttendee(other, session)
                }

                val result = sessionAttendeeRepository.findNextSessionDateByUserEmail(player.email)
                result.shouldBeNull()
            }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun cleanup() {
        sessionAttendeeRepository.deleteAll()
        sessionRepository.deleteAll()
        campaignRepository.deleteAll()
        characterRepository.deleteAll()
        userRepository.deleteAll()
        dndClassRepository.deleteAll()
        dndRaceRepository.deleteAll()
    }

    private fun saveClassAndRace(): Pair<DndClass, DndRace> {
        val dndClass = dndClassRepository.save(
            DndClass(name = "Fighter", price = BigDecimal.ZERO, hitDie = 10, savingThrows = emptyMap())
        )
        val dndRace = dndRaceRepository.save(
            DndRace(
                name = "Human", price = BigDecimal.ZERO,
                bonusStr = 1, bonusDex = 1, bonusCon = 1,
                bonusInt = 1, bonusWis = 1, bonusCha = 1
            )
        )
        return dndClass to dndRace
    }

    private fun savePlayer(): User = userRepository.save(
        User(name = "Player", email = "player_${UUID.randomUUID()}@test.com", passwordHash = "hash")
    )

    private fun saveCharacter(owner: User, dndClass: DndClass, dndRace: DndRace) {
        characterRepository.save(
            Character(
                name = "Char_${UUID.randomUUID()}",
                level = 1, maxHp = 10, currentHp = 10, tempHp = 0,
                speed = 30, hitDiceTotal = 1, hitDiceSpent = 0,
                background = "Acolyte", alignment = "Neutral", xp = 0,
                cp = 0, sp = 0, ep = 0, gp = 0, pp = 0,
                baseStr = 10, baseDex = 10, baseCon = 10,
                baseInt = 10, baseWis = 10, baseCha = 10,
                savingThrowsProficiencies = emptyMap(),
                skillProficiencies = emptyMap(),
                spellSlots = emptyMap(),
                user = owner,
                dndClass = dndClass,
                dndRace = dndRace,
                subclass = null,
                choicesJson = emptyMap()
            )
        )
    }

    private fun saveCampaign(owner: User): Campaign = campaignRepository.save(
        Campaign(name = "Campaign_${UUID.randomUUID()}", description = "desc", owner = owner)
    )

    private fun saveSession(campaign: Campaign, future: Boolean, offsetDays: Long = 1L): Session {
        val date = if (future)
            Timestamp.from(Instant.now().plus(offsetDays, ChronoUnit.DAYS))
        else
            Timestamp.from(Instant.now().minus(offsetDays, ChronoUnit.DAYS))
        return sessionRepository.save(
            Session(scheduledDate = date, price = BigDecimal.ZERO, campaign = campaign)
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

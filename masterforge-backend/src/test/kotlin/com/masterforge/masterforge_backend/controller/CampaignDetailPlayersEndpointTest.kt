package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.util.UUID

/**
 * Unit tests for GET /api/campaigns/{id}/players endpoint.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.8
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignDetailPlayersEndpointTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var campaignEnrollmentRepository: CampaignEnrollmentRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var sessionRepository: SessionRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var jwtService: JwtService

    private lateinit var owner: User
    private lateinit var token: String
    private lateinit var dndClass: DndClass
    private lateinit var dndRace: DndRace

    @BeforeEach
    fun setup() {
        characterRepository.deleteAll()
        sessionRepository.deleteAll()
        campaignEnrollmentRepository.deleteAll()
        campaignRepository.deleteAll()
        userRepository.deleteAll()
        dndClassRepository.deleteAll()
        dndRaceRepository.deleteAll()

        dndClass = dndClassRepository.save(
            DndClass(name = "Fighter", price = BigDecimal.ZERO, hitDie = 10, savingThrows = emptyMap())
        )
        dndRace = dndRaceRepository.save(
            DndRace(
                name = "Human", price = BigDecimal.ZERO,
                bonusStr = 1, bonusDex = 1, bonusCon = 1,
                bonusInt = 1, bonusWis = 1, bonusCha = 1
            )
        )

        owner = userRepository.save(
            User(
                name = "DM_${UUID.randomUUID()}",
                email = "dm_${UUID.randomUUID()}@test.com",
                passwordHash = "hash"
            )
        )
        token = jwtService.generateToken(owner.id!!, owner.email)
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    /**
     * Requirement 2.1: valid campaign UUID with enrolled players → 200 with correct DTO mapping.
     * Requirement 2.7: each player's characters list is filtered to the campaign.
     */
    @Test
    fun `GET players for existing campaign returns 200 with enrolled players and their characters`() {
        val campaign = saveCampaign()
        val player = saveUser("Player")
        enroll(player, campaign)
        val character = saveCharacter(player, campaign)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(player.id!!.toString()))
            .andExpect(jsonPath("$[0].name").value(player.name))
            .andExpect(jsonPath("$[0].email").value(player.email))
            .andExpect(jsonPath("$[0].characters.length()").value(1))
            .andExpect(jsonPath("$[0].characters[0].id").value(character.id!!.toString()))
            .andExpect(jsonPath("$[0].characters[0].name").value(character.name))
            .andExpect(jsonPath("$[0].characters[0].level").value(character.level))
            .andExpect(jsonPath("$[0].characters[0].dndClass").value(dndClass.name))
            .andExpect(jsonPath("$[0].characters[0].dndRace").value(dndRace.name))
    }

    /**
     * Requirement 2.7: characters from other campaigns must not appear in the player's list.
     */
    @Test
    fun `GET players returns only characters belonging to the requested campaign`() {
        val campaign = saveCampaign()
        val otherCampaign = saveCampaign()
        val player = saveUser("Player")
        enroll(player, campaign)

        // Character in the target campaign — should appear
        val targetChar = saveCharacter(player, campaign)
        // Character in another campaign — must NOT appear
        saveCharacter(player, otherCampaign)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].characters.length()").value(1))
            .andExpect(jsonPath("$[0].characters[0].id").value(targetChar.id!!.toString()))
    }

    // ── Not found ─────────────────────────────────────────────────────────────

    /**
     * Requirement 2.2: campaign UUID that does not exist → 404.
     */
    @Test
    fun `GET players for non-existent campaign returns 404`() {
        val nonExistentId = UUID.randomUUID()

        mockMvc.perform(
            get("/api/campaigns/$nonExistentId/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isNotFound)
    }

    // ── Empty enrollment list ─────────────────────────────────────────────────

    /**
     * Requirement 2.3: campaign exists but has no enrolled players → 200 with empty array.
     */
    @Test
    fun `GET players for campaign with no enrollments returns 200 with empty list`() {
        val campaign = saveCampaign()

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(0))
    }

    // ── Player with no characters in campaign ─────────────────────────────────

    /**
     * Requirement 2.8: player enrolled but has no characters in the campaign →
     * player appears in the response with an empty characters list.
     */
    @Test
    fun `GET players includes player with empty characters list when player has no characters in campaign`() {
        val campaign = saveCampaign()
        val player = saveUser("Player")
        enroll(player, campaign)
        // No characters saved for this player in this campaign

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(player.id!!.toString()))
            .andExpect(jsonPath("$[0].characters").isArray)
            .andExpect(jsonPath("$[0].characters.length()").value(0))
    }

    /**
     * Requirement 2.8: player enrolled with characters only in other campaigns →
     * player appears with empty characters list.
     */
    @Test
    fun `GET players includes player with empty characters when all characters are in other campaigns`() {
        val campaign = saveCampaign()
        val otherCampaign = saveCampaign()
        val player = saveUser("Player")
        enroll(player, campaign)

        // Character only in another campaign — must NOT appear
        saveCharacter(player, otherCampaign)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(player.id!!.toString()))
            .andExpect(jsonPath("$[0].characters.length()").value(0))
    }

    /**
     * Requirement 2.1: multiple enrolled players are all returned.
     */
    @Test
    fun `GET players returns all enrolled players`() {
        val campaign = saveCampaign()
        val player1 = saveUser("Player1")
        val player2 = saveUser("Player2")
        val player3 = saveUser("Player3")
        enroll(player1, campaign)
        enroll(player2, campaign)
        enroll(player3, campaign)

        mockMvc.perform(
            get("/api/campaigns/${campaign.id}/players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(3))
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun saveUser(role: String): User = userRepository.save(
        User(
            name = "${role}_${UUID.randomUUID()}",
            email = "${role.lowercase()}_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
    )

    private fun saveCampaign(): Campaign = campaignRepository.save(
        Campaign(
            name = "Campaign_${UUID.randomUUID()}",
            description = "desc",
            owner = owner,
            maxPlayers = 10,
            joinPrice = BigDecimal.ZERO,
            visibility = CampaignVisibility.PRIVATE
        )
    )

    private fun enroll(user: User, campaign: Campaign): CampaignEnrollment =
        campaignEnrollmentRepository.save(
            CampaignEnrollment(campaign = campaign, user = user)
        )

    private fun saveCharacter(owner: User, campaign: Campaign?): Character = characterRepository.save(
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
            campaign = campaign,
            choicesJson = emptyMap()
        )
    )
}

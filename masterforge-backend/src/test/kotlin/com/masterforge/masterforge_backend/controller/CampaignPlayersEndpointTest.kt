package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
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
import java.math.BigDecimal
import java.util.UUID

/**
 * Unit tests for GET /api/users/me/campaign-players endpoint.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 3.3
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampaignPlayersEndpointTest {

    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var characterRepository: CharacterRepository
    @Autowired lateinit var campaignRepository: CampaignRepository
    @Autowired lateinit var dndClassRepository: DndClassRepository
    @Autowired lateinit var dndRaceRepository: DndRaceRepository
    @Autowired lateinit var jwtService: JwtService

    private lateinit var dndClass: DndClass
    private lateinit var dndRace: DndRace

    @BeforeEach
    fun cleanup() {
        characterRepository.deleteAll()
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
    }

    /**
     * Requirement 1.5: IF the request is made without a valid JWT token,
     * THEN the endpoint SHALL return HTTP 401 Unauthorized.
     */
    @Test
    fun `GET campaign-players without JWT returns 401`() {
        mockMvc.perform(
            get("/api/users/me/campaign-players")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isUnauthorized)
    }

    /**
     * Requirement 1.4: WHEN no players exist in the DM's campaigns,
     * THE endpoint SHALL return an empty list.
     */
    @Test
    fun `GET campaign-players for DM with no campaigns returns 200 with empty list`() {
        val dm = saveUser("DM")
        val token = jwtService.generateToken(dm.id!!, dm.email)

        mockMvc.perform(
            get("/api/users/me/campaign-players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(0))
    }

    /**
     * Requirement 1.3: WHEN a user has multiple characters but only some belong to the DM's campaigns,
     * THE endpoint SHALL include only the characters that belong to the DM's campaigns.
     */
    @Test
    fun `GET campaign-players returns only characters in DM-owned campaigns for mixed-campaign player`() {
        val dm = saveUser("DM")
        val otherDm = saveUser("OtherDM")
        val player = saveUser("Player")

        val dmCampaign = saveCampaign(dm)
        val otherCampaign = saveCampaign(otherDm)

        // Character in DM's campaign — should appear
        val dmChar = saveCharacter(player, dmCampaign)
        // Character in another campaign — should NOT appear
        saveCharacter(player, otherCampaign)

        val token = jwtService.generateToken(dm.id!!, dm.email)

        mockMvc.perform(
            get("/api/users/me/campaign-players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value(player.id!!.toString()))
            .andExpect(jsonPath("$[0].characters.length()").value(1))
            .andExpect(jsonPath("$[0].characters[0].id").value(dmChar.id!!.toString()))
    }

    /**
     * Requirement 3.3: WHEN a character is not assigned to any campaign (campaign_id is null),
     * THE endpoint SHALL exclude that character from the response.
     */
    @Test
    fun `GET campaign-players excludes characters with null campaign_id`() {
        val dm = saveUser("DM")
        val player = saveUser("Player")

        val dmCampaign = saveCampaign(dm)

        // Character in DM's campaign — should appear
        val dmChar = saveCharacter(player, dmCampaign)
        // Character with no campaign — should NOT appear
        saveCharacter(player, campaign = null)

        val token = jwtService.generateToken(dm.id!!, dm.email)

        mockMvc.perform(
            get("/api/users/me/campaign-players")
                .header("Authorization", "Bearer $token")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].characters.length()").value(1))
            .andExpect(jsonPath("$[0].characters[0].id").value(dmChar.id!!.toString()))
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun saveUser(role: String): User = userRepository.save(
        User(
            name = "${role}_${UUID.randomUUID()}",
            email = "${role.lowercase()}_${UUID.randomUUID()}@test.com",
            passwordHash = "hash"
        )
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

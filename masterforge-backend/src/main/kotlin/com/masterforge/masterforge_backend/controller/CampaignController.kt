package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CampaignDto
import com.masterforge.masterforge_backend.model.dto.CampaignPlayerDto
import com.masterforge.masterforge_backend.model.dto.CharacterSimpleDto
import com.masterforge.masterforge_backend.model.dto.SessionSummaryDto
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.cache.annotation.CacheEvict
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID

@RestController
@RequestMapping("/api/campaigns")
class CampaignController(
    private val campaignRepository: CampaignRepository,
    private val userRepository: UserRepository,
    private val sessionRepository: SessionRepository,
    private val campaignEnrollmentRepository: CampaignEnrollmentRepository,
    private val characterRepository: CharacterRepository
) {

    @GetMapping
    fun getAllCampaigns(): List<Campaign> {
        return campaignRepository.findAll()
    }

    @GetMapping("/my")
    @Transactional(readOnly = true)
    fun getMyCampaigns(): ResponseEntity<List<Campaign>> {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val dmId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(campaignRepository.findByOwnerId(dmId))
    }

    @PostMapping
    fun createCampaign(@RequestBody campaignDto: CampaignDto): Campaign {
        // Validate fields before entity construction
        if (campaignDto.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign name must not be blank")
        }
        if (campaignDto.maxPlayers < 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "maxPlayers must be at least 1")
        }
        if (campaignDto.joinPrice < BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "joinPrice must be 0 or greater")
        }
        val visibility = try {
            CampaignVisibility.valueOf(campaignDto.visibility)
        } catch (e: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility value: ${campaignDto.visibility}")
        }

        // Find the owner of the campaign. This is a mandatory relationship.
        val owner = userRepository.findById(campaignDto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${campaignDto.ownerId}") }

        // Enforce 2-campaign limit for Free users
        val ownedCampaignsCount = campaignRepository.findByOwnerId(owner.id!!).size
        if (!owner.isPro() && ownedCampaignsCount >= 2) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Free users are limited to 2 campaigns. Upgrade to PRO for unlimited campaigns.")
        }

        // Enforce monetization rules: only Pro users can charge to join
        if (!owner.isPro() && campaignDto.joinPrice > BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only PRO users can monetize their campaigns. Free users must set joinPrice to 0.")
        }

        val campaign = Campaign(
            name = campaignDto.name,
            description = campaignDto.description,
            owner = owner,
            maxPlayers = campaignDto.maxPlayers,
            joinPrice = campaignDto.joinPrice,
            visibility = visibility,
            enrollmentClosed = campaignDto.enrollmentClosed
        )

        return campaignRepository.save(campaign)
    }

    @GetMapping("/{id}")
    fun getCampaignById(@PathVariable id: UUID): ResponseEntity<Campaign> {
        val campaign = campaignRepository.findById(id)
        return if (campaign.isPresent) {
            ResponseEntity.ok(campaign.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateCampaign(@PathVariable id: UUID, @RequestBody dto: CampaignDto): Campaign {
        val existingCampaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found with id $id") }

        // Validate fields before entity construction
        if (dto.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign name must not be blank")
        }
        if (dto.maxPlayers < 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "maxPlayers must be at least 1")
        }
        if (dto.joinPrice < BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "joinPrice must be 0 or greater")
        }
        val visibility = try {
            CampaignVisibility.valueOf(dto.visibility)
        } catch (e: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility value: ${dto.visibility}")
        }

        val owner = userRepository.findById(dto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${dto.ownerId}") }

        val updatedCampaign = existingCampaign.copy(
            name = dto.name,
            description = dto.description,
            owner = owner,
            maxPlayers = dto.maxPlayers,
            joinPrice = dto.joinPrice,
            visibility = visibility,
            enrollmentClosed = dto.enrollmentClosed
        )
        return campaignRepository.save(updatedCampaign)
    }

    @DeleteMapping("/{id}")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun deleteCampaign(@PathVariable id: UUID): ResponseEntity<Void> {
        val campaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }
        
        // Authorization check: Only the owner (DM) can delete the campaign
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can delete this campaign")
        }

        // 1. Unassign all characters associated with this campaign
        val characters = characterRepository.findByCampaignId(id)
        for (character in characters) {
            val updatedChar = character.copy(campaign = null)
            characterRepository.save(updatedChar)
        }

        // 2. Delete all sessions belonging to this campaign
        val sessions = sessionRepository.findByCampaignIdOrderByScheduledDateAsc(id)
        sessionRepository.deleteAll(sessions)

        // 4. Delete all enrollments belonging to this campaign
        val enrollments = campaignEnrollmentRepository.findByCampaignId(id)
        campaignEnrollmentRepository.deleteAll(enrollments)

        // 4. Delete the campaign itself
        campaignRepository.delete(campaign)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{id}/toggle-enrollment")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun toggleEnrollment(@PathVariable id: UUID): ResponseEntity<Campaign> {
        val campaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }
        
        // Authorization check: Only the owner (DM) can toggle enrollment
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can toggle enrollment")
        }

        val updatedCampaign = campaign.copy(enrollmentClosed = !campaign.enrollmentClosed)
        val saved = campaignRepository.save(updatedCampaign)
        return ResponseEntity.ok(saved)
    }

    @PutMapping("/{id}/combat-state")
    @Transactional
    fun updateCombatState(
        @PathVariable id: UUID,
        @RequestBody combatState: Map<String, Any>
    ): ResponseEntity<Void> {
        val campaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }
        
        // Authorization check: Only the owner (DM) can update the combat state
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can update the combat state")
        }

        val updatedCampaign = campaign.copy(combatState = combatState)
        campaignRepository.save(updatedCampaign)
        return ResponseEntity.noContent().build()
    }

    /**
     * GET /api/campaigns/{id}/sessions
     *
     * Returns the sessions for a specific campaign, ordered ascending by scheduledDate.
     * Returns 404 if the campaign does not exist, 200 with an empty list if it has no sessions.
     *
     * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
     */
    @GetMapping("/{id}/sessions")
    @Transactional(readOnly = true)
    fun getCampaignSessions(@PathVariable id: UUID): ResponseEntity<List<SessionSummaryDto>> {
        if (!campaignRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        val sessions = sessionRepository.findByCampaignIdOrderByScheduledDateAsc(id)
        val dtos = sessions.map { session ->
            SessionSummaryDto(
                id = session.id!!,
                name = session.name,
                scheduledDate = session.scheduledDate
                    .toInstant()
                    .atOffset(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            )
        }
        return ResponseEntity.ok(dtos)
    }

    /**
     * GET /api/campaigns/{id}/players
     *
     * Returns the players enrolled in a specific campaign along with their characters
     * for that campaign.
     * Returns 404 if the campaign does not exist, 200 with an empty list if no players enrolled.
     *
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
     */
    @GetMapping("/{id}/players")
    @Transactional(readOnly = true)
    fun getCampaignPlayers(@PathVariable id: UUID): ResponseEntity<List<CampaignPlayerDto>> {
        if (!campaignRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        val enrollments = campaignEnrollmentRepository.findByCampaignId(id)
        val dtos = enrollments.map { enrollment ->
            val user = enrollment.user
            val characters = characterRepository.findByCampaignIdAndUserId(id, user.id!!)
                .map { character ->
                    CharacterSimpleDto(
                        id = character.id!!,
                        name = character.name,
                        level = character.level,
                        dndClass = character.dndClass.name,
                        dndRace = character.dndRace.name
                    )
                }
            CampaignPlayerDto(
                id = user.id!!,
                name = user.name,
                email = user.email,
                subscriptionTier = if (user.role == "MANAGER" || user.role == "ADMIN") "PRO" else user.subscriptionTier.toString(),
                discordUsername = user.discordUsername,
                characters = characters
            )
        }
        return ResponseEntity.ok(dtos)
    }
}

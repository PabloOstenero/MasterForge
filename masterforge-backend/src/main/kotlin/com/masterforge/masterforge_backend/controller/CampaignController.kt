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
import com.masterforge.masterforge_backend.repository.PaymentTransactionRepository
import com.masterforge.masterforge_backend.model.entity.PaymentStatus
import com.masterforge.masterforge_backend.model.entity.PaymentTransaction
import org.springframework.cache.annotation.CacheEvict
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import com.masterforge.masterforge_backend.service.NotificationService
import com.masterforge.masterforge_backend.service.PushNotificationService
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
    private val characterRepository: CharacterRepository,
    private val notificationService: NotificationService,
    private val pushNotificationService: PushNotificationService,
    private val paymentTransactionRepository: PaymentTransactionRepository
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
            enrollmentClosed = campaignDto.enrollmentClosed ?: false
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
            enrollmentClosed = dto.enrollmentClosed ?: false
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

        // 4. Delete all enrollments belonging to this campaign (with 14-day refund window)
        val enrollments = campaignEnrollmentRepository.findByCampaignId(id)
        for (enrollment in enrollments) {
            val isEligibleForRefund = enrollment.paymentTransactionId != null &&
                    campaign.joinPrice > BigDecimal.ZERO &&
                    enrollment.enrolledAt.isAfter(java.time.LocalDateTime.now().minusDays(14))

            if (isEligibleForRefund) {
                val player = enrollment.user
                val dm = campaign.owner

                // Process balance adjustments (guaranteed to succeed even if DM's balance goes negative)
                dm.balance = dm.balance.subtract(campaign.joinPrice)
                player.balance = player.balance.add(campaign.joinPrice)

                userRepository.save(dm)
                userRepository.save(player)

                // Log debit for DM
                paymentTransactionRepository.save(
                    PaymentTransaction(
                        userId = dm.id!!,
                        relatedUserId = player.id!!,
                        campaignId = id,
                        amount = campaign.joinPrice,
                        status = PaymentStatus.COMPLETED,
                        transactionType = "CAMPAIGN_DELETE_REFUND",
                        isCredit = false,
                        processedAt = java.time.LocalDateTime.now(),
                        mockCardLastFour = "WALLET"
                    )
                )

                // Log credit for Player
                paymentTransactionRepository.save(
                    PaymentTransaction(
                        userId = player.id!!,
                        relatedUserId = dm.id!!,
                        campaignId = id,
                        amount = campaign.joinPrice,
                        status = PaymentStatus.COMPLETED,
                        transactionType = "CAMPAIGN_DELETE_REFUND",
                        isCredit = true,
                        processedAt = java.time.LocalDateTime.now(),
                        mockCardLastFour = "WALLET"
                    )
                )
            }
        }
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
                subscriptionTier = if (user.isPro()) "PRO" else "FREE",
                discordUsername = user.discordUsername,
                characters = characters
            )
        }
        return ResponseEntity.ok(dtos)
    }

    @DeleteMapping("/{id}/players/{playerId}")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun kickPlayer(
        @PathVariable id: UUID,
        @PathVariable playerId: UUID
    ): ResponseEntity<Void> {
        val campaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }

        // Authorization check: Only the owner (DM) can kick players
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can kick players from this campaign")
        }

        // Find the enrollment
        val enrollment = campaignEnrollmentRepository.findByCampaignId(id)
            .find { it.user.id == playerId }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Player is not enrolled in this campaign")

        // 1. Unassign all characters owned by this player that are assigned to this campaign
        val playerCharacters = characterRepository.findByCampaignIdAndUserId(id, playerId)
        for (character in playerCharacters) {
            val updatedChar = character.copy(campaign = null)
            characterRepository.save(updatedChar)
        }

        // 1.5. Check refund eligibility (enrolled in last 14 days AND campaign has a joinPrice and transaction was paid)
        val isEligibleForRefund = enrollment.paymentTransactionId != null &&
                campaign.joinPrice > BigDecimal.ZERO &&
                enrollment.enrolledAt.isAfter(java.time.LocalDateTime.now().minusDays(14))

        if (isEligibleForRefund) {
            val player = enrollment.user
            val dm = campaign.owner

            // Process balance adjustments (guaranteed to succeed even if DM's balance goes negative)
            dm.balance = dm.balance.subtract(campaign.joinPrice)
            player.balance = player.balance.add(campaign.joinPrice)

            userRepository.save(dm)
            userRepository.save(player)

            // Log debit for DM
            paymentTransactionRepository.save(
                PaymentTransaction(
                    userId = dm.id!!,
                    relatedUserId = player.id!!,
                    campaignId = id,
                    amount = campaign.joinPrice,
                    status = PaymentStatus.COMPLETED,
                    transactionType = "CAMPAIGN_KICK_REFUND",
                    isCredit = false,
                    processedAt = java.time.LocalDateTime.now(),
                    mockCardLastFour = "WALLET"
                )
            )

            // Log credit for Player
            paymentTransactionRepository.save(
                PaymentTransaction(
                    userId = player.id!!,
                    relatedUserId = dm.id!!,
                    campaignId = id,
                    amount = campaign.joinPrice,
                    status = PaymentStatus.COMPLETED,
                    transactionType = "CAMPAIGN_KICK_REFUND",
                    isCredit = true,
                    processedAt = java.time.LocalDateTime.now(),
                    mockCardLastFour = "WALLET"
                )
            )
        }

        // 2. Delete the enrollment
        campaignEnrollmentRepository.delete(enrollment)

        // 3. Notify the player that they were removed
        val player = enrollment.user
        val title = "Retirado de Campaña: ${campaign.name}"
        val message = "El Director de Juego te ha retirado de la campaña '${campaign.name}'."
        val link = "/my-campaigns"

        try {
            // Create in-app notification
            notificationService.createNotification(player, title, message, link)

            // Send push notification
            if (player.sessionNotifications && player.fcmTokens.isNotEmpty()) {
                pushNotificationService.sendPushNotification(
                    player.fcmTokens,
                    title,
                    message,
                    mapOf("campaignId" to id.toString(), "type" to "CAMPAIGN_KICK")
                )
            }
        } catch (e: Exception) {
            // Log/ignore notification failures so player removal still succeeds
        }

        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/{id}/leave")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun leaveCampaign(
        @PathVariable id: UUID
    ): ResponseEntity<Void> {
        val campaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }

        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)

        // Make sure the Game Master cannot leave their own campaign this way (they must delete it)
        if (campaign.owner.id == currentUserId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Game Master cannot leave their own campaign. Delete it instead.")
        }

        // Find the enrollment for currentUserId
        val enrollment = campaignEnrollmentRepository.findByCampaignId(id)
            .find { it.user.id == currentUserId }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "You are not enrolled in this campaign")

        // 1. Unassign all characters owned by this player that are assigned to this campaign
        val playerCharacters = characterRepository.findByCampaignIdAndUserId(id, currentUserId)
        for (character in playerCharacters) {
            val updatedChar = character.copy(campaign = null)
            characterRepository.save(updatedChar)
        }

        // 1.5. Check refund eligibility (enrolled in last 14 days AND campaign has a joinPrice and transaction was paid)
        val isEligibleForRefund = enrollment.paymentTransactionId != null &&
                campaign.joinPrice > BigDecimal.ZERO &&
                enrollment.enrolledAt.isAfter(java.time.LocalDateTime.now().minusDays(14))

        if (isEligibleForRefund) {
            val player = enrollment.user
            val dm = campaign.owner

            // Process balance adjustments
            dm.balance = dm.balance.subtract(campaign.joinPrice)
            player.balance = player.balance.add(campaign.joinPrice)

            userRepository.save(dm)
            userRepository.save(player)

            // Log debit for DM
            paymentTransactionRepository.save(
                PaymentTransaction(
                    userId = dm.id!!,
                    relatedUserId = player.id!!,
                    campaignId = id,
                    amount = campaign.joinPrice,
                    status = PaymentStatus.COMPLETED,
                    transactionType = "CAMPAIGN_LEAVE_REFUND",
                    isCredit = false,
                    processedAt = java.time.LocalDateTime.now(),
                    mockCardLastFour = "WALLET"
                )
            )

            // Log credit for Player
            paymentTransactionRepository.save(
                PaymentTransaction(
                    userId = player.id!!,
                    relatedUserId = dm.id!!,
                    campaignId = id,
                    amount = campaign.joinPrice,
                    status = PaymentStatus.COMPLETED,
                    transactionType = "CAMPAIGN_LEAVE_REFUND",
                    isCredit = true,
                    processedAt = java.time.LocalDateTime.now(),
                    mockCardLastFour = "WALLET"
                )
            )
        }

        // 2. Delete the enrollment
        campaignEnrollmentRepository.delete(enrollment)

        // 3. Notify the DM that the player left
        val title = "Jugador ha salido: ${campaign.name}"
        val message = "${enrollment.user.name} ha salido de la campaña '${campaign.name}'."
        val link = "/campaigns/${campaign.id}"

        try {
            // Create in-app notification for the DM
            notificationService.createNotification(campaign.owner, title, message, link)

            // Send push notification to the DM
            if (campaign.owner.sessionNotifications && campaign.owner.fcmTokens.isNotEmpty()) {
                pushNotificationService.sendPushNotification(
                    campaign.owner.fcmTokens,
                    title,
                    message,
                    mapOf("campaignId" to id.toString(), "type" to "CAMPAIGN_LEAVE")
                )
            }
        } catch (e: Exception) {
            // Log/ignore notification failures
        }

        return ResponseEntity.noContent().build()
    }
}


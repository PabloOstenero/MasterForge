package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.SessionDto
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.service.NotificationService
import com.masterforge.masterforge_backend.service.PushNotificationService
import org.springframework.cache.annotation.CacheEvict
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/sessions")
class SessionController(
    private val sessionRepository: SessionRepository,
    private val campaignRepository: CampaignRepository,
    private val enrollmentRepository: CampaignEnrollmentRepository,
    private val notificationService: NotificationService,
    private val pushNotificationService: PushNotificationService
) {

    @GetMapping
    fun getAllSessions(): List<Session> {
        return sessionRepository.findAll()
    }

    @PostMapping
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun createSession(@RequestBody sessionDto: SessionDto): Session {
        // Find the parent campaign for this session.
        val campaign = campaignRepository.findById(sessionDto.campaignId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id ${sessionDto.campaignId}") }

        // Authorization check: Only the campaign owner (DM) can create sessions
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can schedule sessions")
        }

        val session = Session(
            name = sessionDto.name,
            scheduledDate = sessionDto.scheduledDate,
            campaign = campaign
        )
        val savedSession = sessionRepository.save(session)

        // Notify enrolled players
        val enrollments = enrollmentRepository.findByCampaignId(campaign.id!!)
        enrollments.forEach { enrollment ->
            val player = enrollment.user
            val title = "Nueva Sesión: ${campaign.name}"
            val message = "Se ha programado una nueva sesión: ${session.name}"
            val link = "/campaigns/${campaign.id}"

            // 1. Create In-App Notification
            notificationService.createNotification(player, title, message, link)

            // 2. Send Push Notification
            if (player.sessionNotifications && player.fcmTokens.isNotEmpty()) {
                pushNotificationService.sendPushNotification(
                    tokens = player.fcmTokens,
                    title = title,
                    body = message,
                    data = mapOf("campaignId" to campaign.id.toString(), "type" to "SESSION_ALERT")
                )
            }
        }

        return savedSession
    }

    @GetMapping("/{id}")
    fun getSessionById(@PathVariable id: UUID): ResponseEntity<Session> {
        val session = sessionRepository.findById(id)
        return if (session.isPresent) {
            ResponseEntity.ok(session.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun updateSession(@PathVariable id: UUID, @RequestBody dto: SessionDto): Session {
        val existingSession = sessionRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found with id $id") }

        val campaign = campaignRepository.findById(dto.campaignId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id ${dto.campaignId}") }

        // Authorization check: Only the campaign owner (DM) can update sessions
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can modify sessions")
        }

        val updatedSession = existingSession.copy(
            name = dto.name,
            scheduledDate = dto.scheduledDate,
            campaign = campaign
        )
        val savedSession = sessionRepository.save(updatedSession)

        // Notify enrolled players about the modification
        val enrollments = enrollmentRepository.findByCampaignId(campaign.id!!)
        enrollments.forEach { enrollment ->
            val player = enrollment.user
            val title = "Sesión Modificada: ${campaign.name}"
            val message = "La sesión '${savedSession.name}' ha sido reprogramada para el ${savedSession.scheduledDate}"
            val link = "/campaigns/${campaign.id}"

            // 1. Create In-App Notification
            notificationService.createNotification(player, title, message, link)

            // 2. Send Push Notification
            if (player.sessionNotifications && player.fcmTokens.isNotEmpty()) {
                pushNotificationService.sendPushNotification(
                    tokens = player.fcmTokens,
                    title = title,
                    body = message,
                    data = mapOf("campaignId" to campaign.id.toString(), "type" to "SESSION_ALERT")
                )
            }
        }

        return savedSession
    }

    @DeleteMapping("/{id}")
    @Transactional
    @CacheEvict(value = ["campaignSearch"], allEntries = true)
    fun deleteSession(@PathVariable id: UUID): ResponseEntity<Void> {
        val session = sessionRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found with id $id") }
        
        val campaign = session.campaign

        // Authorization check: Only the campaign owner (DM) can delete sessions
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        val currentUserId = UUID.fromString(authentication.name)
        if (campaign.owner.id != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the Game Master can delete sessions")
        }

        sessionRepository.delete(session)

        // Notify enrolled players about the cancellation
        val enrollments = enrollmentRepository.findByCampaignId(campaign.id!!)
        enrollments.forEach { enrollment ->
            val player = enrollment.user
            val title = "Sesión Cancelada: ${campaign.name}"
            val message = "La sesión '${session.name}' programada para el ${session.scheduledDate} ha sido cancelada"
            val link = "/campaigns/${campaign.id}"

            // 1. Create In-App Notification
            notificationService.createNotification(player, title, message, link)

            // 2. Send Push Notification
            if (player.sessionNotifications && player.fcmTokens.isNotEmpty()) {
                pushNotificationService.sendPushNotification(
                    tokens = player.fcmTokens,
                    title = title,
                    body = message,
                    data = mapOf("campaignId" to campaign.id.toString(), "type" to "SESSION_ALERT")
                )
            }
        }

        return ResponseEntity.noContent().build()
    }
}

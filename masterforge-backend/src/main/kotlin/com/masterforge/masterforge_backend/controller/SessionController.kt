package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.SessionDto
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = ["*"])
class SessionController(
    private val sessionRepository: SessionRepository,
    private val campaignRepository: CampaignRepository
) {

    @GetMapping
    fun getAllSessions(): List<Session> {
        return sessionRepository.findAll()
    }

    @PostMapping
    fun createSession(@RequestBody sessionDto: SessionDto): Session {
        // Find the parent campaign for this session.
        val campaign = campaignRepository.findById(sessionDto.campaignId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id ${sessionDto.campaignId}") }

        val session = Session(
            scheduledDate = sessionDto.scheduledDate,
            price = sessionDto.price,
            campaign = campaign
        )
        return sessionRepository.save(session)
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
}

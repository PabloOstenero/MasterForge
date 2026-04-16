package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.SessionAttendeeDto
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/session-attendees")
@CrossOrigin(origins = ["*"])
class SessionAttendeeController(
    private val sessionAttendeeRepository: SessionAttendeeRepository,
    private val sessionRepository: SessionRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllSessionAttendees(): List<SessionAttendee> {
        return sessionAttendeeRepository.findAll()
    }

    @PostMapping
    fun createSessionAttendee(@RequestBody dto: SessionAttendeeDto): SessionAttendee {
        // Resolve both sides of the many-to-many relationship.
        val session = sessionRepository.findById(dto.sessionId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Session not found with id ${dto.sessionId}") }
        val user = userRepository.findById(dto.userId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id ${dto.userId}") }

        // Create the composite key for the join table.
        val sessionAttendeeId = SessionAttendeeId(
            sessionId = dto.sessionId,
            userId = dto.userId
        )

        val sessionAttendee = SessionAttendee(
            id = sessionAttendeeId,
            hasPaid = dto.hasPaid,
            session = session,
            user = user
        )

        return sessionAttendeeRepository.save(sessionAttendee)
    }

    @GetMapping("/{sessionId}/{userId}")
    fun getSessionAttendeeById(@PathVariable sessionId: UUID, @PathVariable userId: UUID): ResponseEntity<SessionAttendee> {
        val id = SessionAttendeeId(sessionId, userId)
        val sessionAttendee = sessionAttendeeRepository.findById(id)
        return if (sessionAttendee.isPresent) {
            ResponseEntity.ok(sessionAttendee.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }
}

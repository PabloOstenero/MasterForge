package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/session-attendees")
@CrossOrigin(origins = ["*"])
class SessionAttendeeController(private val sessionAttendeeRepository: SessionAttendeeRepository) {

    @GetMapping
    fun getAllSessionAttendees(): List<SessionAttendee> {
        return sessionAttendeeRepository.findAll()
    }

    @PostMapping
    fun createSessionAttendee(@RequestBody sessionAttendee: SessionAttendee): SessionAttendee {
        return sessionAttendeeRepository.save(sessionAttendee)
    }

    @GetMapping("/{sessionId}/{clientId}")
    fun getSessionAttendeeById(@PathVariable sessionId: UUID, @PathVariable clientId: UUID): ResponseEntity<SessionAttendee> {
        val id = SessionAttendeeId(sessionId, clientId)
        val sessionAttendee = sessionAttendeeRepository.findById(id)
        return if (sessionAttendee.isPresent) {
            ResponseEntity.ok(sessionAttendee.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }
}

package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.repository.SessionRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = ["*"])
class SessionController(private val sessionRepository: SessionRepository) {

    @GetMapping
    fun getAllSessions(): List<Session> {
        return sessionRepository.findAll()
    }

    @PostMapping
    fun createSession(@RequestBody session: Session): Session {
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

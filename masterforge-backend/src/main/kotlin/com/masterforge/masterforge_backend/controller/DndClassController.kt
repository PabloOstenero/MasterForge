package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.DndClassDto
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional

@RestController
@RequestMapping("/api/dnd-classes")
class DndClassController(
    private val dndClassRepository: DndClassRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService
) {

    @GetMapping
    fun getAllDndClasses(): List<DndClass> {
        return dndClassRepository.findAll()
    }

    @PostMapping
    @Transactional
    fun createDndClass(@RequestBody dto: DndClassDto): DndClass {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val shouldBeOfficial = isManagerOrAdmin && dto.isOfficial == true

        val author: User? = if (shouldBeOfficial) {
            null
        } else {
            homebrewService.verifyCreationLimit(currentUser)
            homebrewService.verifyMonetization(currentUser, dto.price)
            currentUser
        }

        val dndClass = DndClass(
            name = dto.name,
            description = dto.description,
            price = dto.price,
            hitDie = dto.hitDie,
            savingThrows = dto.savingThrows,
            classFeatures = dto.classFeatures,
            author = author
        )
        return dndClassRepository.save(dndClass)
    }

    @GetMapping("/{id}")
    fun getDndClassById(@PathVariable id: Int): ResponseEntity<DndClass> {
        val dndClass = dndClassRepository.findById(id)
        return if (dndClass.isPresent) {
            ResponseEntity.ok(dndClass.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    @Transactional
    fun updateDndClass(@PathVariable id: Int, @RequestBody dto: DndClassDto): DndClass {
        val existingClass = dndClassRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Class not found with id $id") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"

        // Verify update permission
        val existingAuthorId = existingClass.author?.id
        if (existingAuthorId == null) {
            // Official content
            if (!isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only managers can update official content")
            }
        } else {
            // Community content
            if (existingAuthorId != currentUserId && !isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this content")
            }
        }

        val shouldBeOfficial = isManagerOrAdmin && dto.isOfficial == true
        val author: User? = if (shouldBeOfficial) {
            null
        } else {
            homebrewService.verifyMonetization(currentUser, dto.price)
            currentUser
        }

        val updatedClass = existingClass.copy(
            name = dto.name,
            description = dto.description,
            price = dto.price,
            hitDie = dto.hitDie,
            savingThrows = dto.savingThrows,
            classFeatures = dto.classFeatures,
            author = author
        )
        return dndClassRepository.save(updatedClass)
    }

    @DeleteMapping("/{id}")
    fun deleteDndClass(@PathVariable id: Int): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val dndClass = dndClassRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Class not found with id $id") }

        // Verify delete permission
        val existingAuthorId = dndClass.author?.id
        if (existingAuthorId == null) {
            // Official content
            if (!isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only managers can delete official content")
            }
        } else {
            // Community content
            if (existingAuthorId != currentUserId && !isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this content")
            }
        }

        dndClassRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

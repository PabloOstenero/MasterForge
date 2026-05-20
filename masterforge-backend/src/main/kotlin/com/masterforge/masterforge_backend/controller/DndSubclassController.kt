package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.DndSubclassDto
import com.masterforge.masterforge_backend.model.entity.DndSubclass
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndSubclassRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.repository.HomebrewCollectionRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/dnd-subclasses")
class DndSubclassController(
    private val dndSubclassRepository: DndSubclassRepository,
    private val dndClassRepository: DndClassRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService,
    private val homebrewCollectionRepository: HomebrewCollectionRepository
) {

    @GetMapping
    fun getAllDndSubclasses(): List<DndSubclass> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val allSub = dndSubclassRepository.findAll()
        val ownedIds = homebrewCollectionRepository.findByUserId(currentUserId)
            .filter { it.contentType == "SUBCLASS" }
            .map { it.contentId }
            .toSet()

        return allSub.filter { sub ->
            sub.author == null || 
            sub.author?.id == currentUserId || 
            ownedIds.contains(sub.id.toString())
        }
    }
    
    @GetMapping("/class/{classId}")
    fun getSubclassesByParentClass(@PathVariable classId: Int): List<DndSubclass> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val allSub = dndSubclassRepository.findByParentClassId(classId)
        val ownedIds = homebrewCollectionRepository.findByUserId(currentUserId)
            .filter { it.contentType == "SUBCLASS" }
            .map { it.contentId }
            .toSet()

        return allSub.filter { sub ->
            sub.author == null || 
            sub.author?.id == currentUserId || 
            ownedIds.contains(sub.id.toString())
        }
    }

    @PostMapping
    fun createDndSubclass(@RequestBody dto: DndSubclassDto): DndSubclass {
        val parentClass = dndClassRepository.findById(dto.parentClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent class not found with id ${dto.parentClassId}") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val shouldBeOfficial = isManagerOrAdmin && dto.isOfficial == true

        val author: User? = if (shouldBeOfficial) {
            null
        } else {
            homebrewService.verifyCreationLimit(currentUser)
            homebrewService.verifyMonetization(currentUser, dto.price ?: java.math.BigDecimal.ZERO)
            currentUser
        }

        val dndSubclass = DndSubclass(
            name = dto.name,
            description = dto.description,
            parentClass = parentClass,
            author = author,
            subclassFeatures = dto.subclassFeatures
        )
        return dndSubclassRepository.save(dndSubclass)
    }

    @GetMapping("/{id}")
    fun getDndSubclassById(@PathVariable id: Int): ResponseEntity<DndSubclass> {
        val dndSubclass = dndSubclassRepository.findById(id)
        return if (dndSubclass.isPresent) {
            ResponseEntity.ok(dndSubclass.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateDndSubclass(@PathVariable id: Int, @RequestBody dto: DndSubclassDto): DndSubclass {
        val existingSubclass = dndSubclassRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Subclass not found with id $id") }

        val parentClass = dndClassRepository.findById(dto.parentClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent class not found with id ${dto.parentClassId}") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"

        // Verify update permission
        val existingAuthorId = existingSubclass.author?.id
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
            homebrewService.verifyMonetization(currentUser, dto.price ?: java.math.BigDecimal.ZERO)
            currentUser
        }

        val updatedSubclass = existingSubclass.copy(
            name = dto.name,
            description = dto.description,
            parentClass = parentClass,
            author = author,
            subclassFeatures = dto.subclassFeatures
        )
        return dndSubclassRepository.save(updatedSubclass)
    }

    @DeleteMapping("/{id}")
    fun deleteDndSubclass(@PathVariable id: Int): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val dndSubclass = dndSubclassRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Subclass not found with id $id") }

        // Verify delete permission
        val existingAuthorId = dndSubclass.author?.id
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

        dndSubclassRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

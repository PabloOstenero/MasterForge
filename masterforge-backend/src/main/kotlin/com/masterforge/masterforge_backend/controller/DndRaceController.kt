package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.DndRaceDto
import com.masterforge.masterforge_backend.model.dto.DndRaceResponseDto
import com.masterforge.masterforge_backend.model.dto.RaceTraitSummary
import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/dnd-races")
class DndRaceController(
    private val dndRaceRepository: DndRaceRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService
) {

    @GetMapping
    fun getAllDndRaces(): List<DndRace> {
        return dndRaceRepository.findAll()
    }

    @PostMapping
    fun createDndRace(@RequestBody dto: DndRaceDto): DndRace {
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

        val dndRace = DndRace(
            name = dto.name,
            price = dto.price,
            raceFeatures = dto.raceFeatures ?: emptyMap(),
            size = dto.size,
            description = dto.description,
            author = author
        )
        return dndRaceRepository.save(dndRace)
    }

    @GetMapping("/{id}")
    fun getDndRaceById(@PathVariable id: Int): ResponseEntity<DndRaceResponseDto> {
        val dndRace = dndRaceRepository.findById(id)
        return if (dndRace.isPresent) {
            val race = dndRace.get()
            val traitSummaries = race.traits.map { trait ->
                RaceTraitSummary(
                    id = trait.id ?: 0,
                    name = trait.name,
                    description = trait.description,
                    levelRequired = trait.levelRequired,
                    options = trait.options,
                    properties = trait.properties
                )
            }
            val responseDto = DndRaceResponseDto(
                id = race.id,
                name = race.name,
                price = race.price,
                description = race.description,
                size = race.size,
                raceFeatures = race.raceFeatures ?: emptyMap(),
                traits = traitSummaries
            )
            ResponseEntity.ok(responseDto)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateDndRace(@PathVariable id: Int, @RequestBody dto: DndRaceDto): DndRace {
        val existingRace = dndRaceRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Race not found with id $id") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"

        // Verify update permission
        val existingAuthorId = existingRace.author?.id
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

        val updatedRace = existingRace.copy(
            name = dto.name,
            price = dto.price,
            raceFeatures = dto.raceFeatures ?: emptyMap(),
            size = dto.size,
            description = dto.description,
            author = author
        )
        return dndRaceRepository.save(updatedRace)
    }

    @DeleteMapping("/{id}")
    fun deleteDndRace(@PathVariable id: Int): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val dndRace = dndRaceRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Race not found with id $id") }

        // Verify delete permission
        val existingAuthorId = dndRace.author?.id
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

        dndRaceRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

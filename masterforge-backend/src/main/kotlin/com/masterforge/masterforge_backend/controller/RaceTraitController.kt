package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.RaceTraitDto
import com.masterforge.masterforge_backend.model.entity.RaceTrait
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.RaceTraitRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/race-traits")
class RaceTraitController(
    private val raceTraitRepository: RaceTraitRepository,
    private val dndRaceRepository: DndRaceRepository
) {

    @GetMapping
    fun getAllRaceTraits(): List<RaceTrait> {
        return raceTraitRepository.findAll()
    }

    @PostMapping
    fun createRaceTrait(@RequestBody dto: RaceTraitDto): RaceTrait {
        val race = dndRaceRepository.findById(dto.raceId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Race not found with id ${dto.raceId}") }

        val raceTrait = RaceTrait(
            name = dto.name,
            description = dto.description,
            race = race
        )
        return raceTraitRepository.save(raceTrait)
    }

    @GetMapping("/{id}")
    fun getRaceTraitById(@PathVariable id: Long): ResponseEntity<RaceTrait> {
        val raceTrait = raceTraitRepository.findById(id)
        return if (raceTrait.isPresent) {
            ResponseEntity.ok(raceTrait.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateRaceTrait(@PathVariable id: Long, @RequestBody dto: RaceTraitDto): RaceTrait {
        val existingTrait = raceTraitRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Race Trait not found with id $id") }

        val race = dndRaceRepository.findById(dto.raceId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Race not found with id ${dto.raceId}") }

        val updatedTrait = existingTrait.copy(
            name = dto.name,
            description = dto.description,
            race = race
        )
        return raceTraitRepository.save(updatedTrait)
    }

    @DeleteMapping("/{id}")
    fun deleteRaceTrait(@PathVariable id: Long): ResponseEntity<Void> {
        if (!raceTraitRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        raceTraitRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.DndRaceDto
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
@CrossOrigin(origins = ["*"])
class DndRaceController(
    private val dndRaceRepository: DndRaceRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllDndRaces(): List<DndRace> {
        return dndRaceRepository.findAll()
    }

    @PostMapping
    fun createDndRace(@RequestBody dto: DndRaceDto): DndRace {
        // The author is optional. If an authorId is provided, find the user.
        // If not, the author will be null, marking it as a system-owned entity.
        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val dndRace = DndRace(
            name = dto.name,
            price = dto.price,
            bonusStr = dto.bonusStr,
            bonusDex = dto.bonusDex,
            bonusCon = dto.bonusCon,
            bonusInt = dto.bonusInt,
            bonusWis = dto.bonusWis,
            bonusCha = dto.bonusCha,
            author = author
        )
        return dndRaceRepository.save(dndRace)
    }

    @GetMapping("/{id}")
    fun getDndRaceById(@PathVariable id: Int): ResponseEntity<DndRace> {
        val dndRace = dndRaceRepository.findById(id)
        return if (dndRace.isPresent) {
            ResponseEntity.ok(dndRace.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateDndRace(@PathVariable id: Int, @RequestBody dto: DndRaceDto): DndRace {
        val existingRace = dndRaceRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Race not found with id $id") }

        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val updatedRace = existingRace.copy(
            name = dto.name,
            price = dto.price,
            bonusStr = dto.bonusStr,
            bonusDex = dto.bonusDex,
            bonusCon = dto.bonusCon,
            bonusInt = dto.bonusInt,
            bonusWis = dto.bonusWis,
            bonusCha = dto.bonusCha,
            author = author
        )
        return dndRaceRepository.save(updatedRace)
    }

    @DeleteMapping("/{id}")
    fun deleteDndRace(@PathVariable id: Int): ResponseEntity<Void> {
        if (!dndRaceRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        dndRaceRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

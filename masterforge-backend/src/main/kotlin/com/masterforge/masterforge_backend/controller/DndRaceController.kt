package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.DndRace
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/dnd-races")
@CrossOrigin(origins = ["*"])
class DndRaceController(private val dndRaceRepository: DndRaceRepository) {

    @GetMapping
    fun getAllDndRaces(): List<DndRace> {
        return dndRaceRepository.findAll()
    }

    @PostMapping
    fun createDndRace(@RequestBody dndRace: DndRace): DndRace {
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
}

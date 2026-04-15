package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.repository.DndClassRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/dnd-classes")
@CrossOrigin(origins = ["*"])
class DndClassController(private val dndClassRepository: DndClassRepository) {

    @GetMapping
    fun getAllDndClasses(): List<DndClass> {
        return dndClassRepository.findAll()
    }

    @PostMapping
    fun createDndClass(@RequestBody dndClass: DndClass): DndClass {
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
}

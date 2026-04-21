package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.DndClassDto
import com.masterforge.masterforge_backend.model.entity.DndClass
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/dnd-classes")
@CrossOrigin(origins = ["*"])
class DndClassController(
    private val dndClassRepository: DndClassRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllDndClasses(): List<DndClass> {
        return dndClassRepository.findAll()
    }

    @PostMapping
    fun createDndClass(@RequestBody dto: DndClassDto): DndClass {
        // The author is optional. If an authorId is provided, find the user.
        // If not, the author will be null, marking it as a system-owned entity.
        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val dndClass = DndClass(
            name = dto.name,
            price = dto.price,
            hitDie = dto.hitDie,
            savingThrows = dto.savingThrows,
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
    fun updateDndClass(@PathVariable id: Int, @RequestBody dto: DndClassDto): DndClass {
        val existingClass = dndClassRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "D&D Class not found with id $id") }

        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val updatedClass = existingClass.copy(
            name = dto.name,
            price = dto.price,
            hitDie = dto.hitDie,
            savingThrows = dto.savingThrows,
            author = author
        )
        return dndClassRepository.save(updatedClass)
    }

    @DeleteMapping("/{id}")
    fun deleteDndClass(@PathVariable id: Int): ResponseEntity<Void> {
        if (!dndClassRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        dndClassRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

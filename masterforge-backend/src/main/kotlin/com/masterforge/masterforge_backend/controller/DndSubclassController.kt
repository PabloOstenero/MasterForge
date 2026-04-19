package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.DndSubclassDto
import com.masterforge.masterforge_backend.model.entity.DndSubclass
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndSubclassRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/dnd-subclasses")
@CrossOrigin(origins = ["*"])
class DndSubclassController(
    private val dndSubclassRepository: DndSubclassRepository,
    private val dndClassRepository: DndClassRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllDndSubclasses(): List<DndSubclass> {
        return dndSubclassRepository.findAll()
    }

    @PostMapping
    fun createDndSubclass(@RequestBody dto: DndSubclassDto): DndSubclass {
        val parentClass = dndClassRepository.findById(dto.parentClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent class not found with id ${dto.parentClassId}") }

        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val dndSubclass = DndSubclass(
            name = dto.name,
            description = dto.description,
            parentClass = parentClass,
            author = author
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
}

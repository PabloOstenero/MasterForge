package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.ClassFeatureDto
import com.masterforge.masterforge_backend.model.entity.ClassFeature
import com.masterforge.masterforge_backend.repository.ClassFeatureRepository
import com.masterforge.masterforge_backend.repository.DndClassRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/class-features")
class ClassFeatureController(
    private val classFeatureRepository: ClassFeatureRepository,
    private val dndClassRepository: DndClassRepository
) {

    @GetMapping
    fun getAllClassFeatures(): List<ClassFeature> {
        return classFeatureRepository.findAll()
    }

    @PostMapping
    fun createClassFeature(@RequestBody dto: ClassFeatureDto): ClassFeature {
        val dndClass = dndClassRepository.findById(dto.dndClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Class not found with id ${dto.dndClassId}") }

        val classFeature = ClassFeature(
            name = dto.name,
            description = dto.description,
            levelRequired = dto.levelRequired,
            dndClass = dndClass
        )
        return classFeatureRepository.save(classFeature)
    }

    @GetMapping("/{id}")
    fun getClassFeatureById(@PathVariable id: Long): ResponseEntity<ClassFeature> {
        val classFeature = classFeatureRepository.findById(id)
        return if (classFeature.isPresent) {
            ResponseEntity.ok(classFeature.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateClassFeature(@PathVariable id: Long, @RequestBody dto: ClassFeatureDto): ClassFeature {
        val existingFeature = classFeatureRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Class Feature not found with id $id") }

        val dndClass = dndClassRepository.findById(dto.dndClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Class not found with id ${dto.dndClassId}") }

        val updatedFeature = existingFeature.copy(
            name = dto.name,
            description = dto.description,
            levelRequired = dto.levelRequired,
            dndClass = dndClass
        )
        return classFeatureRepository.save(updatedFeature)
    }

    @DeleteMapping("/{id}")
    fun deleteClassFeature(@PathVariable id: Long): ResponseEntity<Void> {
        if (!classFeatureRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        classFeatureRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

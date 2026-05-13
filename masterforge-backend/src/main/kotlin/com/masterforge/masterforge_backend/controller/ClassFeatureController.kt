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
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: com.masterforge.masterforge_backend.repository.DndSubclassRepository
) {

    @GetMapping
    fun getAllClassFeatures(): List<ClassFeature> {
        return classFeatureRepository.findAll()
    }

    @PostMapping
    fun createClassFeature(@RequestBody dto: ClassFeatureDto): ClassFeature {
        val dndClass = dto.dndClassId?.let { 
            dndClassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Class not found with id $it") }
        }
        val dndSubclass = dto.subclassId?.let {
            dndSubclassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Subclass not found with id $it") }
        }

        val classFeature = ClassFeature(
            name = dto.name,
            description = dto.description,
            levelRequired = dto.levelRequired,
            options = dto.options,
            properties = dto.properties,
            dndClass = dndClass,
            dndSubclass = dndSubclass
        )
        return classFeatureRepository.save(classFeature)
    }

    @GetMapping("/{id}")
    fun getClassFeatureById(@PathVariable id: Int): ResponseEntity<ClassFeature> {
        val classFeature = classFeatureRepository.findById(id)
        return if (classFeature.isPresent) {
            ResponseEntity.ok(classFeature.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateClassFeature(@PathVariable id: Int, @RequestBody dto: ClassFeatureDto): ClassFeature {
        val existingFeature = classFeatureRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Class Feature not found with id $id") }

        val dndClass = dto.dndClassId?.let {
            dndClassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Class not found with id $it") }
        }
        val dndSubclass = dto.subclassId?.let {
            dndSubclassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Subclass not found with id $it") }
        }

        val updatedFeature = existingFeature.copy(
            name = dto.name,
            description = dto.description,
            levelRequired = dto.levelRequired,
            options = dto.options,
            properties = dto.properties,
            dndClass = dndClass,
            dndSubclass = dndSubclass
        )
        return classFeatureRepository.save(updatedFeature)
    }

    @DeleteMapping("/{id}")
    fun deleteClassFeature(@PathVariable id: Int): ResponseEntity<Void> {
        if (!classFeatureRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        classFeatureRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

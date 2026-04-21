package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.SpellDto
import com.masterforge.masterforge_backend.model.entity.Spell
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.SpellRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/spells")
@CrossOrigin(origins = ["*"])
class SpellController(
    private val spellRepository: SpellRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllSpells(): List<Spell> {
        return spellRepository.findAll()
    }

    @PostMapping
    fun createSpell(@RequestBody dto: SpellDto): Spell {
        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val spell = Spell(
            name = dto.name,
            level = dto.level,
            school = dto.school,
            description = dto.description,
            author = author
        )
        return spellRepository.save(spell)
    }

    @GetMapping("/{id}")
    fun getSpellById(@PathVariable id: UUID): ResponseEntity<Spell> {
        val spell = spellRepository.findById(id)
        return if (spell.isPresent) {
            ResponseEntity.ok(spell.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateSpell(@PathVariable id: UUID, @RequestBody dto: SpellDto): Spell {
        val existingSpell = spellRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Spell not found with id $id") }

        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val updatedSpell = existingSpell.copy(
            name = dto.name,
            level = dto.level,
            school = dto.school,
            description = dto.description,
            author = author
        )
        return spellRepository.save(updatedSpell)
    }

    @DeleteMapping("/{id}")
    fun deleteSpell(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!spellRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        spellRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

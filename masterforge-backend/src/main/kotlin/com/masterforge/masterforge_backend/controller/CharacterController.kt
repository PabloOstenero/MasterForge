package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.repository.CharacterRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = ["*"])
class CharacterController(private val characterRepository: CharacterRepository) {

    @GetMapping
    fun getAllCharacters(): List<Character> {
        return characterRepository.findAll()
    }

    @PostMapping
    fun createCharacter(@RequestBody character: Character): Character {
        return characterRepository.save(character)
    }

    @GetMapping("/{id}")
    fun getCharacterById(@PathVariable id: UUID): ResponseEntity<Character> {
        val character = characterRepository.findById(id)
        return if (character.isPresent) {
            ResponseEntity.ok(character.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }
}

package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CharacterSpellDto
import com.masterforge.masterforge_backend.model.entity.CharacterSpell
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.CharacterSpellRepository
import com.masterforge.masterforge_backend.repository.SpellRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/character-spells")
@CrossOrigin(origins = ["*"])
class CharacterSpellController(
    private val characterSpellRepository: CharacterSpellRepository,
    private val characterRepository: CharacterRepository,
    private val spellRepository: SpellRepository
) {

    @GetMapping
    fun getAllCharacterSpells(): List<CharacterSpell> {
        return characterSpellRepository.findAll()
    }

    @PostMapping
    fun createCharacterSpell(@RequestBody dto: CharacterSpellDto): CharacterSpell {
        val character = characterRepository.findById(dto.characterId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Character not found with id ${dto.characterId}") }

        val spell = spellRepository.findById(dto.spellId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Spell not found with id ${dto.spellId}") }

        val characterSpell = CharacterSpell(
            character = character,
            spell = spell,
            isPrepared = dto.isPrepared
        )
        return characterSpellRepository.save(characterSpell)
    }

    @GetMapping("/{id}")
    fun getCharacterSpellById(@PathVariable id: Int): ResponseEntity<CharacterSpell> {
        val characterSpell = characterSpellRepository.findById(id)
        return if (characterSpell.isPresent) {
            ResponseEntity.ok(characterSpell.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateCharacterSpell(@PathVariable id: Int, @RequestBody dto: CharacterSpellDto): CharacterSpell {
        val existingCharacterSpell = characterSpellRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character Spell not found with id $id") }

        val character = characterRepository.findById(dto.characterId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Character not found with id ${dto.characterId}") }

        val spell = spellRepository.findById(dto.spellId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Spell not found with id ${dto.spellId}") }

        val updatedCharacterSpell = existingCharacterSpell.copy(
            character = character,
            spell = spell,
            isPrepared = dto.isPrepared
        )
        return characterSpellRepository.save(updatedCharacterSpell)
    }

    @DeleteMapping("/{id}")
    fun deleteCharacterSpell(@PathVariable id: Int): ResponseEntity<Void> {
        if (!characterSpellRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        characterSpellRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

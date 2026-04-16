package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CharacterDto
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.repository.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = ["*"])
class CharacterController(
    private val characterRepository: CharacterRepository,
    private val userRepository: UserRepository,
    private val campaignRepository: CampaignRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val dndClassRepository: DndClassRepository
) {

    @GetMapping
    fun getAllCharacters(): List<Character> {
        return characterRepository.findAll()
    }

    @PostMapping
    fun createCharacter(@RequestBody dto: CharacterDto): Character {
        // Resolve all foreign key relationships for the character.
        val user = userRepository.findById(dto.userId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id ${dto.userId}") }
        val campaign = campaignRepository.findById(dto.campaignId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id ${dto.campaignId}") }
        val dndRace = dndRaceRepository.findById(dto.dndRaceId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Race not found with id ${dto.dndRaceId}") }
        val dndClass = dndClassRepository.findById(dto.dndClassId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Class not found with id ${dto.dndClassId}") }

        val character = Character(
            name = dto.name,
            level = dto.level,
            currentHp = dto.currentHp,
            baseStr = dto.baseStr,
            baseDex = dto.baseDex,
            baseCon = dto.baseCon,
            baseInt = dto.baseInt,
            baseWis = dto.baseWis,
            baseCha = dto.baseCha,
            skillProficiencies = dto.skillProficiencies,
            user = user,
            campaign = campaign,
            dndRace = dndRace,
            dndClass = dndClass
        )
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

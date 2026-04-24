package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CharacterDto
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.dto.CharacterResponseDto
import com.masterforge.masterforge_backend.repository.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class HpUpdateDto(val currentHp: Int)

@RestController
@RequestMapping("/api/characters")
class CharacterController(
    private val characterRepository: CharacterRepository,
    private val userRepository: UserRepository,
    private val campaignRepository: CampaignRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository
) {

    @GetMapping
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun getAllCharacters(): List<CharacterResponseDto> {
        return characterRepository.findAll().map { CharacterResponseDto.fromEntity(it) }
    }

    @PostMapping
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun createCharacter(@RequestBody dto: CharacterDto): CharacterResponseDto {
        val user = userRepository.findById(dto.user.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id ${dto.user.id}") }
        
        // Campaign is now optional
        val campaign = dto.campaign?.id?.let { campaignId ->
            campaignRepository.findById(campaignId)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id $campaignId") }
        }
        
        val dndRace = dndRaceRepository.findById(dto.dndRace.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Race not found with id ${dto.dndRace.id}") }
        
        val dndClass = dndClassRepository.findById(dto.dndClass.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Class not found with id ${dto.dndClass.id}") }
        
        val subclass = dto.subclassId?.let {
            dndSubclassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Subclass not found with id $it") }
        }

        val character = Character(
            name = dto.name,
            level = dto.level,
            maxHp = dto.maxHp,
            currentHp = dto.currentHp,
            tempHp = dto.tempHp,
            armorClass = dto.armorClass,
            speed = dto.speed,
            hitDiceTotal = dto.hitDiceTotal,
            hitDiceSpent = dto.hitDiceSpent,
            background = dto.background,
            alignment = dto.alignment,
            xp = dto.xp,
            cp = dto.cp,
            sp = dto.sp,
            ep = dto.ep,
            gp = dto.gp,
            pp = dto.pp,
            baseStr = dto.baseStr,
            baseDex = dto.baseDex,
            baseCon = dto.baseCon,
            baseInt = dto.baseInt,
            baseWis = dto.baseWis,
            baseCha = dto.baseCha,
            skillProficiencies = dto.skillProficiencies,
            spellSlots = dto.spellSlots,
            user = user,
            campaign = campaign,
            dndRace = dndRace,
            dndClass = dndClass,
            subclass = subclass,
            choicesJson = dto.choicesJson
        )
        return CharacterResponseDto.fromEntity(characterRepository.save(character))
    }

    @GetMapping("/{id}")
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun getCharacterById(@PathVariable id: UUID): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
        return if (character.isPresent) {
            ResponseEntity.ok(CharacterResponseDto.fromEntity(character.get()))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun updateCharacter(@PathVariable id: UUID, @RequestBody dto: CharacterDto): CharacterResponseDto {
        val existingCharacter = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val user = userRepository.findById(dto.user.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id ${dto.user.id}") }
        
        val campaign = dto.campaign?.id?.let { campaignId ->
            campaignRepository.findById(campaignId)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign not found with id $campaignId") }
        }
        
        val dndRace = dndRaceRepository.findById(dto.dndRace.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Race not found with id ${dto.dndRace.id}") }
        
        val dndClass = dndClassRepository.findById(dto.dndClass.id)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Class not found with id ${dto.dndClass.id}") }

        val subclass = dto.subclassId?.let {
            dndSubclassRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "D&D Subclass not found with id $it") }
        }

        val updatedCharacter = existingCharacter.copy(
            name = dto.name,
            level = dto.level,
            maxHp = dto.maxHp,
            currentHp = dto.currentHp,
            tempHp = dto.tempHp,
            armorClass = dto.armorClass,
            speed = dto.speed,
            hitDiceTotal = dto.hitDiceTotal,
            hitDiceSpent = dto.hitDiceSpent,
            background = dto.background,
            alignment = dto.alignment,
            xp = dto.xp,
            cp = dto.cp,
            sp = dto.sp,
            ep = dto.ep,
            gp = dto.gp,
            pp = dto.pp,
            baseStr = dto.baseStr,
            baseDex = dto.baseDex,
            baseCon = dto.baseCon,
            baseInt = dto.baseInt,
            baseWis = dto.baseWis,
            baseCha = dto.baseCha,
            skillProficiencies = dto.skillProficiencies,
            spellSlots = dto.spellSlots,
            user = user,
            campaign = campaign,
            dndRace = dndRace,
            dndClass = dndClass,
            subclass = subclass,
            choicesJson = dto.choicesJson
        )

        val savedCharacter = characterRepository.save(updatedCharacter)
        // Sincronizamos el lado inverso de la relación en memoria
        user.characters.add(savedCharacter) 

        return CharacterResponseDto.fromEntity(savedCharacter)
    }

    @PutMapping("/{id}/hp")
    @Transactional
    fun updateHp(@PathVariable id: UUID, @RequestBody dto: HpUpdateDto): ResponseEntity<Void> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val updatedCharacter = character.copy(currentHp = dto.currentHp)
        characterRepository.save(updatedCharacter)
        
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{id}")
    fun deleteCharacter(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!characterRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        characterRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

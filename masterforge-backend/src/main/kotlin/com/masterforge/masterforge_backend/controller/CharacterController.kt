package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CharacterDto
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.InventorySlot
import com.masterforge.masterforge_backend.model.dto.CharacterResponseDto
import com.masterforge.masterforge_backend.model.dto.CharacterSummaryDto
import com.masterforge.masterforge_backend.repository.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class HpUpdateDto(val currentHp: Int)
data class TempHpUpdateDto(val tempHp: Int)
data class HitDiceUpdateDto(val hitDiceSpent: Int)
data class MoneyUpdateDto(val cp: Int, val sp: Int, val ep: Int, val gp: Int, val pp: Int)

@RestController
@RequestMapping("/api/characters")
class CharacterController(
    private val characterRepository: CharacterRepository,
    private val userRepository: UserRepository,
    private val campaignRepository: CampaignRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository,
    private val itemRepository: ItemRepository
) {

    @GetMapping
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun getAllCharacters(): List<CharacterResponseDto> {
        return characterRepository.findAll().map { CharacterResponseDto.fromEntity(it) }
    }

    @GetMapping("/user/{userId}")
    @Transactional // Ensure lazy-loaded relationships are fetched for DTO mapping
    fun getCharactersByUser(@PathVariable userId: UUID): ResponseEntity<List<CharacterSummaryDto>> {
        val characters = characterRepository.findByUserId(userId)
        val summaries = characters.map { character ->
            CharacterSummaryDto(
                id = character.id!!,
                name = character.name,
                level = character.level,
                dndClass = character.dndClass.name,
                dndRace = character.dndRace.name,
                subclass = character.subclass?.name
            )
        }
        return ResponseEntity.ok(summaries)
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
            savingThrowsProficiencies = dto.savingThrowsProficiencies,
            skillProficiencies = dto.skillProficiencies,
            spellSlots = dto.spellSlots,
            user = user,
            campaign = campaign,
            dndRace = dndRace,
            dndClass = dndClass,
            subclass = subclass,
            choicesJson = dto.choicesJson
        )

        // Map inventory items from DTO
        dto.inventory.forEach { slotDto ->
            val item = itemRepository.findById(slotDto.item.id)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Item not found: ${slotDto.item.id}") }
            character.inventory.add(InventorySlot(
                item = item,
                quantity = slotDto.quantity,
                isEquipped = slotDto.isEquipped,
                isAttuned = slotDto.isAttuned,
                character = character
            ))
        }

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
            savingThrowsProficiencies = dto.savingThrowsProficiencies,
            skillProficiencies = dto.skillProficiencies,
            spellSlots = dto.spellSlots,
            user = user,
            campaign = campaign,
            dndRace = dndRace,
            dndClass = dndClass,
            subclass = subclass,
            choicesJson = dto.choicesJson
        )

        // Sync Inventory
        updatedCharacter.inventory.clear()
        dto.inventory.forEach { slotDto ->
            val item = itemRepository.findById(slotDto.item.id)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Item not found: ${slotDto.item.id}") }
            updatedCharacter.inventory.add(InventorySlot(
                item = item,
                quantity = slotDto.quantity,
                isEquipped = slotDto.isEquipped,
                isAttuned = slotDto.isAttuned,
                character = updatedCharacter
            ))
        }

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

    @PutMapping("/{id}/temp-hp")
    @Transactional
    fun updateTempHp(@PathVariable id: UUID, @RequestBody dto: TempHpUpdateDto): ResponseEntity<Void> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val updatedCharacter = character.copy(tempHp = dto.tempHp)
        characterRepository.save(updatedCharacter)
        
        return ResponseEntity.ok().build()
    }

    @PutMapping("/{id}/money")
    @Transactional
    fun updateMoney(@PathVariable id: UUID, @RequestBody dto: MoneyUpdateDto): ResponseEntity<Void> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val updatedCharacter = character.copy(
            cp = dto.cp,
            sp = dto.sp,
            ep = dto.ep,
            gp = dto.gp,
            pp = dto.pp
        )
        characterRepository.save(updatedCharacter)
        
        return ResponseEntity.ok().build()
    }

    @PutMapping("/{id}/inventory/{slotId}/toggle-equip")
    @Transactional
    fun toggleEquip(@PathVariable id: UUID, @PathVariable slotId: Int): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val index = character.inventory.indexOfFirst { it.id == slotId }
        if (index == -1) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found")
        }

        val slot = character.inventory[index]
        character.inventory[index] = slot.copy(isEquipped = !slot.isEquipped)
        
        val saved = characterRepository.save(character)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved))
    }

    @PostMapping("/{id}/inventory/{itemId}")
    @Transactional
    fun addItemToInventory(@PathVariable id: UUID, @PathVariable itemId: UUID): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        val item = itemRepository.findById(itemId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found") }

        // Check if item already exists to increment quantity
        val existingSlot = character.inventory.find { it.item.id == itemId }
        if (existingSlot != null) {
            val index = character.inventory.indexOf(existingSlot)
            character.inventory[index] = existingSlot.copy(quantity = existingSlot.quantity + 1)
        } else {
            character.inventory.add(InventorySlot(
                character = character,
                item = item,
                quantity = 1,
                isEquipped = false,
                isAttuned = false
            ))
        }

        val saved = characterRepository.save(character)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved))
    }

    @PutMapping("/{id}/inventory/{slotId}/use")
    @Transactional
    fun useItem(@PathVariable id: UUID, @PathVariable slotId: Int): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val index = character.inventory.indexOfFirst { it.id == slotId }
        if (index == -1) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found")

        val slot = character.inventory[index]
        
        if (slot.quantity > 1) {
            character.inventory[index] = slot.copy(quantity = slot.quantity - 1)
        } else {
            character.inventory.removeAt(index)
        }
        
        val saved = characterRepository.save(character)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved))
    }

    @DeleteMapping("/{id}/inventory/{slotId}")
    @Transactional
    fun removeInventoryItem(@PathVariable id: UUID, @PathVariable slotId: Int): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val index = character.inventory.indexOfFirst { it.id == slotId }
        if (index == -1) throw ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found")

        val slot = character.inventory[index]
        
        if (slot.quantity > 1) {
            character.inventory[index] = slot.copy(quantity = slot.quantity - 1)
        } else {
            character.inventory.removeAt(index)
        }
        
        val saved = characterRepository.save(character)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved))
    }

    @PutMapping("/{id}/hit-dice")
    @Transactional
    fun updateHitDice(@PathVariable id: UUID, @RequestBody dto: HitDiceUpdateDto): ResponseEntity<Void> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val updatedCharacter = character.copy(hitDiceSpent = dto.hitDiceSpent)
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

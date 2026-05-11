package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CharacterDto
import com.masterforge.masterforge_backend.model.dto.CharacterResponseDto
import com.masterforge.masterforge_backend.model.dto.CharacterSummaryDto
import com.masterforge.masterforge_backend.model.dto.SpellDto
import com.masterforge.masterforge_backend.model.entity.Character
import com.masterforge.masterforge_backend.model.entity.CharacterSpell
import com.masterforge.masterforge_backend.model.entity.Spell
import com.masterforge.masterforge_backend.model.entity.InventorySlot
import com.masterforge.masterforge_backend.repository.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

data class HpUpdateDto(val currentHp: Int)
data class TempHpUpdateDto(val tempHp: Int)
data class HitDiceUpdateDto(val hitDiceSpent: Int)
data class BonusMaxHpUpdateDto(val bonusMaxHp: Int)
data class MoneyUpdateDto(val cp: Int, val sp: Int, val ep: Int, val gp: Int, val pp: Int)
data class AddSpellDto(val spellId: java.util.UUID, val isPrepared: Boolean = false)
data class SpellSlotsUpdateDto(val spellSlots: Map<String, Any>)
data class LevelUpDto(
    val maxHp: Int,
    val stats: Map<String, Int>,
    val choicesJson: Map<String, Any>,
    val newSpells: List<UUID> = emptyList()
)

@RestController
@RequestMapping("/api/characters")
class CharacterController(
    private val characterRepository: CharacterRepository,
    private val userRepository: UserRepository,
    private val campaignRepository: CampaignRepository,
    private val campaignEnrollmentRepository: CampaignEnrollmentRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository,
    private val itemRepository: ItemRepository,
    private val characterSpellRepository: CharacterSpellRepository,
    private val spellRepository: SpellRepository
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
        val characterOptional = characterRepository.findById(id)
        if (characterOptional.isEmpty) {
            return ResponseEntity.notFound().build()
        }
        val character = characterOptional.get()
        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(character, spells))
    }

    /** Returns all spells whose spellClasses contains the character's class name,
     *  excluding spells the character already has in their spellbook and spells higher than their current capacity. */
    @GetMapping("/{id}/available-spells")
    @Transactional
    fun getAvailableSpells(
        @PathVariable id: UUID,
        @RequestParam(required = false) level: Int?
    ): ResponseEntity<List<SpellDto>> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val classFeatures = character.dndClass.classFeatures
        val subclassFeatures = character.subclass?.subclassFeatures
        val spellcasting = (subclassFeatures?.get("spellcasting") as? Map<*, *>) 
                          ?: (classFeatures?.get("spellcasting") as? Map<*, *>)

        val className = character.dndClass.name
        val additionalClass = spellcasting?.get("additionalSpellClass") as? String
        val expandedSpellNames = (subclassFeatures?.get("expandedSpellList") as? List<*>)
                                ?.filterIsInstance<Map<String, Any>>()
                                ?.mapNotNull { it["name"] as? String } ?: emptyList()

        val knownSpellIds = characterSpellRepository.findByCharacterId(id).map { it.spell.id }.toSet()
        val maxLevel = getMaxSpellLevel(character, level)

        // Use a set to avoid duplicates from multiple sources
        val allAvailable = mutableSetOf<Spell>()
        
        // 1. Spells from the primary class
        allAvailable.addAll(spellRepository.findBySpellClassesContainingIgnoreCase(className))
        
        // 2. Spells from an additional class (e.g. Divine Soul Sorcerer getting Cleric spells)
        if (!additionalClass.isNullOrBlank()) {
            allAvailable.addAll(spellRepository.findBySpellClassesContainingIgnoreCase(additionalClass))
        }
        
        // 3. Spells specifically added to the subclass list
        expandedSpellNames.forEach { name ->
            spellRepository.findByNameIgnoreCase(name)?.let { allAvailable.add(it) }
        }

        val filtered = allAvailable
            .filter { s -> s.id !in knownSpellIds && (s.level == 0 || s.level <= maxLevel) }
            .map { s -> SpellDto(
                id = s.id,
                name = s.name,
                level = s.level,
                school = s.school,
                castingTime = s.castingTime,
                range = s.range,
                duration = s.duration,
                verbal = s.verbal,
                somatic = s.somatic,
                material = s.material,
                materialComponent = s.materialComponent,
                concentration = s.concentration,
                ritual = s.ritual,
                damageTypes = s.damageTypes?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() },
                savingThrow = s.savingThrow,
                spellClasses = s.spellClasses?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() },
                higherLevelDescription = s.higherLevelDescription,
                description = s.description,
                authorId = s.author?.id
            )}
        return ResponseEntity.ok(filtered)
    }

    /** Adds a spell to the character's spellbook. */
    @PostMapping("/{id}/spells")
    @Transactional
    fun addSpell(@PathVariable id: UUID, @RequestBody dto: AddSpellDto): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        val spell = spellRepository.findById(dto.spellId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Spell not found") }
        
        // Final safety check: level must be within capacity
        val maxLevel = getMaxSpellLevel(character)
        if (spell.level > maxLevel && spell.level != 0) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Spell level too high for character capacity")
        }

        val alreadyKnown = characterSpellRepository.findByCharacterId(id).any { it.spell.id == dto.spellId }
        if (!alreadyKnown) {
            characterSpellRepository.save(CharacterSpell(character = character, spell = spell, isPrepared = dto.isPrepared))
        }
        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(character, spells))
    }

    /** Removes a spell from the character's spellbook. */
    @DeleteMapping("/{id}/spells/{characterSpellId}")
    @Transactional
    fun removeSpell(@PathVariable id: UUID, @PathVariable characterSpellId: Int): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        characterSpellRepository.deleteById(characterSpellId)
        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(character, spells))
    }

    /** Toggles the preparation status of a spell. */
    @PutMapping("/{id}/spells/{characterSpellId}/toggle-prepare")
    @Transactional
    fun toggleSpellPrepare(@PathVariable id: UUID, @PathVariable characterSpellId: Int): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        val charSpell = characterSpellRepository.findById(characterSpellId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character spell not found") }
        
        val updated = charSpell.copy(isPrepared = !charSpell.isPrepared)
        characterSpellRepository.save(updated)
        
        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(character, spells))
    }

    /** Bulk adds all available class spells to the character (for prepared casters). */
    @PostMapping("/{id}/spells/sync-class")
    @Transactional
    fun syncClassSpells(@PathVariable id: UUID): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        val className = character.dndClass.name
        val knownSpellIds = characterSpellRepository.findByCharacterId(id).map { it.spell.id }.toSet()
        val maxLevel = getMaxSpellLevel(character)
        
        val available = spellRepository.findBySpellClassesContainingIgnoreCase(className)
            .filter { it.id !in knownSpellIds && it.level > 0 && it.level <= maxLevel }

        available.forEach { spell ->
            characterSpellRepository.save(CharacterSpell(character = character, spell = spell, isPrepared = false))
        }

        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(character, spells))
    }

    private fun getMaxSpellLevel(character: Character, requestedLevel: Int? = null): Int {
        val effectiveLevel = requestedLevel ?: character.level
        var max = 0
        
        val classFeatures = character.dndClass.classFeatures
        val subclassFeatures = character.subclass?.subclassFeatures
        val spellcasting = (subclassFeatures?.get("spellcasting") as? Map<*, *>) 
                          ?: (classFeatures?.get("spellcasting") as? Map<*, *>)

        // 1. Try to get from character's saved slots (only for current level)
        if (requestedLevel == null || requestedLevel == character.level) {
            for (i in 1..9) {
                val key = "level_$i"
                val raw = character.spellSlots?.get(key)
                if (raw != null) {
                    val maxSlots = when (raw) {
                        is Map<*, *> -> (raw["max"] as? Number)?.toInt() ?: 0
                        is Number -> raw.toInt()
                        else -> 0
                    }
                    if (maxSlots > 0) max = i
                }
            }
            if (max > 0) return max
        }

        // 2. Try to get from explicit slot table in class/subclass features
        if (spellcasting != null) {
            val table = (spellcasting["spellSlots"] as? Map<*, *>) ?: (spellcasting["spell_slots"] as? Map<*, *>)
            val slotsTable = table?.get("slots") as? List<List<Int>>
            if (slotsTable != null && slotsTable.size >= effectiveLevel) {
                val row = slotsTable[effectiveLevel - 1]
                return row.indexOfLast { it > 0 } + 1
            }
        }

        // 3. Fallback based on spellcasting type (standard 5e progression)
        if (spellcasting != null) {
            val type = (spellcasting["spellcastingType"] as? String) ?: (spellcasting["type"] as? String)
            return when (type) {
                "Full Caster" -> (effectiveLevel + 1) / 2
                "Half Caster" -> (effectiveLevel / 2 + 1) / 2
                "Third Caster" -> (effectiveLevel / 3 + 1) / 2
                "Pact Magic" -> when {
                    effectiveLevel >= 9 -> 5
                    effectiveLevel >= 7 -> 4
                    effectiveLevel >= 5 -> 3
                    effectiveLevel >= 3 -> 2
                    else -> 1
                }
                else -> 0
            }
        }

        return 0
    }

    @PutMapping("/{characterId}/campaign/{campaignId}")
    @Transactional
    fun assignCharacterToCampaign(
        @PathVariable characterId: UUID,
        @PathVariable campaignId: UUID
    ): ResponseEntity<CharacterResponseDto> {
        val authName = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required")
        val authenticatedUserId = UUID.fromString(authName)

        val character = characterRepository.findById(characterId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }

        val campaign = campaignRepository.findById(campaignId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found") }

        if (character.user.id != authenticatedUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this character")
        }

        if (!campaignEnrollmentRepository.existsByCampaignIdAndUserId(campaignId, authenticatedUserId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are not enrolled in this campaign")
        }

        val updated = character.copy(campaign = campaign)
        val saved = characterRepository.save(updated)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved))
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
    fun updateTempHp(@PathVariable id: UUID, @RequestBody dto: TempHpUpdateDto): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        val updated = character.copy(tempHp = dto.tempHp)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(characterRepository.save(updated)))
    }

    @PutMapping("/{id}/bonus-max-hp")
    @Transactional
    fun updateBonusMaxHp(@PathVariable id: UUID, @RequestBody dto: BonusMaxHpUpdateDto): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val oldMax = calculateEffectiveMaxHp(character)
        val updated = character.copy(bonusMaxHp = dto.bonusMaxHp)
        val newMax = calculateEffectiveMaxHp(updated)
        
        val delta = newMax - oldMax
        val finalHp = Math.max(0, Math.min(newMax, updated.currentHp + delta))
        
        val finalCharacter = updated.copy(currentHp = finalHp)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(characterRepository.save(finalCharacter)))
    }

    @PutMapping("/{id}/spell-slots")
    @Transactional
    fun updateSpellSlots(@PathVariable id: UUID, @RequestBody dto: SpellSlotsUpdateDto): ResponseEntity<Void> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found with id $id") }

        val updatedCharacter = character.copy(spellSlots = dto.spellSlots)
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

        val oldMax = calculateEffectiveMaxHp(character)
        
        val slot = character.inventory[index]
        character.inventory[index] = slot.copy(isEquipped = !slot.isEquipped)
        
        val newMax = calculateEffectiveMaxHp(character)
        val delta = newMax - oldMax
        
        val updatedHp = Math.max(0, Math.min(newMax, character.currentHp + delta))
        
        // Use copy to update HP as it's a val
        val finalCharacter = character.copy(currentHp = updatedHp)
        
        val saved = characterRepository.save(finalCharacter)
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

    @PostMapping("/{id}/long-rest")
    @Transactional
    fun performLongRest(@PathVariable id: UUID): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }

        // Recalcular HP efectiva (Base + Bono + Items + Retroactiva por CON)
        println("DEBUG: Iniciando Long Rest para ${character.name}")
        println("DEBUG: Inventario size: ${character.inventory.size}")
        val restoredHp = calculateEffectiveMaxHp(character)
        println("DEBUG: HP Restablecida calculada: $restoredHp (Base: ${character.maxHp}, Buff: ${character.bonusMaxHp})")
        
        // 2. Restore Spell Slots
        val updatedSlots = character.spellSlots?.toMutableMap() ?: mutableMapOf()
        updatedSlots.keys.forEach { key ->
            val slotData = updatedSlots[key]
            if (slotData is Map<*, *>) {
                val mutableSlotData = (slotData as Map<String, Any>).toMutableMap()
                mutableSlotData["available"] = mutableSlotData["max"] ?: 0
                updatedSlots[key] = mutableSlotData
            }
        }
        
        // 3. Restore Hit Dice (Half of total, minimum 1)
        val recoveryAmount = Math.max(1, character.hitDiceTotal / 2)
        val updatedHitDiceSpent = Math.max(0, character.hitDiceSpent - recoveryAmount)
        
        // 4. Reset Temp HP
        val updatedTempHp = 0
        
        val updatedCharacter = character.copy(
            currentHp = restoredHp,
            spellSlots = updatedSlots,
            hitDiceSpent = updatedHitDiceSpent,
            tempHp = updatedTempHp
        )
        
        val saved = characterRepository.save(updatedCharacter)
        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved, spells))
    }

    @PutMapping("/{id}/level-up")
    @Transactional
    fun levelUp(@PathVariable id: UUID, @RequestBody dto: LevelUpDto): ResponseEntity<CharacterResponseDto> {
        val character = characterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Character not found") }
        
        val newLevel = character.level + 1
        
        // Update basic stats
        var updatedCharacter = character.copy(
            level = newLevel,
            maxHp = dto.maxHp,
            currentHp = dto.maxHp, // Heal to full on level up
            hitDiceTotal = newLevel,
            baseStr = dto.stats["str"] ?: character.baseStr,
            baseDex = dto.stats["dex"] ?: character.baseDex,
            baseCon = dto.stats["con"] ?: character.baseCon,
            baseInt = dto.stats["int"] ?: character.baseInt,
            baseWis = dto.stats["wis"] ?: character.baseWis,
            baseCha = dto.stats["cha"] ?: character.baseCha,
            choicesJson = dto.choicesJson
        )

        // Recalculate Spell Slots based on class/subclass table
        val classFeatures = character.dndClass.classFeatures
        val subclassFeatures = character.subclass?.subclassFeatures
        
        val spellcasting = subclassFeatures?.get("spellcasting") as? Map<*, *> 
                          ?: classFeatures?.get("spellcasting") as? Map<*, *>
        
        if (spellcasting != null) {
            val spellSlots = spellcasting["spellSlots"] as? Map<*, *> ?: spellcasting["spell_slots"] as? Map<*, *>
            val table = spellSlots?.get("slots") as? List<List<Int>>
            if (table != null && table.size >= newLevel) {
                val row = table[newLevel - 1]
                val updatedCharSlots = updatedCharacter.spellSlots?.toMutableMap() ?: mutableMapOf()
                
                row.forEachIndexed { i, max ->
                    val levelKey = "level_${i + 1}"
                    if (max > 0) {
                        val currentSlotData = (updatedCharSlots[levelKey] as? Map<String, Any>)?.toMutableMap() 
                            ?: mutableMapOf<String, Any>("available" to 0, "max" to 0)
                        
                        currentSlotData["max"] = max
                        currentSlotData["available"] = max // Refresh slots on level up
                        updatedCharSlots[levelKey] = currentSlotData
                    }
                }
                updatedCharacter = updatedCharacter.copy(spellSlots = updatedCharSlots)
            }
        }
        
        val saved = characterRepository.save(updatedCharacter)

        // Save new spells selected during level up
        dto.newSpells.forEach { spellId ->
            val spell = spellRepository.findById(spellId)
                .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Spell not found: $spellId") }
            
            // Check if character already has this spell
            if (!characterSpellRepository.existsByCharacterIdAndSpellId(id, spellId)) {
                characterSpellRepository.save(CharacterSpell(
                    character = saved,
                    spell = spell,
                    isPrepared = true // New spells are usually prepared/known
                ))
            }
        }

        val spells = characterSpellRepository.findByCharacterId(id)
        return ResponseEntity.ok(CharacterResponseDto.fromEntity(saved, spells))
    }

    @DeleteMapping("/{id}")
    @Transactional
    fun deleteCharacter(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!characterRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        characterRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }

    private fun calculateEffectiveMaxHp(character: Character): Int {
        val raceConBonus = character.dndRace?.bonusCon ?: 0
        var effectiveCon = character.baseCon + raceConBonus
        var itemFlatBonus = 0

        println("DEBUG: Calculando HP efectiva. Base CON: ${character.baseCon}, Race Bonus: $raceConBonus")

        character.inventory.forEach { slot ->
            if (slot.isEquipped) {
                val props = slot.item.properties
                // Stat Overrides
                props["overrideCon"]?.let { 
                    val v = (it as? Number)?.toInt() ?: 0
                    if (v > 0) effectiveCon = Math.max(effectiveCon, v)
                }
                // Stat Bonuses
                props["bonusCon"]?.let { effectiveCon += (it as? Number)?.toInt() ?: 0 }
                // Flat HP Bonuses
                props["bonusMaxHp"]?.let { itemFlatBonus += (it as? Number)?.toInt() ?: 0 }
            }
        }

        val conMod = Math.floor((effectiveCon - 10) / 2.0).toInt()
        val baseConWithRace = character.baseCon + raceConBonus
        val baseConMod = Math.floor((baseConWithRace - 10) / 2.0).toInt()
        val retroactiveHp = (conMod - baseConMod) * character.level
        
        val total = character.maxHp + character.bonusMaxHp + itemFlatBonus + retroactiveHp
        println("DEBUG: Total calculado: $total (Retroactiva: $retroactiveHp)")
        return total
    }
}

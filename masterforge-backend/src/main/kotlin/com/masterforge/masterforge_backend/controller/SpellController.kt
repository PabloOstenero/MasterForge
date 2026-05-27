package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.SpellDto
import com.masterforge.masterforge_backend.model.entity.Spell
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.SpellRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.repository.HomebrewCollectionRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@RestController
@RequestMapping("/api/spells")
class SpellController(
    private val spellRepository: SpellRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService,
    private val homebrewCollectionRepository: HomebrewCollectionRepository
) {

    @GetMapping
    fun getAllSpells(): List<Spell> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val allSpells = spellRepository.findAll()
        val ownedIds = homebrewCollectionRepository.findByUserId(currentUserId)
            .filter { it.contentType == "SPELL" }
            .map { it.contentId }
            .toSet()

        return allSpells.filter { spell ->
            spell.author == null || 
            spell.author?.id == currentUserId || 
            ownedIds.contains(spell.id.toString())
        }
    }

    @PostMapping
    @Transactional
    fun createSpell(@RequestBody dto: SpellDto): Spell {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val shouldBeOfficial = isManagerOrAdmin && dto.isOfficial == true

        val author: User? = if (shouldBeOfficial) {
            null
        } else {
            homebrewService.verifyCreationLimit(currentUser)
            homebrewService.verifyMonetization(currentUser, dto.price ?: java.math.BigDecimal.ZERO)
            currentUser
        }

        val spell = Spell(
            name = dto.name,
            level = dto.level,
            school = dto.school,
            castingTime = dto.castingTime,
            range = dto.range,
            duration = dto.duration,
            verbal = dto.verbal,
            somatic = dto.somatic,
            material = dto.material,
            materialComponent = dto.materialComponent,
            concentration = dto.concentration,
            ritual = dto.ritual,
            damageTypes = dto.damageTypes?.joinToString(", "),
            savingThrow = dto.savingThrow,
            spellClasses = dto.spellClasses?.joinToString(", "),
            higherLevelDescription = dto.higherLevelDescription,
            description = dto.description,
            author = author,
            price = dto.price ?: java.math.BigDecimal.ZERO
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
    @Transactional
    fun updateSpell(@PathVariable id: UUID, @RequestBody dto: SpellDto): Spell {
        val existingSpell = spellRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Spell not found with id $id") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"

        // Verify update permission
        val existingAuthorId = existingSpell.author?.id
        if (existingAuthorId == null) {
            // Official content
            if (!isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only managers can update official content")
            }
        } else {
            // Community content
            if (existingAuthorId != currentUserId && !isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this content")
            }
        }

        val shouldBeOfficial = isManagerOrAdmin && dto.isOfficial == true
        val author: User? = if (shouldBeOfficial) {
            null
        } else {
            homebrewService.verifyMonetization(currentUser, dto.price ?: java.math.BigDecimal.ZERO)
            currentUser
        }

        val updatedSpell = existingSpell.copy(
            name = dto.name,
            level = dto.level,
            school = dto.school,
            castingTime = dto.castingTime,
            range = dto.range,
            duration = dto.duration,
            verbal = dto.verbal,
            somatic = dto.somatic,
            material = dto.material,
            materialComponent = dto.materialComponent,
            concentration = dto.concentration,
            ritual = dto.ritual,
            damageTypes = dto.damageTypes?.joinToString(", "),
            savingThrow = dto.savingThrow,
            spellClasses = dto.spellClasses?.joinToString(", "),
            higherLevelDescription = dto.higherLevelDescription,
            description = dto.description,
            author = author,
            price = dto.price ?: java.math.BigDecimal.ZERO
        )
        return spellRepository.save(updatedSpell)
    }

    @DeleteMapping("/{id}")
    fun deleteSpell(@PathVariable id: UUID): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val spell = spellRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Spell not found with id $id") }

        // Verify delete permission
        val existingAuthorId = spell.author?.id
        if (existingAuthorId == null) {
            // Official content
            if (!isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only managers can delete official content")
            }
        } else {
            // Community content
            if (existingAuthorId != currentUserId && !isManagerOrAdmin) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this content")
            }
        }

        spellRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

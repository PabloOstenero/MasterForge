package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.MonsterDto
import com.masterforge.masterforge_backend.model.entity.Monster
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.MonsterRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/monsters")
class MonsterController(
    private val monsterRepository: MonsterRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService
) {

    @GetMapping
    fun getAllMonsters(): List<Monster> {
        return monsterRepository.findAll()
    }

    @PostMapping
    fun createMonster(@RequestBody dto: MonsterDto): Monster {
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

        val monster = Monster(
            name = dto.name,
            type = dto.type,
            size = dto.size,
            alignment = dto.alignment,
            armorClass = dto.armorClass,
            hitPoints = dto.hitPoints,
            speed = dto.speed,
            str = dto.str,
            dex = dto.dex,
            con = dto.con,
            intStat = dto.intStat,
            wis = dto.wis,
            cha = dto.cha,
            challengeRating = dto.challengeRating,
            xp = dto.xp,
            combatMechanics = dto.combatMechanics,
            author = author
        )
        return monsterRepository.save(monster)
    }

    @GetMapping("/{id}")
    fun getMonsterById(@PathVariable id: UUID): ResponseEntity<Monster> {
        val monster = monsterRepository.findById(id)
        return if (monster.isPresent) {
            ResponseEntity.ok(monster.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateMonster(@PathVariable id: UUID, @RequestBody dto: MonsterDto): Monster {
        val existingMonster = monsterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found with id $id") }

        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"

        // Verify update permission
        val existingAuthorId = existingMonster.author?.id
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

        val updatedMonster = existingMonster.copy(
            name = dto.name,
            type = dto.type,
            size = dto.size,
            alignment = dto.alignment,
            armorClass = dto.armorClass,
            hitPoints = dto.hitPoints,
            speed = dto.speed,
            str = dto.str,
            dex = dto.dex,
            con = dto.con,
            intStat = dto.intStat,
            wis = dto.wis,
            cha = dto.cha,
            challengeRating = dto.challengeRating,
            xp = dto.xp,
            combatMechanics = dto.combatMechanics,
            author = author
        )
        return monsterRepository.save(updatedMonster)
    }

    @DeleteMapping("/{id}")
    fun deleteMonster(@PathVariable id: UUID): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val currentUser = userRepository.findById(currentUserId)
            .orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found") }

        val isManagerOrAdmin = currentUser.role == "MANAGER" || currentUser.role == "ADMIN"
        val monster = monsterRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Monster not found with id $id") }

        // Verify delete permission
        val existingAuthorId = monster.author?.id
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

        monsterRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

package com.masterforge.masterforge_backend.controller

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
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllMonsters(): List<Monster> {
        return monsterRepository.findAll()
    }

    @PostMapping
    fun createMonster(@RequestBody dto: MonsterDto): Monster {
        // The author is optional. If an authorId is provided, find the user.
        // If not, the author will be null, marking it as a system-owned entity.
        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val monster = Monster(
            name = dto.name,
            type = dto.type,
            size = dto.size,
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

        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
        }

        val updatedMonster = existingMonster.copy(
            name = dto.name,
            type = dto.type,
            size = dto.size,
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
        if (!monsterRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        monsterRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

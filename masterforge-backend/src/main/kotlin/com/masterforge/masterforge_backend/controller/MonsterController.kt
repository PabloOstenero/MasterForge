package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Monster
import com.masterforge.masterforge_backend.repository.MonsterRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/monsters")
@CrossOrigin(origins = ["*"])
class MonsterController(private val monsterRepository: MonsterRepository) {

    @GetMapping
    fun getAllMonsters(): List<Monster> {
        return monsterRepository.findAll()
    }

    @PostMapping
    fun createMonster(@RequestBody monster: Monster): Monster {
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
}

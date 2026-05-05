package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.HomebrewItemDto
import com.masterforge.masterforge_backend.model.dto.HomebrewSummaryDto
import com.masterforge.masterforge_backend.repository.DndClassRepository
import com.masterforge.masterforge_backend.repository.DndSubclassRepository
import com.masterforge.masterforge_backend.repository.DndRaceRepository
import com.masterforge.masterforge_backend.repository.MonsterRepository
import com.masterforge.masterforge_backend.repository.SpellRepository
import com.masterforge.masterforge_backend.repository.ItemRepository
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/homebrew")
class HomebrewController(
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val monsterRepository: MonsterRepository,
    private val spellRepository: SpellRepository,
    private val itemRepository: ItemRepository
) {

    @GetMapping("/my")
    @Transactional(readOnly = true)
    fun getMyHomebrew(): HomebrewSummaryDto {
        val userId = SecurityUtils.getCurrentUserId()

        val classes = dndClassRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "CLASS"
            )
        }

        val subclasses = dndSubclassRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "SUBCLASS"
            )
        }

        val races = dndRaceRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "RACE"
            )
        }

        val monsters = monsterRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "MONSTER"
            )
        }

        val spells = spellRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "SPELL"
            )
        }

        val items = itemRepository.findByAuthorId(userId).map { entity ->
            HomebrewItemDto(
                id = entity.id.toString(),
                name = entity.name,
                contentType = "ITEM"
            )
        }

        return HomebrewSummaryDto(
            classes = classes,
            subclasses = subclasses,
            races = races,
            monsters = monsters,
            spells = spells,
            items = items
        )
    }
}

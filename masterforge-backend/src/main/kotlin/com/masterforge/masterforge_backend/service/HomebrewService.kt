package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.*
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal

@Service
class HomebrewService(
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val monsterRepository: MonsterRepository,
    private val spellRepository: SpellRepository,
    private val itemRepository: ItemRepository
) {
    /**
     * Verifies if a user can create a new homebrew item based on their subscription.
     */
    fun verifyCreationLimit(user: User) {
        if (user.isPro()) return

        val userId = user.id!!
        val totalCount = dndClassRepository.findByAuthorId(userId).size +
                dndSubclassRepository.findByAuthorId(userId).size +
                dndRaceRepository.findByAuthorId(userId).size +
                monsterRepository.findByAuthorId(userId).size +
                spellRepository.findByAuthorId(userId).size +
                itemRepository.findByAuthorId(userId).size

        if (totalCount >= 5) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Free users are limited to 5 homebrew creations. Upgrade to PRO for unlimited slots.")
        }
    }

    /**
     * Verifies if a user can set a price for their homebrew content.
     */
    fun verifyMonetization(user: User, price: BigDecimal) {
        if (user.isPro()) return

        if (price > BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only PRO users can monetize their homebrew content. Free users must set price to 0.")
        }
    }
}

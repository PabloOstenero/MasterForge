package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.HomebrewItemDto
import com.masterforge.masterforge_backend.model.dto.HomebrewSummaryDto
import com.masterforge.masterforge_backend.model.entity.HomebrewCollection
import com.masterforge.masterforge_backend.repository.*
import com.masterforge.masterforge_backend.service.PaymentService
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/api/homebrew")
class HomebrewController(
    private val dndClassRepository: DndClassRepository,
    private val dndSubclassRepository: DndSubclassRepository,
    private val dndRaceRepository: DndRaceRepository,
    private val monsterRepository: MonsterRepository,
    private val spellRepository: SpellRepository,
    private val itemRepository: ItemRepository,
    private val homebrewCollectionRepository: HomebrewCollectionRepository,
    private val paymentService: PaymentService
) {

    private fun truncateDescription(text: String?, limit: Int = 120): String? {
        if (text == null) return null
        val cleanText = text.replace(Regex("\\s+"), " ").trim()
        return if (cleanText.length <= limit) cleanText else cleanText.take(limit) + "..."
    }

    @GetMapping("/my")
    @Transactional(readOnly = true)
    fun getMyHomebrew(): HomebrewSummaryDto {
        val userId = SecurityUtils.getCurrentUserId()

        return HomebrewSummaryDto(
            classes = dndClassRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "CLASS", it.price, true, truncateDescription(it.description))
            },
            subclasses = dndSubclassRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "SUBCLASS", it.price, true, truncateDescription(it.description))
            },
            races = dndRaceRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "RACE", it.price, true, truncateDescription(it.description))
            },
            monsters = monsterRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "MONSTER", it.price, true, "Criatura ${it.size} ${it.type}, ${it.alignment} (CR ${it.challengeRating})")
            },
            spells = spellRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "SPELL", it.price, true, truncateDescription(it.description))
            },
            items = itemRepository.findByAuthorId(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Mío", "ITEM", it.price, true, "Objeto de tipo ${it.type} (Peso: ${it.weight} lb.)")
            }
        )
    }

    @GetMapping("/community")
    @Transactional(readOnly = true)
    fun getCommunityHomebrew(): HomebrewSummaryDto {
        val userId = SecurityUtils.getCurrentUserId()
        val collections = homebrewCollectionRepository.findByUserId(userId)
        val ownedItems = collections
            .groupBy { it.contentType }
            .mapValues { entry -> entry.value.map { it.contentId }.toSet() }

        fun isOwned(type: String, id: String): Boolean {
            return ownedItems[type]?.contains(id) == true
        }

        return HomebrewSummaryDto(
            classes = dndClassRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "CLASS", it.price, isOwned("CLASS", it.id.toString()), truncateDescription(it.description))
            },
            subclasses = dndSubclassRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "SUBCLASS", it.price, isOwned("SUBCLASS", it.id.toString()), truncateDescription(it.description))
            },
            races = dndRaceRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "RACE", it.price, isOwned("RACE", it.id.toString()), truncateDescription(it.description))
            },
            monsters = monsterRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "MONSTER", it.price, isOwned("MONSTER", it.id.toString()), "Criatura ${it.size} ${it.type}, ${it.alignment} (CR ${it.challengeRating})")
            },
            spells = spellRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "SPELL", it.price, isOwned("SPELL", it.id.toString()), truncateDescription(it.description))
            },
            items = itemRepository.findByAuthorIdNotAndAuthorIdIsNotNull(userId).map {
                HomebrewItemDto(it.id.toString(), it.name, it.author?.name ?: "Desconocido", "ITEM", it.price, isOwned("ITEM", it.id.toString()), "Objeto de tipo ${it.type} (Peso: ${it.weight} lb.)")
            }
        )
    }

    @GetMapping("/official")
    @Transactional(readOnly = true)
    fun getOfficialHomebrew(): HomebrewSummaryDto {
        return HomebrewSummaryDto(
            classes = dndClassRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "CLASS", it.price, true, truncateDescription(it.description))
            },
            subclasses = dndSubclassRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "SUBCLASS", it.price, true, truncateDescription(it.description))
            },
            races = dndRaceRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "RACE", it.price, true, truncateDescription(it.description))
            },
            monsters = monsterRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "MONSTER", it.price, true, "Criatura ${it.size} ${it.type}, ${it.alignment} (CR ${it.challengeRating})")
            },
            spells = spellRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "SPELL", it.price, true, truncateDescription(it.description))
            },
            items = itemRepository.findByAuthorIdIsNull().map {
                HomebrewItemDto(it.id.toString(), it.name, "Oficial", "ITEM", it.price, true, "Objeto de tipo ${it.type} (Peso: ${it.weight} lb.)")
            }
        )
    }

    @PostMapping("/purchase")
    @Transactional
    fun purchaseItem(@RequestBody request: PurchaseRequest) {
        val userId = SecurityUtils.getCurrentUserId()
        
        val alreadyOwned = homebrewCollectionRepository.existsByUserIdAndContentTypeAndContentId(
            userId, request.contentType, request.contentId
        )
        
        if (alreadyOwned) return

        // 1. Fetch item details (price and author)
        val (price, authorId) = when (request.contentType) {
            "CLASS" -> dndClassRepository.findById(request.contentId.toInt()).map { it.price to it.author?.id }.orElseThrow()
            "SUBCLASS" -> dndSubclassRepository.findById(request.contentId.toInt()).map { it.price to it.author?.id }.orElseThrow()
            "RACE" -> dndRaceRepository.findById(request.contentId.toInt()).map { it.price to it.author?.id }.orElseThrow()
            "MONSTER" -> monsterRepository.findById(UUID.fromString(request.contentId)).map { it.price to it.author?.id }.orElseThrow()
            "SPELL" -> spellRepository.findById(UUID.fromString(request.contentId)).map { it.price to it.author?.id }.orElseThrow()
            "ITEM" -> itemRepository.findById(UUID.fromString(request.contentId)).map { it.price to it.author?.id }.orElseThrow()
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid content type")
        }

        // 2. Process payment if there's a price and an author
        if (price > BigDecimal.ZERO && authorId != null && authorId != userId) {
            val result = paymentService.processInternalTransfer(
                fromUserId = userId,
                toUserId = authorId,
                amount = price,
                type = "HOMEBREW_PURCHASE",
                campaignId = null
            )
            
            if (!result.success) {
                throw ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, result.errorMessage)
            }
        }

        // 3. Grant access
        val collection = HomebrewCollection(
            userId = userId,
            contentType = request.contentType,
            contentId = request.contentId
        )
        homebrewCollectionRepository.save(collection)
    }
}

data class PurchaseRequest(
    val contentType: String,
    val contentId: String
)

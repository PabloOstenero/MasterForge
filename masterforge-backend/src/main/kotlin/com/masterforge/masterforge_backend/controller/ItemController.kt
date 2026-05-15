package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.ItemDto
import com.masterforge.masterforge_backend.model.entity.Item
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.ItemRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/items")
class ItemController(
    private val itemRepository: ItemRepository,
    private val userRepository: UserRepository,
    private val homebrewService: com.masterforge.masterforge_backend.service.HomebrewService
) {

    @GetMapping
    fun getAllItems(): List<Item> {
        return itemRepository.findAll()
    }

    @PostMapping
    fun createItem(@RequestBody dto: ItemDto): Item {
        val author: User? = dto.authorId?.let {
            val user = userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
            homebrewService.verifyCreationLimit(user)
            homebrewService.verifyMonetization(user, dto.price ?: java.math.BigDecimal.ZERO)
            user
        }

        val item = Item(
            name = dto.name,
            type = dto.type,
            weight = dto.weight,
            properties = dto.properties,
            author = author
        )
        return itemRepository.save(item)
    }

    @GetMapping("/{id}")
    fun getItemById(@PathVariable id: UUID): ResponseEntity<Item> {
        val item = itemRepository.findById(id)
        return if (item.isPresent) {
            ResponseEntity.ok(item.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateItem(@PathVariable id: UUID, @RequestBody dto: ItemDto): Item {
        val existingItem = itemRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found with id $id") }

        val author: User? = dto.authorId?.let {
            val user = userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
            homebrewService.verifyMonetization(user, dto.price ?: java.math.BigDecimal.ZERO)
            user
        }

        val updatedItem = existingItem.copy(
            name = dto.name,
            type = dto.type,
            weight = dto.weight,
            properties = dto.properties,
            author = author
        )
        return itemRepository.save(updatedItem)
    }

    @DeleteMapping("/{id}")
    fun deleteItem(@PathVariable id: UUID): ResponseEntity<Void> {
        val currentUserId = SecurityUtils.getCurrentUserId()
        val item = itemRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found with id $id") }

        // Official content (no author) and content owned by another user are both forbidden
        val authorId = item.author?.id
            ?: throw ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete official content")
        if (authorId != currentUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this content")
        }

        itemRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

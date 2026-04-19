package com.masterforge.masterforge_backend.controller

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
@CrossOrigin(origins = ["*"])
class ItemController(
    private val itemRepository: ItemRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllItems(): List<Item> {
        return itemRepository.findAll()
    }

    @PostMapping
    fun createItem(@RequestBody dto: ItemDto): Item {
        val author: User? = dto.authorId?.let {
            userRepository.findById(it)
                .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Author not found with id $it") }
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
}

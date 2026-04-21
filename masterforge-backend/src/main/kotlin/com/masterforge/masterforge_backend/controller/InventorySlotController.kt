package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.InventorySlotDto
import com.masterforge.masterforge_backend.model.entity.InventorySlot
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.InventorySlotRepository
import com.masterforge.masterforge_backend.repository.ItemRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/inventory-slots")
@CrossOrigin(origins = ["*"])
class InventorySlotController(
    private val inventorySlotRepository: InventorySlotRepository,
    private val characterRepository: CharacterRepository,
    private val itemRepository: ItemRepository
) {

    @GetMapping
    fun getAllInventorySlots(): List<InventorySlot> {
        return inventorySlotRepository.findAll()
    }

    @PostMapping
    fun createInventorySlot(@RequestBody dto: InventorySlotDto): InventorySlot {
        val character = characterRepository.findById(dto.characterId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Character not found with id ${dto.characterId}") }

        val item = itemRepository.findById(dto.itemId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Item not found with id ${dto.itemId}") }

        val inventorySlot = InventorySlot(
            character = character,
            item = item,
            quantity = dto.quantity,
            isEquipped = dto.isEquipped,
            isAttuned = dto.isAttuned
        )
        return inventorySlotRepository.save(inventorySlot)
    }

    @GetMapping("/{id}")
    fun getInventorySlotById(@PathVariable id: Int): ResponseEntity<InventorySlot> {
        val inventorySlot = inventorySlotRepository.findById(id)
        return if (inventorySlot.isPresent) {
            ResponseEntity.ok(inventorySlot.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateInventorySlot(@PathVariable id: Int, @RequestBody dto: InventorySlotDto): InventorySlot {
        val existingSlot = inventorySlotRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory Slot not found with id $id") }

        val character = characterRepository.findById(dto.characterId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Character not found with id ${dto.characterId}") }

        val item = itemRepository.findById(dto.itemId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Item not found with id ${dto.itemId}") }

        val updatedSlot = existingSlot.copy(
            character = character,
            item = item,
            quantity = dto.quantity,
            isEquipped = dto.isEquipped,
            isAttuned = dto.isAttuned
        )
        return inventorySlotRepository.save(updatedSlot)
    }

    @DeleteMapping("/{id}")
    fun deleteInventorySlot(@PathVariable id: Int): ResponseEntity<Void> {
        if (!inventorySlotRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        inventorySlotRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.UserDto
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = ["*"])
class UserController(private val userRepository: UserRepository) {

    @GetMapping
    fun getAllUsers(): List<User> {
        return userRepository.findAll()
    }

    @PostMapping
    fun createUser(@RequestBody userDto: UserDto): User {
        // Since User has no external relationships to resolve on creation,
        // we can map directly from the DTO.
        val user = User(
            name = userDto.name,
            email = userDto.email,
            passwordHash = userDto.passwordHash,
            subscriptionTier = userDto.subscriptionTier,
            balance = userDto.balance,
            isActive = userDto.isActive
        )
        return userRepository.save(user)
    }

    @GetMapping("/{id}")
    fun getUserById(@PathVariable id: UUID): ResponseEntity<User> {
        val user = userRepository.findById(id)
        return if (user.isPresent) {
            ResponseEntity.ok(user.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody userDto: UserDto): User {
        val existingUser = userRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with id $id") }

        val updatedUser = existingUser.copy(
            name = userDto.name,
            email = userDto.email,
            passwordHash = userDto.passwordHash,
            subscriptionTier = userDto.subscriptionTier,
            balance = userDto.balance,
            isActive = userDto.isActive
        )
        return userRepository.save(updatedUser)
    }

    @DeleteMapping("/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        userRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

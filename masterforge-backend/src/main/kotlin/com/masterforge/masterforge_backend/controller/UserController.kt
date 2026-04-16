package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.UserDto
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
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
}

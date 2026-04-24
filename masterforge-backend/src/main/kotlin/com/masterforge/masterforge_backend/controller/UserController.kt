package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.UserDto
import com.masterforge.masterforge_backend.model.dto.UserResponseDto
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserController(private val userRepository: UserRepository) {

    @GetMapping
    @Transactional(readOnly = true)
    fun getAllUsers(): List<UserResponseDto> {
        return userRepository.findAll().map { UserResponseDto.fromEntity(it) }
    }

    @PostMapping
    @Transactional
    fun createUser(@RequestBody userDto: UserDto): UserResponseDto {
        val user = User(
            name = userDto.name,
            email = userDto.email,
            passwordHash = userDto.passwordHash,
            subscriptionTier = userDto.subscriptionTier,
            balance = userDto.balance,
            isActive = userDto.isActive
        )
        return UserResponseDto.fromEntity(userRepository.save(user))
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    fun getUserById(@PathVariable id: UUID): ResponseEntity<UserResponseDto> {
        val user = userRepository.findById(id)
        return if (user.isPresent) {
            ResponseEntity.ok(UserResponseDto.fromEntity(user.get()))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    @Transactional
    fun updateUser(@PathVariable id: UUID, @RequestBody userDto: UserDto): UserResponseDto {
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
        return UserResponseDto.fromEntity(userRepository.save(updatedUser))
    }

    @DeleteMapping("/{id}")
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        userRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }

    private fun User.toDto(): UserDto = UserDto(
        name = this.name,
        email = this.email,
        passwordHash = this.passwordHash,
        subscriptionTier = this.subscriptionTier,
        balance = this.balance,
        isActive = this.isActive
    )
}

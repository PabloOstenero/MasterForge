package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.ActiveCampaignsDto
import com.masterforge.masterforge_backend.model.dto.ActiveCharactersDto
import com.masterforge.masterforge_backend.model.dto.CampaignPlayerDto
import com.masterforge.masterforge_backend.model.dto.CharacterSimpleDto
import com.masterforge.masterforge_backend.model.dto.DmNextSessionDto
import com.masterforge.masterforge_backend.model.dto.NextSessionDto
import com.masterforge.masterforge_backend.model.dto.PlayerCampaignSummaryDto
import com.masterforge.masterforge_backend.model.dto.UserDto
import com.masterforge.masterforge_backend.model.dto.UserResponseDto
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.SessionRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.server.ResponseStatusException
import org.springframework.data.domain.PageRequest
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userRepository: UserRepository,
    private val characterRepository: CharacterRepository,
    private val sessionAttendeeRepository: SessionAttendeeRepository,
    private val campaignRepository: CampaignRepository,
    private val campaignEnrollmentRepository: CampaignEnrollmentRepository,
    private val sessionRepository: SessionRepository,
    private val passwordEncoder: PasswordEncoder
) {

    @GetMapping
    @Transactional(readOnly = true)
    fun getAllUsers(): List<UserResponseDto> {
        return userRepository.findAll().map { UserResponseDto.fromEntity(it) }
    }

    @GetMapping("/me/player-count")
    @Transactional(readOnly = true)
    fun getPlayerCount(): ResponseEntity<Map<String, Long>> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val count = characterRepository.countDistinctPlayersByOwnerId(UUID.fromString(userId))
        return ResponseEntity.ok(mapOf("playerCount" to count))
    }

    @GetMapping("/me/next-session")
    @Transactional(readOnly = true)
    fun getNextSession(): ResponseEntity<NextSessionDto> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val sessions = sessionRepository.findNextSessionByEnrolledUserId(UUID.fromString(userId), PageRequest.of(0, 1))
        val next = sessions.firstOrNull()
        val dto = NextSessionDto(
            nextSessionDate = next?.scheduledDate?.toInstant()?.toString(),
            campaignId = next?.campaign?.id?.toString()
        )
        return ResponseEntity.ok(dto)
    }

    @GetMapping("/me/dm-next-session")
    @Transactional(readOnly = true)
    fun getDmNextSession(): ResponseEntity<DmNextSessionDto> {
        val dmId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val sessions = sessionRepository.findNextSessionByOwnerId(
            UUID.fromString(dmId), PageRequest.of(0, 1)
        )
        val next = sessions.firstOrNull()
        val dto = DmNextSessionDto(
            nextSessionDate = next?.scheduledDate?.toInstant()?.toString(),
            campaignId = next?.campaign?.id?.toString()
        )
        return ResponseEntity.ok(dto)
    }

    @GetMapping("/me/active-campaigns")
    @Transactional(readOnly = true)
    fun getActiveCampaigns(): ResponseEntity<ActiveCampaignsDto> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val count = campaignEnrollmentRepository.findByUserId(UUID.fromString(userId)).size.toLong()
        return ResponseEntity.ok(ActiveCampaignsDto(activeCampaigns = count))
    }

    @GetMapping("/me/active-characters")
    @Transactional(readOnly = true)
    fun getActiveCharacters(): ResponseEntity<ActiveCharactersDto> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        
        println("DEBUG: getActiveCharacters - userId: $userId")
        val totalCharacters = characterRepository.count()
        println("DEBUG: Total characters in database: $totalCharacters")
        val count = characterRepository.countByUserId(UUID.fromString(userId))
        println("DEBUG: getActiveCharacters - count for user: $count")
        
        return ResponseEntity.ok(ActiveCharactersDto(activeCharacters = count))
    }

    @GetMapping("/me/player-campaigns")
    @Transactional(readOnly = true)
    fun getPlayerCampaigns(): ResponseEntity<List<PlayerCampaignSummaryDto>> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val campaigns = campaignEnrollmentRepository.findPlayerCampaignsByUserId(UUID.fromString(userId))
        return ResponseEntity.ok(campaigns)
    }

    @GetMapping("/me/campaign-players")
    @Transactional(readOnly = true)
    fun getCampaignPlayers(): ResponseEntity<List<CampaignPlayerDto>> {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()

        val dmId = UUID.fromString(authentication.name)

        val characters = characterRepository.findCharactersByDmId(dmId)

        val campaignPlayers = characters
            .groupBy { it.user }
            .map { (user, userCharacters) ->
                CampaignPlayerDto(
                    id = user.id!!,
                    name = user.name,
                    email = user.email,
                    subscriptionTier = user.subscriptionTier,
                    characters = userCharacters.map { character ->
                        CharacterSimpleDto(
                            id = character.id!!,
                            name = character.name,
                            level = character.level,
                            dndClass = character.dndClass.name,
                            dndRace = character.dndRace.name
                        )
                    }
                )
            }

        return ResponseEntity.ok(campaignPlayers)
    }

    @PostMapping
    @Transactional
    fun createUser(@RequestBody userDto: UserDto): UserResponseDto {
        val password = userDto.passwordHash 
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required for creation")
        
        if (password.length < 6) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long")
        }
        val name = userDto.name
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required for creation")
        val email = userDto.email
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required for creation")
        
        if (userRepository.findByEmail(email).isPresent) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use")
        }

        val user = User(
            name = name,
            email = email,
            passwordHash = passwordEncoder.encode(password)!!,
            subscriptionTier = userDto.subscriptionTier ?: "FREE",
            balance = userDto.balance ?: BigDecimal.ZERO,
            isActive = userDto.isActive ?: true
        )
        return UserResponseDto.fromEntity(userRepository.save(user))
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    fun getCurrentUser(): ResponseEntity<UserResponseDto> {
        val userId = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val user = userRepository.findById(UUID.fromString(userId))
        return if (user.isPresent) {
            ResponseEntity.ok(UserResponseDto.fromEntity(user.get()))
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/me")
    @Transactional
    fun updateCurrentUser(@RequestBody userDto: UserDto): ResponseEntity<UserResponseDto> {
        val userIdStr = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val userId = UUID.fromString(userIdStr)
        val existingUser = userRepository.findById(userId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found") }

        userDto.email?.let { newEmail ->
            if (newEmail != existingUser.email && userRepository.findByEmail(newEmail).isPresent) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use")
            }
        }

        userDto.passwordHash?.let { newPassword ->
            if (newPassword.length < 6) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters long")
            }
            val currentPassword = userDto.currentPassword
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required to change password")
            if (!passwordEncoder.matches(currentPassword, existingUser.passwordHash)) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "Current password does not match")
            }
        }

        val updatedUser = existingUser.copy(
            name = userDto.name ?: existingUser.name,
            email = userDto.email ?: existingUser.email,
            passwordHash = userDto.passwordHash?.let { passwordEncoder.encode(it) } ?: existingUser.passwordHash,
            subscriptionTier = userDto.subscriptionTier ?: existingUser.subscriptionTier,
            balance = userDto.balance ?: existingUser.balance,
            isActive = userDto.isActive ?: existingUser.isActive
        )
        return ResponseEntity.ok(UserResponseDto.fromEntity(userRepository.save(updatedUser)))
    }

    @DeleteMapping("/me")
    @Transactional
    fun deleteCurrentUser(): ResponseEntity<Void> {
        val userIdStr = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val userId = UUID.fromString(userIdStr)
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.notFound().build()
        }
        userRepository.deleteById(userId)
        return ResponseEntity.noContent().build()
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

        userDto.email?.let { newEmail ->
            if (newEmail != existingUser.email && userRepository.findByEmail(newEmail).isPresent) {
                throw ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use")
            }
        }

        val updatedUser = existingUser.copy(
            name = userDto.name ?: existingUser.name,
            email = userDto.email ?: existingUser.email,
            passwordHash = userDto.passwordHash?.let { passwordEncoder.encode(it) } ?: existingUser.passwordHash,
            subscriptionTier = userDto.subscriptionTier ?: existingUser.subscriptionTier,
            balance = userDto.balance ?: existingUser.balance,
            isActive = userDto.isActive ?: existingUser.isActive
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

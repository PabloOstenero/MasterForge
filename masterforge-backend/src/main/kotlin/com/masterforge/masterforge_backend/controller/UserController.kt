package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.ActiveCampaignsDto
import com.masterforge.masterforge_backend.model.dto.ActiveCharactersDto
import com.masterforge.masterforge_backend.model.dto.CampaignPlayerDto
import com.masterforge.masterforge_backend.model.dto.CharacterSimpleDto
import com.masterforge.masterforge_backend.model.dto.NextSessionDto
import com.masterforge.masterforge_backend.model.dto.PlayerCampaignSummaryDto
import com.masterforge.masterforge_backend.model.dto.UserDto
import com.masterforge.masterforge_backend.model.dto.UserResponseDto
import com.masterforge.masterforge_backend.model.entity.User
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.CharacterRepository
import com.masterforge.masterforge_backend.repository.SessionAttendeeRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@RestController
@RequestMapping("/api/users")
class UserController(
    private val userRepository: UserRepository,
    private val characterRepository: CharacterRepository,
    private val sessionAttendeeRepository: SessionAttendeeRepository,
    private val campaignRepository: CampaignRepository,
    private val campaignEnrollmentRepository: CampaignEnrollmentRepository
) {

    @GetMapping
    @Transactional(readOnly = true)
    fun getAllUsers(): List<UserResponseDto> {
        return userRepository.findAll().map { UserResponseDto.fromEntity(it) }
    }

    @GetMapping("/me/player-count")
    @Transactional(readOnly = true)
    fun getPlayerCount(): ResponseEntity<Map<String, Long>> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val count = characterRepository.countDistinctPlayersByOwnerEmail(email)
        return ResponseEntity.ok(mapOf("playerCount" to count))
    }

    @GetMapping("/me/next-session")
    @Transactional(readOnly = true)
    fun getNextSession(): ResponseEntity<NextSessionDto> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val timestamp = sessionAttendeeRepository.findNextSessionDateByUserEmail(email)
        val dto = NextSessionDto(nextSessionDate = timestamp?.toInstant()?.toString())
        return ResponseEntity.ok(dto)
    }

    @GetMapping("/me/active-campaigns")
    @Transactional(readOnly = true)
    fun getActiveCampaigns(): ResponseEntity<ActiveCampaignsDto> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val count = campaignRepository.countDistinctCampaignsByUserEmail(email)
        return ResponseEntity.ok(ActiveCampaignsDto(activeCampaigns = count))
    }

    @GetMapping("/me/active-characters")
    @Transactional(readOnly = true)
    fun getActiveCharacters(): ResponseEntity<ActiveCharactersDto> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val count = characterRepository.countByUserEmail(email)
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

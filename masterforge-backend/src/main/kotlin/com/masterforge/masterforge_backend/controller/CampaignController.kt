package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CampaignDto
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/api/campaigns")
class CampaignController(
    private val campaignRepository: CampaignRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllCampaigns(): List<Campaign> {
        return campaignRepository.findAll()
    }

    @GetMapping("/my")
    @Transactional(readOnly = true)
    fun getMyCampaigns(): ResponseEntity<List<Campaign>> {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        val dmId = UUID.fromString(authentication.name)
        return ResponseEntity.ok(campaignRepository.findByOwnerId(dmId))
    }

    @PostMapping
    fun createCampaign(@RequestBody campaignDto: CampaignDto): Campaign {
        // Validate fields before entity construction
        if (campaignDto.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign name must not be blank")
        }
        if (campaignDto.maxPlayers < 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "maxPlayers must be at least 1")
        }
        if (campaignDto.joinPrice < BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "joinPrice must be 0 or greater")
        }
        val visibility = try {
            CampaignVisibility.valueOf(campaignDto.visibility)
        } catch (e: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility value: ${campaignDto.visibility}")
        }

        // Find the owner of the campaign. This is a mandatory relationship.
        val owner = userRepository.findById(campaignDto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${campaignDto.ownerId}") }

        val campaign = Campaign(
            name = campaignDto.name,
            description = campaignDto.description,
            owner = owner,
            maxPlayers = campaignDto.maxPlayers,
            joinPrice = campaignDto.joinPrice,
            visibility = visibility
        )

        return campaignRepository.save(campaign)
    }

    @GetMapping("/{id}")
    fun getCampaignById(@PathVariable id: UUID): ResponseEntity<Campaign> {
        val campaign = campaignRepository.findById(id)
        return if (campaign.isPresent) {
            ResponseEntity.ok(campaign.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PutMapping("/{id}")
    fun updateCampaign(@PathVariable id: UUID, @RequestBody dto: CampaignDto): Campaign {
        val existingCampaign = campaignRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign not found with id $id") }

        // Validate fields before entity construction
        if (dto.name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign name must not be blank")
        }
        if (dto.maxPlayers < 1) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "maxPlayers must be at least 1")
        }
        if (dto.joinPrice < BigDecimal.ZERO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "joinPrice must be 0 or greater")
        }
        val visibility = try {
            CampaignVisibility.valueOf(dto.visibility)
        } catch (e: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid visibility value: ${dto.visibility}")
        }

        val owner = userRepository.findById(dto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${dto.ownerId}") }

        val updatedCampaign = existingCampaign.copy(
            name = dto.name,
            description = dto.description,
            owner = owner,
            maxPlayers = dto.maxPlayers,
            joinPrice = dto.joinPrice,
            visibility = visibility
        )
        return campaignRepository.save(updatedCampaign)
    }

    @DeleteMapping("/{id}")
    fun deleteCampaign(@PathVariable id: UUID): ResponseEntity<Void> {
        if (!campaignRepository.existsById(id)) {
            return ResponseEntity.notFound().build()
        }
        campaignRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}

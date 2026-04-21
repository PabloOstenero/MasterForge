package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.CampaignDto
import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

@RestController
@RequestMapping("/api/campaigns")
@CrossOrigin(origins = ["*"])
class CampaignController(
    private val campaignRepository: CampaignRepository,
    private val userRepository: UserRepository
) {

    @GetMapping
    fun getAllCampaigns(): List<Campaign> {
        return campaignRepository.findAll()
    }

    @PostMapping
    fun createCampaign(@RequestBody campaignDto: CampaignDto): Campaign {
        // Find the owner of the campaign. This is a mandatory relationship.
        val owner = userRepository.findById(campaignDto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${campaignDto.ownerId}") }

        val campaign = Campaign(
            name = campaignDto.name,
            description = campaignDto.description,
            owner = owner
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

        val owner = userRepository.findById(dto.ownerId)
            .orElseThrow { ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner not found with id ${dto.ownerId}") }

        val updatedCampaign = existingCampaign.copy(
            name = dto.name,
            description = dto.description,
            owner = owner
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

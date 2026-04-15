package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.repository.CampaignRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/campaigns")
@CrossOrigin(origins = ["*"])
class CampaignController(private val campaignRepository: CampaignRepository) {

    @GetMapping
    fun getAllCampaigns(): List<Campaign> {
        return campaignRepository.findAll()
    }

    @PostMapping
    fun createCampaign(@RequestBody campaign: Campaign): Campaign {
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
}

package com.masterforge.masterforge_backend.service

import com.masterforge.masterforge_backend.model.dto.CampaignAvailabilityDto
import com.masterforge.masterforge_backend.model.dto.CampaignAvailabilityUpdateDto
import com.masterforge.masterforge_backend.model.dto.CampaignSearchDto
import com.masterforge.masterforge_backend.model.dto.CampaignSearchResponseDto
import com.masterforge.masterforge_backend.model.dto.SearchCriteriaDto
import com.masterforge.masterforge_backend.repository.CampaignEnrollmentRepository
import com.masterforge.masterforge_backend.repository.CampaignRepository
import com.masterforge.masterforge_backend.repository.UserRepository
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Service responsible for campaign search, filtering, and availability operations.
 *
 * Implements full-text search across campaign names and descriptions with support
 * for price range, capacity, and availability filters. All results are paginated
 * and restricted to PUBLIC visibility campaigns.
 *
 * Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3, 8.1, 8.2
 */
@Service
@Transactional(readOnly = true)
class CampaignSearchService(
    private val campaignRepository: CampaignRepository,
    private val enrollmentRepository: CampaignEnrollmentRepository,
    private val userRepository: UserRepository
) {

    /**
     * Search and filter public campaigns with pagination.
     *
     * Applies case-insensitive partial matching on name and description (Req 2.1, 2.2),
     * price range filtering (Req 3.1), capacity filtering (Req 3.2), and availability
     * filtering (Req 3.3). Multiple filters are combined with AND logic (Req 3.4).
     *
     * Results are cached by criteria key to reduce database load (Req 8.5).
     * Enrollment counts are fetched in a single batch query to avoid N+1 (Req 8.1, 8.2).
     *
     * @param criteria search text, filter parameters, and pagination settings
     * @return paginated list of matching campaigns with enrollment counts
     */
    @Cacheable(
        value = ["campaignSearch"],
        key = "#userId.toString() + '_' + #criteria.searchText + '_' + #criteria.dmName + '_' + #criteria.minPrice + '_' + #criteria.maxPrice + '_' + #criteria.minPlayers + '_' + #criteria.maxPlayers + '_' + #criteria.availableOnly + '_' + #criteria.page + '_' + #criteria.size"
    )
    fun searchCampaigns(criteria: SearchCriteriaDto, userId: UUID): CampaignSearchResponseDto {
        val pageable = PageRequest.of(
            criteria.page,
            criteria.size,
            Sort.by(Sort.Direction.DESC, "id")
        )

        val availableOnly = criteria.availableOnly ?: false

        val page = campaignRepository.searchCampaignsWithFilters(
            searchText = criteria.searchText?.takeIf { it.isNotBlank() },
            dmName = criteria.dmName?.takeIf { it.isNotBlank() },
            minPrice = criteria.minPrice,
            maxPrice = criteria.maxPrice,
            minPlayers = criteria.minPlayers,
            maxPlayers = criteria.maxPlayers,
            availableOnly = availableOnly,
            userId = userId,
            pageable = pageable
        )

        // Batch-fetch enrollment counts in a single query to avoid N+1 (Req 8.1, 8.2)
        val campaignIds = page.content.mapNotNull { it.id }
        val enrollmentCountMap: Map<UUID, Int> = if (campaignIds.isEmpty()) {
            emptyMap()
        } else {
            campaignRepository.countEnrollmentsByCampaignIds(campaignIds)
                .associate { row -> (row[0] as UUID) to (row[1] as Long).toInt() }
        }

        val campaignDtos = page.content.map { campaign ->
            val campaignId = campaign.id ?: error("Campaign has no ID")
            val ownerId = campaign.owner.id ?: error("Campaign owner has no ID")
            val currentPlayers = enrollmentCountMap[campaignId] ?: 0
            CampaignSearchDto(
                id = campaignId,
                name = campaign.name,
                description = campaign.description,
                ownerName = campaign.owner.name,
                ownerId = ownerId,
                maxPlayers = campaign.maxPlayers,
                currentPlayers = currentPlayers,
                joinPrice = campaign.joinPrice,
                visibility = campaign.visibility,
                hasAvailableSlots = currentPlayers < campaign.maxPlayers
            )
        }

        return CampaignSearchResponseDto(
            campaigns = campaignDtos,
            totalElements = page.totalElements,
            totalPages = page.totalPages,
            currentPage = page.number,
            hasNext = page.hasNext(),
            hasPrevious = page.hasPrevious()
        )
    }

    /**
     * Get detailed availability information for a specific campaign.
     *
     * Used to check whether a user can join a campaign before initiating enrollment.
     *
     * @param campaignId the campaign to check
     * @param userId the user requesting availability info
     * @return availability details including slot count and user eligibility
     */
    fun getCampaignAvailability(campaignId: UUID, userId: UUID): CampaignAvailabilityDto {
        val campaign = campaignRepository.findById(campaignId)
            .orElseThrow { NoSuchElementException("Campaign not found: $campaignId") }

        val currentPlayers = enrollmentRepository.countByCampaignId(campaignId).toInt()
        val isOwner = campaign.owner.id == userId
        val isAlreadyEnrolled = enrollmentRepository.existsByCampaignIdAndUserId(campaignId, userId)

        return CampaignAvailabilityDto(
            campaignId = campaignId,
            currentPlayers = currentPlayers,
            maxPlayers = campaign.maxPlayers,
            hasAvailableSlots = currentPlayers < campaign.maxPlayers,
            isUserEligible = !isOwner && !isAlreadyEnrolled && currentPlayers < campaign.maxPlayers,
            isUserOwner = isOwner,
            isUserAlreadyEnrolled = isAlreadyEnrolled
        )
    }

    /**
     * Get a single campaign as a search DTO, including current enrollment count.
     *
     * @param campaignId the campaign to retrieve
     * @return campaign search DTO or null if not found
     */
    fun getCampaignById(campaignId: UUID): CampaignSearchDto? {
        val campaign = campaignRepository.findById(campaignId).orElse(null) ?: return null
        val currentPlayers = enrollmentRepository.countByCampaignId(campaignId).toInt()

        return CampaignSearchDto(
            id = campaign.id!!,
            name = campaign.name,
            description = campaign.description,
            ownerName = campaign.owner.name,
            ownerId = campaign.owner.id!!,
            maxPlayers = campaign.maxPlayers,
            currentPlayers = currentPlayers,
            joinPrice = campaign.joinPrice,
            visibility = campaign.visibility,
            hasAvailableSlots = currentPlayers < campaign.maxPlayers
        )
    }

    /**
     * Get availability updates for all PUBLIC campaigns.
     *
     * Used by the polling fallback endpoint when WebSocket is unavailable.
     * Returns a lightweight list of availability snapshots so the frontend
     * can refresh join button states without a full search reload.
     *
     * Requirements: 10.1, 10.6
     */
    fun getAllCampaignAvailabilityUpdates(): List<CampaignAvailabilityUpdateDto> {
        val allPublic = campaignRepository.findAll()
            .filter { it.visibility.name == "PUBLIC" }

        if (allPublic.isEmpty()) return emptyList()

        val campaignIds = allPublic.mapNotNull { it.id }
        val enrollmentCountMap: Map<UUID, Int> = campaignRepository
            .countEnrollmentsByCampaignIds(campaignIds)
            .associate { row -> (row[0] as UUID) to (row[1] as Long).toInt() }

        return allPublic.map { campaign ->
            val id = campaign.id!!
            val currentPlayers = enrollmentCountMap[id] ?: 0
            CampaignAvailabilityUpdateDto(
                campaignId = id,
                currentPlayers = currentPlayers,
                maxPlayers = campaign.maxPlayers,
                hasAvailableSlots = currentPlayers < campaign.maxPlayers
            )
        }
    }
}

package com.masterforge.masterforge_backend.model.dto

import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

/**
 * DTO for campaign search results with enrollment information.
 */
data class CampaignSearchDto(
    val id: UUID,
    val name: String,
    val description: String,
    val ownerName: String,
    val ownerId: UUID,
    val maxPlayers: Int,
    val currentPlayers: Int,
    val joinPrice: BigDecimal,
    val visibility: CampaignVisibility,
    val hasAvailableSlots: Boolean,
    val createdAt: LocalDateTime? = null
)

/**
 * DTO for search criteria and filters.
 */
data class SearchCriteriaDto(
    val searchText: String? = null,
    val dmName: String? = null,
    val minPrice: BigDecimal? = null,
    val maxPrice: BigDecimal? = null,
    val minPlayers: Int? = null,
    val maxPlayers: Int? = null,
    val availableOnly: Boolean? = null,
    val page: Int = 0,
    val size: Int = 20
)

/**
 * DTO for paginated search results.
 */
data class CampaignSearchResponseDto(
    val campaigns: List<CampaignSearchDto>,
    val totalElements: Long,
    val totalPages: Int,
    val currentPage: Int,
    val hasNext: Boolean,
    val hasPrevious: Boolean
)

/**
 * DTO for campaign availability information.
 */
data class CampaignAvailabilityDto(
    val campaignId: UUID,
    val currentPlayers: Int,
    val maxPlayers: Int,
    val hasAvailableSlots: Boolean,
    val isUserEligible: Boolean,
    val isUserOwner: Boolean,
    val isUserAlreadyEnrolled: Boolean
)

/**
 * DTO for real-time campaign availability updates (polling fallback).
 * Matches the CampaignAvailabilityUpdate interface in the frontend WebSocketService.
 *
 * Requirements: 10.1, 10.6
 */
data class CampaignAvailabilityUpdateDto(
    val campaignId: UUID,
    val currentPlayers: Int,
    val maxPlayers: Int,
    val hasAvailableSlots: Boolean
)
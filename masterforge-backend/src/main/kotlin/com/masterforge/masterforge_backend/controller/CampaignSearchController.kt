package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.config.SecurityUtils
import com.masterforge.masterforge_backend.model.dto.CampaignAvailabilityDto
import com.masterforge.masterforge_backend.model.dto.CampaignAvailabilityUpdateDto
import com.masterforge.masterforge_backend.model.dto.CampaignSearchResponseDto
import com.masterforge.masterforge_backend.model.dto.EnrollmentResultDto
import com.masterforge.masterforge_backend.model.dto.PaymentRequest
import com.masterforge.masterforge_backend.model.dto.SearchCriteriaDto
import com.masterforge.masterforge_backend.service.CampaignSearchService
import com.masterforge.masterforge_backend.service.EnrollmentService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.util.UUID

/**
 * REST controller for campaign search, filtering, and enrollment operations.
 *
 * All endpoints require authentication (enforced by SecurityConfig).
 *
 * Requirements: 1.1, 1.2, 4.1, 4.2, 4.5
 */
@RestController
@RequestMapping("/api/campaigns")
class CampaignSearchController(
    private val campaignSearchService: CampaignSearchService,
    private val enrollmentService: EnrollmentService
) {

    /**
     * Search and filter publicly visible campaigns with pagination.
     *
     * Returns only PUBLIC campaigns (Req 1.1, 1.5). Supports full-text search
     * across name and description (Req 2.1, 2.2), price range filtering (Req 3.1),
     * capacity filtering (Req 3.2), and availability filtering (Req 3.3).
     * Multiple filters are combined with AND logic (Req 3.4).
     *
     * GET /api/campaigns/search
     *
     * @param searchText optional text to search in campaign name and description
     * @param minPrice optional minimum join price filter
     * @param maxPrice optional maximum join price filter
     * @param minPlayers optional minimum player capacity filter
     * @param maxPlayers optional maximum player capacity filter
     * @param availableOnly when true, only campaigns with available slots are returned
     * @param page zero-based page number (default 0)
     * @param size page size (default 20)
     * @return paginated list of matching campaigns
     */
    @GetMapping("/search")
    fun searchCampaigns(
        @RequestParam(required = false) searchText: String?,
        @RequestParam(required = false) minPrice: BigDecimal?,
        @RequestParam(required = false) maxPrice: BigDecimal?,
        @RequestParam(required = false) minPlayers: Int?,
        @RequestParam(required = false) maxPlayers: Int?,
        @RequestParam(required = false) availableOnly: Boolean?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<CampaignSearchResponseDto> {
        val criteria = SearchCriteriaDto(
            searchText = searchText,
            minPrice = minPrice,
            maxPrice = maxPrice,
            minPlayers = minPlayers,
            maxPlayers = maxPlayers,
            availableOnly = availableOnly,
            page = page,
            size = size
        )
        val result = campaignSearchService.searchCampaigns(criteria)
        return ResponseEntity.ok(result)
    }

    /**
     * Join a free campaign immediately.
     *
     * Validates eligibility (not owner, not already enrolled, slots available) and
     * creates an enrollment record (Req 4.1, 4.3, 4.4, 4.5).
     *
     * POST /api/campaigns/{campaignId}/join
     *
     * @param campaignId the campaign to join
     * @return enrollment result with success status and message
     */
    @PostMapping("/{campaignId}/join")
    fun joinFreeCampaign(@PathVariable campaignId: UUID): ResponseEntity<EnrollmentResultDto> {
        val userId = getCurrentUserId()
        val result = enrollmentService.enrollInFreeCampaign(campaignId, userId)
        return if (result.success) {
            ResponseEntity.ok(result)
        } else {
            ResponseEntity.status(HttpStatus.CONFLICT).body(result)
        }
    }

    /**
     * Join a paid campaign by processing a mock payment first.
     *
     * ACADEMIC DISCLAIMER: Payment processing is a mock simulation for educational purposes only.
     *
     * Validates eligibility, processes the mock payment, and creates an enrollment
     * record linked to the payment transaction (Req 4.2, 5.4, 5.5).
     *
     * POST /api/campaigns/{campaignId}/join-paid
     *
     * @param campaignId the campaign to join
     * @param paymentRequest mock payment details including amount and card data
     * @return enrollment result with success status and message
     */
    @PostMapping("/{campaignId}/join-paid")
    fun joinPaidCampaign(
        @PathVariable campaignId: UUID,
        @RequestBody paymentRequest: PaymentRequest
    ): ResponseEntity<EnrollmentResultDto> {
        val userId = getCurrentUserId()

        // Ensure the payment request targets the correct campaign and user
        val resolvedRequest = paymentRequest.copy(
            campaignId = campaignId,
            userId = userId
        )

        val result = enrollmentService.processPaidEnrollment(campaignId, userId, resolvedRequest)
        return if (result.success) {
            ResponseEntity.ok(result)
        } else {
            ResponseEntity.status(HttpStatus.CONFLICT).body(result)
        }
    }

    /**
     * Check availability and user eligibility for a specific campaign.
     *
     * Returns current player count, max players, available slots, and whether
     * the authenticated user is eligible to join (Req 4.5).
     *
     * GET /api/campaigns/{campaignId}/availability
     *
     * @param campaignId the campaign to check
     * @return availability details including slot count and user eligibility
     */
    @GetMapping("/{campaignId}/availability")
    fun checkAvailability(@PathVariable campaignId: UUID): ResponseEntity<CampaignAvailabilityDto> {
        val userId = getCurrentUserId()
        return try {
            val availability = campaignSearchService.getCampaignAvailability(campaignId, userId)
            ResponseEntity.ok(availability)
        } catch (ex: NoSuchElementException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, ex.message)
        }
    }

    /**
     * Polling fallback endpoint for real-time campaign availability updates.
     *
     * Used by the frontend WebSocketService when WebSocket is unavailable.
     * Returns current availability for all PUBLIC campaigns so the UI can
     * refresh join button states without a full page reload.
     *
     * GET /api/campaigns/availability/updates
     *
     * Requirements: 10.1, 10.6
     */
    @GetMapping("/availability/updates")
    fun getAvailabilityUpdates(): ResponseEntity<List<CampaignAvailabilityUpdateDto>> {
        val updates = campaignSearchService.getAllCampaignAvailabilityUpdates()
        return ResponseEntity.ok(updates)
    }

    // ── private helpers ───────────────────────────────────────────────────────

    /**
     * Extract the authenticated user's UUID from the security context.
     *
     * Delegates to [SecurityUtils.getCurrentUserId].
     */
    private fun getCurrentUserId(): UUID = SecurityUtils.getCurrentUserId()
}

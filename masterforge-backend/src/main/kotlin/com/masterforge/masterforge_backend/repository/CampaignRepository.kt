package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Campaign
import com.masterforge.masterforge_backend.model.entity.CampaignVisibility
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.util.UUID

@Repository
interface CampaignRepository : JpaRepository<Campaign, UUID> {

    @Query("SELECT COUNT(DISTINCT sa.session.campaign.id) FROM SessionAttendee sa WHERE sa.user.email = :email")
    fun countDistinctCampaignsByUserEmail(@Param("email") email: String): Long

    fun findByOwnerId(ownerId: UUID): List<Campaign>
    
    /**
     * Search campaigns with full-text search capabilities.
     * Searches across campaign name and description with case-insensitive matching.
     */
    @Query("""
        SELECT c FROM Campaign c 
        WHERE c.visibility = 'PUBLIC'
        AND (
            LOWER(c.name) LIKE LOWER(CONCAT('%', :searchText, '%')) 
            OR LOWER(c.description) LIKE LOWER(CONCAT('%', :searchText, '%'))
        )
    """)
    fun searchPublicCampaigns(@Param("searchText") searchText: String, pageable: Pageable): Page<Campaign>
    
    /**
     * Find public campaigns with filtering options.
     */
    @Query("""
        SELECT c FROM Campaign c 
        WHERE c.visibility = 'PUBLIC'
        AND (:minPrice IS NULL OR c.joinPrice >= :minPrice)
        AND (:maxPrice IS NULL OR c.joinPrice <= :maxPrice)
        AND (:minPlayers IS NULL OR c.maxPlayers >= :minPlayers)
        AND (:maxPlayers IS NULL OR c.maxPlayers <= :maxPlayers)
    """)
    fun findPublicCampaignsWithFilters(
        @Param("minPrice") minPrice: BigDecimal?,
        @Param("maxPrice") maxPrice: BigDecimal?,
        @Param("minPlayers") minPlayers: Int?,
        @Param("maxPlayers") maxPlayers: Int?,
        pageable: Pageable
    ): Page<Campaign>
    
    /**
     * Search and filter campaigns with availability check.
     *
     * Uses a native SQL query to avoid Hibernate passing null parameters as
     * untyped bytea to PostgreSQL (which causes "function lower(bytea) does not exist").
     * The CAST ensures PostgreSQL always receives a typed value.
     */
    @Query(value = """
        SELECT c.* FROM campaigns c
        INNER JOIN users u ON c.owner_id = u.id
        WHERE c.visibility = 'PUBLIC'
        AND (CAST(:searchText AS text) IS NULL OR 
             LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')) OR 
             LOWER(c.description) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')) OR
             LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')))
        AND (CAST(:dmName AS text) IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:dmName AS text), '%')))
        AND (CAST(:minPrice AS numeric) IS NULL OR c.join_price >= CAST(:minPrice AS numeric))
        AND (CAST(:maxPrice AS numeric) IS NULL OR c.join_price <= CAST(:maxPrice AS numeric))
        AND (CAST(:minPlayers AS integer) IS NULL OR c.max_players >= CAST(:minPlayers AS integer))
        AND (CAST(:maxPlayers AS integer) IS NULL OR c.max_players <= CAST(:maxPlayers AS integer))
        AND (:availableOnly = false OR 
             (SELECT COUNT(ce.id) FROM campaign_enrollments ce WHERE ce.campaign_id = c.id) < c.max_players)
        ORDER BY c.id DESC
    """, countQuery = """
        SELECT COUNT(*) FROM campaigns c
        INNER JOIN users u ON c.owner_id = u.id
        WHERE c.visibility = 'PUBLIC'
        AND (CAST(:searchText AS text) IS NULL OR 
             LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')) OR 
             LOWER(c.description) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')) OR
             LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:searchText AS text), '%')))
        AND (CAST(:dmName AS text) IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:dmName AS text), '%')))
        AND (CAST(:minPrice AS numeric) IS NULL OR c.join_price >= CAST(:minPrice AS numeric))
        AND (CAST(:maxPrice AS numeric) IS NULL OR c.join_price <= CAST(:maxPrice AS numeric))
        AND (CAST(:minPlayers AS integer) IS NULL OR c.max_players >= CAST(:minPlayers AS integer))
        AND (CAST(:maxPlayers AS integer) IS NULL OR c.max_players <= CAST(:maxPlayers AS integer))
        AND (:availableOnly = false OR 
             (SELECT COUNT(ce.id) FROM campaign_enrollments ce WHERE ce.campaign_id = c.id) < c.max_players)
    """, nativeQuery = true)
    fun searchCampaignsWithFilters(
        @Param("searchText") searchText: String?,
        @Param("dmName") dmName: String?,
        @Param("minPrice") minPrice: BigDecimal?,
        @Param("maxPrice") maxPrice: BigDecimal?,
        @Param("minPlayers") minPlayers: Int?,
        @Param("maxPlayers") maxPlayers: Int?,
        @Param("availableOnly") availableOnly: Boolean,
        pageable: Pageable
    ): Page<Campaign>
    
    /**
     * Find campaigns by visibility.
     */
    fun findByVisibility(visibility: CampaignVisibility, pageable: Pageable): Page<Campaign>
    
    /**
     * Find campaigns with available slots.
     */
    @Query("""
        SELECT c FROM Campaign c 
        WHERE c.visibility = 'PUBLIC'
        AND (SELECT COUNT(e) FROM CampaignEnrollment e WHERE e.campaign.id = c.id) < c.maxPlayers
    """)
    fun findAvailableCampaigns(pageable: Pageable): Page<Campaign>
    
    /**
     * Find campaigns that are full.
     */
    @Query("""
        SELECT c FROM Campaign c 
        WHERE c.visibility = 'PUBLIC'
        AND (SELECT COUNT(e) FROM CampaignEnrollment e WHERE e.campaign.id = c.id) >= c.maxPlayers
    """)
    fun findFullCampaigns(pageable: Pageable): Page<Campaign>
    
    /**
     * Get campaign with current enrollment count.
     */
    @Query("""
        SELECT c, COUNT(e) as currentPlayers
        FROM Campaign c 
        LEFT JOIN CampaignEnrollment e ON c.id = e.campaign.id
        WHERE c.id = :campaignId
        GROUP BY c
    """)
    fun findCampaignWithEnrollmentCount(@Param("campaignId") campaignId: UUID): List<Any>

    /**
     * Batch-fetch enrollment counts for a list of campaign IDs in a single query.
     *
     * Returns a list of [campaignId, count] pairs. Campaigns with zero enrollments
     * are NOT included — callers should default missing entries to 0.
     *
     * Replaces the N+1 pattern of calling countByCampaignId() per campaign.
     * Requirements: 8.1, 8.2, 8.5
     */
    @Query("SELECT e.campaign.id, COUNT(e) FROM CampaignEnrollment e WHERE e.campaign.id IN :campaignIds GROUP BY e.campaign.id")
    fun countEnrollmentsByCampaignIds(@Param("campaignIds") campaignIds: List<UUID>): List<Array<Any>>
}


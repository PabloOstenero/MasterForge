package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.CampaignEnrollment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * Repository interface for CampaignEnrollment entities.
 * Provides data access methods for campaign enrollment operations.
 */
@Repository
interface CampaignEnrollmentRepository : JpaRepository<CampaignEnrollment, UUID> {
    
    /**
     * Find all enrollments for a specific campaign.
     */
    fun findByCampaignId(campaignId: UUID): List<CampaignEnrollment>
    
    /**
     * Find all enrollments for a specific user.
     */
    fun findByUserId(userId: UUID): List<CampaignEnrollment>
    
    /**
     * Check if a user is already enrolled in a campaign.
     */
    fun existsByCampaignIdAndUserId(campaignId: UUID, userId: UUID): Boolean
    
    /**
     * Find a specific enrollment by campaign and user.
     */
    fun findByCampaignIdAndUserId(campaignId: UUID, userId: UUID): CampaignEnrollment?
    
    /**
     * Count the number of enrolled users in a campaign.
     */
    @Query("SELECT COUNT(e) FROM CampaignEnrollment e WHERE e.campaign.id = :campaignId")
    fun countByCampaignId(@Param("campaignId") campaignId: UUID): Long
    
    /**
     * Find enrollments with payment transactions.
     */
    @Query("SELECT e FROM CampaignEnrollment e WHERE e.paymentTransactionId IS NOT NULL")
    fun findPaidEnrollments(): List<CampaignEnrollment>
    
    /**
     * Find enrollments without payment transactions (free campaigns).
     */
    @Query("SELECT e FROM CampaignEnrollment e WHERE e.paymentTransactionId IS NULL")
    fun findFreeEnrollments(): List<CampaignEnrollment>
    
    /**
     * Validate enrollment eligibility - check if user can join campaign.
     * Returns true if user is not already enrolled and is not the campaign owner.
     */
    @Query("""
        SELECT CASE WHEN COUNT(e) = 0 AND c.owner.id != :userId THEN true ELSE false END
        FROM Campaign c 
        LEFT JOIN CampaignEnrollment e ON c.id = e.campaign.id AND e.user.id = :userId
        WHERE c.id = :campaignId
    """)
    fun isUserEligibleForEnrollment(@Param("campaignId") campaignId: UUID, @Param("userId") userId: UUID): Boolean
    
    /**
     * Check if campaign has available slots for new enrollments.
     */
    @Query("""
        SELECT CASE WHEN COUNT(e) < c.maxPlayers THEN true ELSE false END
        FROM Campaign c 
        LEFT JOIN CampaignEnrollment e ON c.id = e.campaign.id
        WHERE c.id = :campaignId
        GROUP BY c.id, c.maxPlayers
    """)
    fun hasAvailableSlots(@Param("campaignId") campaignId: UUID): Boolean
    
    /**
     * Get enrollment history for a user with campaign details.
     */
    @Query("""
        SELECT e FROM CampaignEnrollment e 
        JOIN FETCH e.campaign c 
        JOIN FETCH e.user u 
        WHERE e.user.id = :userId 
        ORDER BY e.enrolledAt DESC
    """)
    fun findEnrollmentHistoryByUserId(@Param("userId") userId: UUID): List<CampaignEnrollment>
    
    /**
     * Find recent enrollments within specified days for monitoring.
     */
    @Query("""
        SELECT e FROM CampaignEnrollment e 
        WHERE e.enrolledAt >= :sinceDate 
        ORDER BY e.enrolledAt DESC
    """)
    fun findRecentEnrollments(@Param("sinceDate") sinceDate: java.time.LocalDateTime): List<CampaignEnrollment>
}
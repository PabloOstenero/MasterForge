package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Session
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SessionRepository : JpaRepository<Session, UUID> {
    fun findByCampaignIdOrderByScheduledDateAsc(campaignId: UUID): List<Session>

    @Query("""
        SELECT s FROM Session s
        JOIN FETCH s.campaign
        WHERE s.campaign.owner.id = :ownerId
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionByOwnerId(@Param("ownerId") ownerId: UUID, pageable: Pageable): List<Session>

    @Query("""
        SELECT s FROM Session s
        JOIN FETCH s.campaign c
        JOIN CampaignEnrollment e ON e.campaign.id = c.id
        WHERE e.user.id = :userId
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionByEnrolledUserId(@Param("userId") userId: UUID, pageable: Pageable): List<Session>
}

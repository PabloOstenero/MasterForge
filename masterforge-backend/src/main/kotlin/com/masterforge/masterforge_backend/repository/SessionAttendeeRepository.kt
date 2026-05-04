package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.dto.PlayerCampaignSummaryDto
import com.masterforge.masterforge_backend.model.entity.Session
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface SessionAttendeeRepository : JpaRepository<SessionAttendee, SessionAttendeeId> {

    @Query("SELECT MIN(s.scheduledDate) FROM SessionAttendee sa JOIN sa.session s WHERE sa.user.email = :email AND s.scheduledDate > CURRENT_TIMESTAMP")
    fun findNextSessionDateByUserEmail(@Param("email") email: String): java.sql.Timestamp?

    @Query("""
        SELECT s FROM Session s
        JOIN s.campaign c
        JOIN CampaignEnrollment e ON e.campaign.id = c.id
        WHERE e.user.id = :userId
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionByUserId(@Param("userId") userId: UUID, pageable: Pageable): List<Session>

    @Query("""
        SELECT s FROM SessionAttendee sa
        JOIN sa.session s
        JOIN FETCH s.campaign
        WHERE sa.user.email = :email
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionByUserEmail(@Param("email") email: String, pageable: Pageable): List<Session>

    @Query("""
        SELECT s.scheduledDate, c.id
        FROM SessionAttendee sa
        JOIN sa.session s
        JOIN s.campaign c
        WHERE sa.user.email = :email
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionWithCampaignByUserEmail(@Param("email") email: String): List<Any>

    @Query("""
        SELECT s.id
        FROM SessionAttendee sa
        JOIN sa.session s
        WHERE sa.user.email = :email
        AND s.scheduledDate > CURRENT_TIMESTAMP
        ORDER BY s.scheduledDate ASC
    """)
    fun findNextSessionIdByUserEmail(@Param("email") email: String, pageable: Pageable): List<java.util.UUID>

    @Query("""
        SELECT new com.masterforge.masterforge_backend.model.dto.PlayerCampaignSummaryDto(
            c.id,
            c.name,
            c.owner.name,
            CAST(MIN(CASE WHEN s.scheduledDate > CURRENT_TIMESTAMP THEN s.scheduledDate ELSE NULL END) AS string)
        )
        FROM SessionAttendee sa
        JOIN sa.session s
        JOIN s.campaign c
        WHERE sa.user.email = :email
        GROUP BY c.id, c.name, c.owner.name
    """)
    fun findPlayerCampaignsByUserEmail(@Param("email") email: String): List<PlayerCampaignSummaryDto>
}

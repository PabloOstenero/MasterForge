package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.dto.PlayerCampaignSummaryDto
import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface SessionAttendeeRepository : JpaRepository<SessionAttendee, SessionAttendeeId> {

    @Query("SELECT MIN(s.scheduledDate) FROM SessionAttendee sa JOIN sa.session s WHERE sa.user.email = :email AND s.scheduledDate > CURRENT_TIMESTAMP")
    fun findNextSessionDateByUserEmail(@Param("email") email: String): java.sql.Timestamp?

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

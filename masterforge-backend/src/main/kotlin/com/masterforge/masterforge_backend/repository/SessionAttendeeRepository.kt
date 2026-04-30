package com.masterforge.masterforge_backend.repository

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
}

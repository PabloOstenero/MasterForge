package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.SessionAttendee
import com.masterforge.masterforge_backend.model.entity.SessionAttendeeId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SessionAttendeeRepository : JpaRepository<SessionAttendee, SessionAttendeeId>

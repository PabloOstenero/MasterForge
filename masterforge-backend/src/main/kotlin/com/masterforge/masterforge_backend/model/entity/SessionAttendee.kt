package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.io.Serializable
import java.util.UUID

/**
 * Composite key for the SessionAttendee entity.
 */
@Embeddable
data class SessionAttendeeId(
    @Column(name = "session_id")
    val sessionId: UUID,

    @Column(name = "user_id")
    val userId: UUID
) : Serializable

/**
 * Represents a user's attendance in a specific session, acting as a join table
 * between Session and User.
 */
@Entity
@Table(name = "session_attendees")
data class SessionAttendee(
    @EmbeddedId
    val id: SessionAttendeeId,

    @Column(name = "has_paid", nullable = false)
    val hasPaid: Boolean,

    // The session this attendance record belongs to.
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("sessionId") // This maps the 'sessionId' part of the composite key
    @JoinColumn(name = "session_id")
    val session: Session,

    // The user this attendance record belongs to.
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") // This maps the 'userId' part of the composite key
    @JoinColumn(name = "user_id")
    val user: User
)

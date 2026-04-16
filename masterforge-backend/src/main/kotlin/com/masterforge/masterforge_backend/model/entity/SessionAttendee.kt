package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.io.Serializable
import java.util.UUID

@Embeddable
data class SessionAttendeeId(
    @Column(name = "session_id")
    val sessionId: UUID,

    @Column(name = "user_id")
    val userId: UUID
) : Serializable

@Entity
@Table(name = "session_attendees")
data class SessionAttendee(
    @EmbeddedId
    val id: SessionAttendeeId,

    @Column(name = "has_paid", nullable = false)
    val hasPaid: Boolean,

    // Relaciones
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("sessionId")
    @JoinColumn(name = "session_id")
    val session: Session,

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    val user: User
)

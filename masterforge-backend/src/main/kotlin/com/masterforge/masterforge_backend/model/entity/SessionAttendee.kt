package com.masterforge.masterforge_backend.model.entity

import jakarta.persistence.*
import java.io.Serializable
import java.util.UUID

@Embeddable
data class SessionAttendeeId(
    @Column(name = "session_id")
    val sessionId: UUID = UUID(0,0),

    @Column(name = "client_id")
    val clientId: UUID = UUID(0,0)
): Serializable

@Entity
@Table(name = "session_attendees")
data class SessionAttendee(

    @EmbeddedId
    val id: SessionAttendeeId,

    @MapsId("sessionId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", insertable = false, updatable = false)
    val session: Session,

    @MapsId("clientId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", insertable = false, updatable = false)
    val client: Client,

    @Column(nullable = false, name = "has_paid")
    val hasPaid: Boolean
)

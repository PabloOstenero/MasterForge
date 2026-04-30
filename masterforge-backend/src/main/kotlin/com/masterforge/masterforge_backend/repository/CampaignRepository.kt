package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Campaign
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface CampaignRepository : JpaRepository<Campaign, UUID> {

    @Query("SELECT COUNT(DISTINCT sa.session.campaign.id) FROM SessionAttendee sa WHERE sa.user.email = :email")
    fun countDistinctCampaignsByUserEmail(@Param("email") email: String): Long
}


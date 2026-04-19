package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.InventorySlot
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface InventorySlotRepository : JpaRepository<InventorySlot, Int>

package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.DndClass
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface DndClassRepository : JpaRepository<DndClass, Int>

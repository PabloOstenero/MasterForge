package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.RaceTrait
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface RaceTraitRepository : JpaRepository<RaceTrait, Long>

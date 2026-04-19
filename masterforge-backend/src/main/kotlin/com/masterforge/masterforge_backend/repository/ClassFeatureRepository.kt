package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.ClassFeature
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ClassFeatureRepository : JpaRepository<ClassFeature, Long>

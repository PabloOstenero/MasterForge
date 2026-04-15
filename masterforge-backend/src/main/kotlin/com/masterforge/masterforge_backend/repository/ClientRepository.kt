package com.masterforge.masterforge_backend.repository

import com.masterforge.masterforge_backend.model.entity.Client
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface ClientRepository : JpaRepository<Client, UUID> {}
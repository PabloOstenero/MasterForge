package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.entity.Client
import com.masterforge.masterforge_backend.repository.ClientRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = ["*"])
class ClientController(private val clientRepository: ClientRepository) {

    @GetMapping
    fun getAllClients(): List<Client> {
        return clientRepository.findAll()
    }

    @PostMapping
    fun createClient(@RequestBody client: Client): Client {
        return clientRepository.save(client)
    }

    @GetMapping("/{id}")
    fun getClientById(@PathVariable id: UUID): ResponseEntity<Client> {
        val client = clientRepository.findById(id)
        return if (client.isPresent) {
            ResponseEntity.ok(client.get())
        } else {
            ResponseEntity.notFound().build()
        }
    }
}
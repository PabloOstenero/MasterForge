package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.model.dto.UserResponseDto
import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.TwoFactorService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.*

@RestController
@RequestMapping("/api/2fa")
class TwoFactorController(
    private val userRepository: UserRepository,
    private val twoFactorService: TwoFactorService
) {

    @GetMapping("/setup")
    fun setup2fa(): ResponseEntity<Map<String, String>> {
        val userIdStr = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val user = userRepository.findById(UUID.fromString(userIdStr))
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found") }

        val secret = twoFactorService.generateNewSecret()
        val qrUri = twoFactorService.getQrCodeUri(secret, user.email)

        return ResponseEntity.ok(mapOf(
            "secret" to secret,
            "qrUri" to qrUri
        ))
    }

    @PostMapping("/enable")
    @Transactional
    fun enable2fa(@RequestBody request: Map<String, String>): ResponseEntity<UserResponseDto> {
        val userIdStr = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val user = userRepository.findById(UUID.fromString(userIdStr))
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found") }

        val secret = request["secret"] ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Secret is required")
        val code = request["code"] ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Code is required")

        if (twoFactorService.isCodeValid(secret, code)) {
            val recoveryCodes = (1..10).map { 
                UUID.randomUUID().toString().substring(0, 8).uppercase() 
            }
            user.twoFactorSecret = secret
            user.is2faEnabled = true
            user.recoveryCodes.clear()
            user.recoveryCodes.addAll(recoveryCodes)
            
            return ResponseEntity.ok(UserResponseDto.fromEntity(userRepository.save(user)))
        } else {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid 2FA code")
        }
    }

    @PostMapping("/disable")
    @Transactional
    fun disable2fa(): ResponseEntity<UserResponseDto> {
        val userIdStr = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val user = userRepository.findById(UUID.fromString(userIdStr))
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found") }

        user.twoFactorSecret = null
        user.is2faEnabled = false
        user.recoveryCodes.clear()
        
        return ResponseEntity.ok(UserResponseDto.fromEntity(userRepository.save(user)))
    }
}

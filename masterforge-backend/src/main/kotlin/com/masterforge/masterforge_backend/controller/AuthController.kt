package com.masterforge.masterforge_backend.controller

import com.masterforge.masterforge_backend.repository.UserRepository
import com.masterforge.masterforge_backend.service.JwtService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

data class LoginRequest(val email: String, val password: String)
data class LoginResponse(
    val token: String? = null,
    val requiresMfa: Boolean = false,
    val mfaToken: String? = null
)
data class MfaVerifyRequest(val mfaToken: String, val code: String)
data class ErrorResponse(val error: String)

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val jwtService: JwtService,
    private val passwordEncoder: PasswordEncoder,
    private val twoFactorService: com.masterforge.masterforge_backend.service.TwoFactorService
) {

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<*> {
        val user = userRepository.findByEmail(request.email).orElse(null)
            ?: return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse("Invalid email or password"))

        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse("Invalid email or password"))
        }

        if (user.is2faEnabled) {
            val mfaToken = jwtService.generateMfaToken(user.id!!)
            return ResponseEntity.ok(LoginResponse(requiresMfa = true, mfaToken = mfaToken))
        }

        val token = jwtService.generateToken(user.id!!, user.email)
        return ResponseEntity.ok(LoginResponse(token))
    }

    @PostMapping("/verify-2fa")
    fun verify2fa(@RequestBody request: MfaVerifyRequest): ResponseEntity<*> {
        val userIdStr = jwtService.getSubject(request.mfaToken)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponse("Invalid or expired MFA token"))
        
        val user = userRepository.findById(UUID.fromString(userIdStr))
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "User not found") }

        val cleanCode = request.code.trim()
        
        // Check TOTP code
        val currentSecret = user.twoFactorSecret
        val isTotpValid = if (currentSecret != null) {
            twoFactorService.isCodeValid(currentSecret, cleanCode)
        } else false
        
        // Check Recovery Codes
        val recoveryCodeMatch = user.recoveryCodes.find { it.equals(cleanCode, ignoreCase = true) }

        if (isTotpValid || recoveryCodeMatch != null) {
            if (recoveryCodeMatch != null) {
                // Remove used recovery code
                val updatedRecoveryCodes = user.recoveryCodes.filter { it != recoveryCodeMatch }
                user.recoveryCodes.clear()
                user.recoveryCodes.addAll(updatedRecoveryCodes)
                userRepository.save(user)
            }
            
            val token = jwtService.generateToken(user.id!!, user.email)
            return ResponseEntity.ok(LoginResponse(token))
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponse("Invalid 2FA code or recovery code"))
        }
    }
}

package com.masterforge.masterforge_backend.service

import dev.samstevens.totp.code.CodeGenerator
import dev.samstevens.totp.code.CodeVerifier
import dev.samstevens.totp.code.DefaultCodeGenerator
import dev.samstevens.totp.code.DefaultCodeVerifier
import dev.samstevens.totp.code.HashingAlgorithm
import dev.samstevens.totp.qr.QrData
import dev.samstevens.totp.secret.DefaultSecretGenerator
import dev.samstevens.totp.secret.SecretGenerator
import dev.samstevens.totp.time.SystemTimeProvider
import dev.samstevens.totp.time.TimeProvider
import org.springframework.stereotype.Service
import java.util.Date

@Service
class TwoFactorService {

    private val secretGenerator: SecretGenerator = DefaultSecretGenerator()
    private val timeProvider: TimeProvider = SystemTimeProvider()
    private val codeGenerator: CodeGenerator = DefaultCodeGenerator()
    private val verifier: CodeVerifier = DefaultCodeVerifier(codeGenerator, timeProvider)

    fun generateNewSecret(): String {
        return secretGenerator.generate()
    }

    fun getQrCodeUri(secret: String, email: String): String {
        val data = QrData.Builder()
            .label(email)
            .secret(secret)
            .issuer("MasterForge")
            .algorithm(HashingAlgorithm.SHA1)
            .digits(6)
            .period(30)
            .build()
        return data.uri
    }

    fun isCodeValid(secret: String, code: String): Boolean {
        val unixTime = timeProvider.getTime()
        val cleanCode = code.trim()
        
        // Check current, previous and next intervals (60s drift)
        val currentBucket = unixTime / 30
        for (i in -2..2) {
            val checkCode = codeGenerator.generate(secret, currentBucket + i)
            if (checkCode == cleanCode) {
                return true
            }
        }
        
        return false
    }
}

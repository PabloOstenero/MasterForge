package com.masterforge.masterforge_backend

import jakarta.annotation.PostConstruct
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import java.util.*

@SpringBootApplication
class MasterforgeBackendApplication {
	@PostConstruct
	fun init() {
		// Force UTC timezone to ensure consistency for TOTP
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
	}
}

fun main(args: Array<String>) {
	runApplication<MasterforgeBackendApplication>(*args)
}

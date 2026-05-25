package com.masterforge.masterforge_backend.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig : WebMvcConfigurer {

    override fun addCorsMappings(registry: CorsRegistry) {
        // Aplicamos la configuración a todos los endpoints de la API
        registry.addMapping("/**")
            // Whitelist specific frontend development and production ports
            .allowedOriginPatterns("http://localhost:8100", "http://localhost:4200", "https://pabloostenero.github.io")
            // Permitimos todos los métodos necesarios, incluyendo PUT y OPTIONS (preflight)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
            .allowedHeaders("*")
            .allowCredentials(true)
    }
}
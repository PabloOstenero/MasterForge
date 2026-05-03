package com.masterforge.masterforge_backend.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.filter.CommonsRequestLoggingFilter

/**
 * Configures request/response logging for development and staging environments.
 *
 * The [CommonsRequestLoggingFilter] logs incoming HTTP requests including the
 * query string, client IP, and up to 1 000 characters of the request payload.
 * Headers are intentionally excluded to avoid leaking Authorization tokens in logs.
 *
 * **Production note:** In production the log level for
 * `org.springframework.web.filter.CommonsRequestLoggingFilter` is set to WARN
 * in `application-prod.properties`, which silences this filter entirely without
 * requiring a code change or a separate bean definition.
 */
@Configuration
class LoggingConfig {

    @Bean
    fun requestLoggingFilter(): CommonsRequestLoggingFilter {
        val filter = CommonsRequestLoggingFilter()
        filter.setIncludeQueryString(true)
        filter.setIncludePayload(true)
        filter.setMaxPayloadLength(1000)
        filter.setIncludeHeaders(false)
        filter.setIncludeClientInfo(true)
        return filter
    }
}

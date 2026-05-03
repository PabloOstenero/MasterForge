package com.masterforge.masterforge_backend.config

import org.springframework.cache.annotation.EnableCaching
import org.springframework.context.annotation.Configuration

/**
 * Spring Cache configuration.
 *
 * Enables the Spring caching abstraction. The cache type is configured via
 * application.properties (spring.cache.type=simple for in-memory ConcurrentHashMap).
 *
 * Caches:
 * - "campaignSearch": caches paginated search results keyed by search criteria.
 *   Evicted on any enrollment change to keep availability counts accurate.
 *
 * Requirements: 8.5
 */
@Configuration
@EnableCaching
class CacheConfig

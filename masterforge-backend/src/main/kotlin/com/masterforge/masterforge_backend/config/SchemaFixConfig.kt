package com.masterforge.masterforge_backend.config

import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.JdbcTemplate
import org.slf4j.LoggerFactory

/**
 * SchemaFixConfig — automatically handles database schema adjustments for development.
 * 
 * ACADEMIC DISCLAIMER: This is a helper for development environments to ensure
 * the database schema matches the entity requirements without manual migration.
 */
@Configuration
class SchemaFixConfig {
    private val logger = LoggerFactory.getLogger(SchemaFixConfig::class.java)

    @Bean
    fun fixPaymentSchema(jdbcTemplate: JdbcTemplate): CommandLineRunner {
        return CommandLineRunner {
            try {
                logger.info("Checking payment_transactions schema for campaign_id nullability...")
                // In PostgreSQL, Hibernate 'update' doesn't remove NOT NULL constraints.
                // We do it manually to support subscription payments (where campaign_id is null).
                jdbcTemplate.execute("ALTER TABLE payment_transactions ALTER COLUMN campaign_id DROP NOT NULL")
                
                // Drop enum check constraint to allow new scenarios (EXPIRED_SUBSCRIPTION)
                jdbcTemplate.execute("ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_simulation_scenario_check")

                // Fix for is_credit column in case auto-update fails on existing data
                jdbcTemplate.execute("""
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_transactions' AND column_name='is_credit') THEN
                            ALTER TABLE payment_transactions ADD COLUMN is_credit BOOLEAN DEFAULT FALSE;
                        END IF;
                        UPDATE payment_transactions SET is_credit = FALSE WHERE is_credit IS NULL;
                        ALTER TABLE payment_transactions ALTER COLUMN is_credit SET NOT NULL;
                    END $$;
                """.trimIndent())
                
                logger.info("Successfully adjusted payment_transactions schema for subscriptions, scenarios and is_credit logic.")
            } catch (e: Exception) {
                // If the table doesn't exist yet or the column is already nullable, this might fail.
                // We log it as a warning but don't stop the application.
                logger.warn("Could not adjust payment_transactions schema: ${e.message}")
            }
        }
    }
}

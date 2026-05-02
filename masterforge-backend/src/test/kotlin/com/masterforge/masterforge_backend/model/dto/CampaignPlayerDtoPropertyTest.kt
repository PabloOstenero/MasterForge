package com.masterforge.masterforge_backend.model.dto

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.property.Arb
import io.kotest.property.arbitrary.Codepoint
import io.kotest.property.arbitrary.alphanumeric
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.string
import io.kotest.property.arbitrary.uuid
import io.kotest.property.checkAll
import java.util.UUID

// Feature: dm-players-campaign-filter, Property 2: response items contain required fields

/**
 * Property 2: Response items contain required fields
 * Validates: Requirements 1.2
 *
 * For any randomly generated CampaignPlayerDto, all required fields
 * (id, name, email, subscriptionTier, characters) must be non-null.
 */
class CampaignPlayerDtoPropertyTest : StringSpec({

    "Property 2: CampaignPlayerDto always has non-null required fields" {
        // Feature: dm-players-campaign-filter, Property 2: response items contain required fields
        checkAll(
            100,
            Arb.uuid(),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..20, Codepoint.alphanumeric()),
            Arb.int(0..5)
        ) { id, name, email, subscriptionTier, numChars ->
            val characters = (0 until numChars).map { i ->
                CharacterSimpleDto(
                    id = UUID.randomUUID(),
                    name = "Char$i",
                    level = i + 1,
                    dndClass = "Fighter",
                    dndRace = "Human"
                )
            }

            val dto = CampaignPlayerDto(
                id = id,
                name = name,
                email = email,
                subscriptionTier = subscriptionTier,
                characters = characters
            )

            // Property: all required fields are non-null
            dto.id.shouldNotBeNull()
            dto.name.shouldNotBeNull()
            dto.email.shouldNotBeNull()
            dto.subscriptionTier.shouldNotBeNull()
            dto.characters.shouldNotBeNull()
        }
    }

    "Property 2: CampaignPlayerDto with empty characters list still has all required fields non-null" {
        // Feature: dm-players-campaign-filter, Property 2: response items contain required fields
        checkAll(
            100,
            Arb.uuid(),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..20, Codepoint.alphanumeric())
        ) { id, name, email, subscriptionTier ->
            val dto = CampaignPlayerDto(
                id = id,
                name = name,
                email = email,
                subscriptionTier = subscriptionTier,
                characters = emptyList()
            )

            dto.id.shouldNotBeNull()
            dto.name.shouldNotBeNull()
            dto.email.shouldNotBeNull()
            dto.subscriptionTier.shouldNotBeNull()
            dto.characters.shouldNotBeNull()
        }
    }

    "Property 2: CampaignPlayerDto characters list items all have non-null required fields" {
        // Feature: dm-players-campaign-filter, Property 2: response items contain required fields
        checkAll(
            100,
            Arb.uuid(),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..50, Codepoint.alphanumeric()),
            Arb.string(1..20, Codepoint.alphanumeric()),
            Arb.int(1..5)
        ) { id, name, email, subscriptionTier, numChars ->
            val characters = (0 until numChars).map { i ->
                CharacterSimpleDto(
                    id = UUID.randomUUID(),
                    name = "Char$i",
                    level = i + 1,
                    dndClass = "Fighter",
                    dndRace = "Human"
                )
            }

            val dto = CampaignPlayerDto(
                id = id,
                name = name,
                email = email,
                subscriptionTier = subscriptionTier,
                characters = characters
            )

            // Property: each CharacterSimpleDto in the list also has non-null required fields
            dto.characters.forEach { char ->
                char.id.shouldNotBeNull()
                char.name.shouldNotBeNull()
                char.dndClass.shouldNotBeNull()
                char.dndRace.shouldNotBeNull()
            }
        }
    }
})

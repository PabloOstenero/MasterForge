/**
 * CampaignParser — parses and validates raw JSON from the backend API
 * into typed Campaign objects, and serialises Campaign objects back to JSON.
 *
 * Validates: Requirements 9.1, 9.4, 9.5, 9.6
 */

import { Campaign, CampaignOwner, CampaignVisibility } from './campaign.models';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true when the value is a non-null plain object. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns true when the value is a non-empty string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Returns true when the value is a finite number. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

/** Returns true when the value is a positive integer (>= 1). */
function isPositiveInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 1;
}

/** Returns true when the value is a non-negative integer (>= 0). */
function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

/** Returns true when the value is a non-negative number (>= 0). */
function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** Returns true when the value is a valid CampaignVisibility enum member. */
function isValidVisibility(value: unknown): value is CampaignVisibility {
  return Object.values(CampaignVisibility).includes(value as CampaignVisibility);
}

/**
 * Attempts to parse a Date from an ISO string.
 * Returns the parsed Date on success, or null if the string is invalid.
 */
function parseDateOrNull(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// CampaignParser
// ---------------------------------------------------------------------------

export class CampaignParser {
  /**
   * Parses a raw JSON object (from the backend API) into a typed Campaign.
   *
   * Validates all required fields are present and of the correct type.
   * Returns `{ success: true, campaign }` on success.
   * Returns `{ success: false, error: string }` on failure, listing ALL
   * missing or invalid fields in the error message.
   *
   * Validates: Requirements 9.1, 9.4, 9.5
   */
  static parse(
    raw: unknown,
  ): { success: true; campaign: Campaign } | { success: false; error: string } {
    const errors: string[] = [];

    // ── Top-level object check ──────────────────────────────────────────────
    if (!isObject(raw)) {
      return { success: false, error: 'Invalid campaign data: expected a JSON object' };
    }

    // ── Required string fields ──────────────────────────────────────────────
    if (!isNonEmptyString(raw['id'])) {
      errors.push('id: must be a non-empty string');
    }
    if (!isNonEmptyString(raw['name'])) {
      errors.push('name: must be a non-empty string');
    }
    if (!isNonEmptyString(raw['description'])) {
      errors.push('description: must be a non-empty string');
    }

    // ── Owner object ────────────────────────────────────────────────────────
    let owner: CampaignOwner | null = null;
    if (!isObject(raw['owner'])) {
      errors.push('owner: must be an object');
    } else {
      const ownerRaw = raw['owner'] as Record<string, unknown>;
      const ownerErrors: string[] = [];

      if (!isNonEmptyString(ownerRaw['id'])) {
        ownerErrors.push('owner.id: must be a non-empty string');
      }
      if (!isNonEmptyString(ownerRaw['name'])) {
        ownerErrors.push('owner.name: must be a non-empty string');
      }
      if (!isNonEmptyString(ownerRaw['subscriptionTier'])) {
        ownerErrors.push('owner.subscriptionTier: must be a non-empty string');
      }

      if (ownerErrors.length === 0) {
        owner = {
          id: ownerRaw['id'] as string,
          name: ownerRaw['name'] as string,
          subscriptionTier: ownerRaw['subscriptionTier'] as string,
        };
      } else {
        errors.push(...ownerErrors);
      }
    }

    // ── Numeric fields ──────────────────────────────────────────────────────
    if (!isPositiveInteger(raw['maxPlayers'])) {
      errors.push('maxPlayers: must be a positive integer');
    }
    if (!isNonNegativeInteger(raw['currentPlayers'])) {
      errors.push('currentPlayers: must be a non-negative integer');
    }
    if (!isNonNegativeNumber(raw['joinPrice'])) {
      errors.push('joinPrice: must be a non-negative number');
    }

    // ── Enum field ──────────────────────────────────────────────────────────
    if (!isValidVisibility(raw['visibility'])) {
      errors.push(
        `visibility: must be one of ${Object.values(CampaignVisibility).join(', ')}`,
      );
    }

    // ── Cross-field validation (only when individual fields are valid) ──────
    if (
      isPositiveInteger(raw['maxPlayers']) &&
      isNonNegativeInteger(raw['currentPlayers']) &&
      (raw['currentPlayers'] as number) > (raw['maxPlayers'] as number)
    ) {
      errors.push('currentPlayers must not exceed maxPlayers');
    }

    // ── Return early if any errors were found ───────────────────────────────
    if (errors.length > 0) {
      return {
        success: false,
        error: `Invalid campaign data: ${errors.join('; ')}`,
      };
    }

    // ── Optional date fields ────────────────────────────────────────────────
    const createdAt: Date =
      raw['createdAt'] !== undefined && raw['createdAt'] !== null
        ? (parseDateOrNull(raw['createdAt']) ?? new Date())
        : new Date();

    const updatedAt: Date =
      raw['updatedAt'] !== undefined && raw['updatedAt'] !== null
        ? (parseDateOrNull(raw['updatedAt']) ?? new Date())
        : new Date();

    const campaign: Campaign = {
      id: raw['id'] as string,
      name: raw['name'] as string,
      description: raw['description'] as string,
      owner: owner!,
      maxPlayers: raw['maxPlayers'] as number,
      currentPlayers: raw['currentPlayers'] as number,
      joinPrice: raw['joinPrice'] as number,
      visibility: raw['visibility'] as CampaignVisibility,
      createdAt,
      updatedAt,
    };

    return { success: true, campaign };
  }

  /**
   * Parses an array of raw JSON objects into Campaign[].
   *
   * Skips invalid entries and logs them via console.warn.
   * Returns the array of successfully parsed campaigns.
   *
   * Validates: Requirement 9.1
   */
  static parseArray(rawArray: unknown[]): Campaign[] {
    const campaigns: Campaign[] = [];

    for (let i = 0; i < rawArray.length; i++) {
      const result = CampaignParser.parse(rawArray[i]);
      if (result.success) {
        campaigns.push(result.campaign);
      } else {
        console.warn(`CampaignParser.parseArray: skipping entry at index ${i} — ${result.error}`);
      }
    }

    return campaigns;
  }

  /**
   * Serialises a Campaign back to a plain JSON-compatible object
   * suitable for sending to the backend API.
   *
   * Validates: Requirement 9.6 (pretty-printer / round-trip support)
   */
  static toJson(campaign: Campaign): Record<string, unknown> {
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      owner: {
        id: campaign.owner.id,
        name: campaign.owner.name,
        subscriptionTier: campaign.owner.subscriptionTier,
      },
      maxPlayers: campaign.maxPlayers,
      currentPlayers: campaign.currentPlayers,
      joinPrice: campaign.joinPrice,
      visibility: campaign.visibility,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}

/**
 * Unit tests for CampaignParser.
 * Covers parse(), parseArray(), and toJson() methods.
 *
 * Validates: Requirements 9.1, 9.4, 9.5, 9.6
 */

import * as fc from 'fast-check';
import { Campaign, CampaignVisibility } from './campaign.models';
import { CampaignParser } from './campaign.parser';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal valid raw campaign object. */
function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'campaign-1',
    name: 'Test Campaign',
    description: 'A test campaign description',
    owner: {
      id: 'owner-1',
      name: 'Dungeon Master',
      subscriptionTier: 'FREE',
    },
    maxPlayers: 5,
    currentPlayers: 2,
    joinPrice: 0,
    visibility: CampaignVisibility.PUBLIC,
    createdAt: '2025-01-05T10:00:00.000Z',
    updatedAt: '2025-01-05T12:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CampaignParser.parse()
// ---------------------------------------------------------------------------

describe('CampaignParser.parse()', () => {
  describe('valid input', () => {
    it('should parse a fully valid raw object', () => {
      const result = CampaignParser.parse(validRaw());
      expect(result.success).toBeTrue();
      if (result.success) {
        expect(result.campaign.id).toBe('campaign-1');
        expect(result.campaign.name).toBe('Test Campaign');
        expect(result.campaign.description).toBe('A test campaign description');
        expect(result.campaign.owner.id).toBe('owner-1');
        expect(result.campaign.owner.name).toBe('Dungeon Master');
        expect(result.campaign.owner.subscriptionTier).toBe('FREE');
        expect(result.campaign.maxPlayers).toBe(5);
        expect(result.campaign.currentPlayers).toBe(2);
        expect(result.campaign.joinPrice).toBe(0);
        expect(result.campaign.visibility).toBe(CampaignVisibility.PUBLIC);
        expect(result.campaign.createdAt).toEqual(new Date('2025-01-05T10:00:00.000Z'));
        expect(result.campaign.updatedAt).toEqual(new Date('2025-01-05T12:00:00.000Z'));
      }
    });

    it('should default createdAt to now when absent', () => {
      const before = Date.now();
      const result = CampaignParser.parse(validRaw({ createdAt: undefined }));
      const after = Date.now();
      expect(result.success).toBeTrue();
      if (result.success) {
        const ts = result.campaign.createdAt.getTime();
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
      }
    });

    it('should default updatedAt to now when absent', () => {
      const before = Date.now();
      const result = CampaignParser.parse(validRaw({ updatedAt: undefined }));
      const after = Date.now();
      expect(result.success).toBeTrue();
      if (result.success) {
        const ts = result.campaign.updatedAt.getTime();
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
      }
    });

    it('should default createdAt to now when null', () => {
      const before = Date.now();
      const result = CampaignParser.parse(validRaw({ createdAt: null }));
      const after = Date.now();
      expect(result.success).toBeTrue();
      if (result.success) {
        const ts = result.campaign.createdAt.getTime();
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
      }
    });

    it('should accept currentPlayers equal to maxPlayers', () => {
      const result = CampaignParser.parse(validRaw({ currentPlayers: 5, maxPlayers: 5 }));
      expect(result.success).toBeTrue();
    });

    it('should accept currentPlayers of 0', () => {
      const result = CampaignParser.parse(validRaw({ currentPlayers: 0 }));
      expect(result.success).toBeTrue();
    });

    it('should accept a positive joinPrice', () => {
      const result = CampaignParser.parse(validRaw({ joinPrice: 9.99 }));
      expect(result.success).toBeTrue();
      if (result.success) {
        expect(result.campaign.joinPrice).toBe(9.99);
      }
    });

    it('should accept all CampaignVisibility values', () => {
      for (const vis of Object.values(CampaignVisibility)) {
        const result = CampaignParser.parse(validRaw({ visibility: vis }));
        expect(result.success)
          .withContext(`expected success for visibility=${vis}`)
          .toBeTrue();
      }
    });
  });

  describe('invalid top-level input', () => {
    it('should fail for null', () => {
      const result = CampaignParser.parse(null);
      expect(result.success).toBeFalse();
    });

    it('should fail for a string', () => {
      const result = CampaignParser.parse('not an object');
      expect(result.success).toBeFalse();
    });

    it('should fail for an array', () => {
      const result = CampaignParser.parse([]);
      expect(result.success).toBeFalse();
    });

    it('should fail for a number', () => {
      const result = CampaignParser.parse(42);
      expect(result.success).toBeFalse();
    });
  });

  describe('missing required string fields', () => {
    it('should fail and mention "id" when id is missing', () => {
      const result = CampaignParser.parse(validRaw({ id: undefined }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('id');
    });

    it('should fail and mention "name" when name is missing', () => {
      const result = CampaignParser.parse(validRaw({ name: undefined }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('name');
    });

    it('should fail and mention "description" when description is missing', () => {
      const result = CampaignParser.parse(validRaw({ description: undefined }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('description');
    });

    it('should fail when id is an empty string', () => {
      const result = CampaignParser.parse(validRaw({ id: '' }));
      expect(result.success).toBeFalse();
    });

    it('should fail when name is whitespace only', () => {
      const result = CampaignParser.parse(validRaw({ name: '   ' }));
      expect(result.success).toBeFalse();
    });
  });

  describe('invalid owner field', () => {
    it('should fail when owner is missing', () => {
      const result = CampaignParser.parse(validRaw({ owner: undefined }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('owner');
    });

    it('should fail when owner is not an object', () => {
      const result = CampaignParser.parse(validRaw({ owner: 'not-an-object' }));
      expect(result.success).toBeFalse();
    });

    it('should fail and mention "owner.id" when owner.id is missing', () => {
      const result = CampaignParser.parse(
        validRaw({ owner: { id: undefined, name: 'DM', subscriptionTier: 'FREE' } }),
      );
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('owner.id');
    });

    it('should fail and mention "owner.name" when owner.name is missing', () => {
      const result = CampaignParser.parse(
        validRaw({ owner: { id: 'o1', name: undefined, subscriptionTier: 'FREE' } }),
      );
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('owner.name');
    });

    it('should fail and mention "owner.subscriptionTier" when missing', () => {
      const result = CampaignParser.parse(
        validRaw({ owner: { id: 'o1', name: 'DM', subscriptionTier: undefined } }),
      );
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('owner.subscriptionTier');
    });
  });

  describe('invalid numeric fields', () => {
    it('should fail when maxPlayers is 0', () => {
      const result = CampaignParser.parse(validRaw({ maxPlayers: 0 }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('maxPlayers');
    });

    it('should fail when maxPlayers is negative', () => {
      const result = CampaignParser.parse(validRaw({ maxPlayers: -1 }));
      expect(result.success).toBeFalse();
    });

    it('should fail when maxPlayers is a float', () => {
      const result = CampaignParser.parse(validRaw({ maxPlayers: 4.5 }));
      expect(result.success).toBeFalse();
    });

    it('should fail when currentPlayers is negative', () => {
      const result = CampaignParser.parse(validRaw({ currentPlayers: -1 }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('currentPlayers');
    });

    it('should fail when joinPrice is negative', () => {
      const result = CampaignParser.parse(validRaw({ joinPrice: -0.01 }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('joinPrice');
    });

    it('should fail when currentPlayers exceeds maxPlayers', () => {
      const result = CampaignParser.parse(validRaw({ currentPlayers: 6, maxPlayers: 5 }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('currentPlayers');
    });
  });

  describe('invalid visibility field', () => {
    it('should fail when visibility is an unknown string', () => {
      const result = CampaignParser.parse(validRaw({ visibility: 'UNKNOWN' }));
      expect(result.success).toBeFalse();
      if (!result.success) expect(result.error).toContain('visibility');
    });

    it('should fail when visibility is missing', () => {
      const result = CampaignParser.parse(validRaw({ visibility: undefined }));
      expect(result.success).toBeFalse();
    });
  });

  describe('error message completeness (Requirement 9.5)', () => {
    it('should list ALL invalid fields in a single error message', () => {
      const result = CampaignParser.parse({
        // id, name, description, owner, maxPlayers, currentPlayers, joinPrice, visibility all missing
      });
      expect(result.success).toBeFalse();
      if (!result.success) {
        expect(result.error).toContain('id');
        expect(result.error).toContain('name');
        expect(result.error).toContain('description');
        expect(result.error).toContain('owner');
        expect(result.error).toContain('maxPlayers');
        expect(result.error).toContain('currentPlayers');
        expect(result.error).toContain('joinPrice');
        expect(result.error).toContain('visibility');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// CampaignParser.parseArray()
// ---------------------------------------------------------------------------

describe('CampaignParser.parseArray()', () => {
  it('should return all campaigns when all entries are valid', () => {
    const raw = [validRaw({ id: 'c1' }), validRaw({ id: 'c2' })];
    const result = CampaignParser.parseArray(raw);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].id).toBe('c2');
  });

  it('should skip invalid entries and return only valid ones', () => {
    const raw = [validRaw({ id: 'c1' }), { invalid: true }, validRaw({ id: 'c3' })];
    const result = CampaignParser.parseArray(raw);
    expect(result.length).toBe(2);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('should return an empty array when all entries are invalid', () => {
    const result = CampaignParser.parseArray([null, undefined, 'bad', 42]);
    expect(result).toEqual([]);
  });

  it('should return an empty array for an empty input', () => {
    const result = CampaignParser.parseArray([]);
    expect(result).toEqual([]);
  });

  it('should warn via console.warn for each skipped entry', () => {
    spyOn(console, 'warn');
    CampaignParser.parseArray([null, validRaw(), 'bad']);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// CampaignParser.toJson()
// ---------------------------------------------------------------------------

describe('CampaignParser.toJson()', () => {
  it('should serialise a Campaign to a plain object with ISO date strings', () => {
    const parseResult = CampaignParser.parse(validRaw());
    expect(parseResult.success).toBeTrue();
    if (!parseResult.success) return;

    const json = CampaignParser.toJson(parseResult.campaign);

    expect(json['id']).toBe('campaign-1');
    expect(json['name']).toBe('Test Campaign');
    expect(json['description']).toBe('A test campaign description');
    expect(json['maxPlayers']).toBe(5);
    expect(json['currentPlayers']).toBe(2);
    expect(json['joinPrice']).toBe(0);
    expect(json['visibility']).toBe(CampaignVisibility.PUBLIC);
    expect(typeof json['createdAt']).toBe('string');
    expect(typeof json['updatedAt']).toBe('string');

    const owner = json['owner'] as Record<string, unknown>;
    expect(owner['id']).toBe('owner-1');
    expect(owner['name']).toBe('Dungeon Master');
    expect(owner['subscriptionTier']).toBe('FREE');
  });

  it('should produce ISO strings that can be re-parsed to the same Date', () => {
    const parseResult = CampaignParser.parse(validRaw());
    expect(parseResult.success).toBeTrue();
    if (!parseResult.success) return;

    const json = CampaignParser.toJson(parseResult.campaign);
    expect(new Date(json['createdAt'] as string)).toEqual(parseResult.campaign.createdAt);
    expect(new Date(json['updatedAt'] as string)).toEqual(parseResult.campaign.updatedAt);
  });
});

// ---------------------------------------------------------------------------
// Property-based test: round-trip (Requirement 9.7)
// **Validates: Requirements 9.7**
// ---------------------------------------------------------------------------

describe('CampaignParser round-trip property (Requirement 9.7)', () => {
  /**
   * Property 23: Campaign JSON Parsing Round-Trip
   * For any valid Campaign object, serializing to JSON then parsing back
   * should produce an equivalent object.
   *
   * **Validates: Requirements 9.7**
   */
  it('parse(toJson(campaign)) should produce an equivalent Campaign', () => {
    const visibilityArb = fc.constantFrom(...Object.values(CampaignVisibility));

    const campaignArb = fc
      .record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        ownerId: fc.uuid(),
        ownerName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        ownerTier: fc.constantFrom('FREE', 'PREMIUM', 'ENTERPRISE'),
        maxPlayers: fc.integer({ min: 1, max: 20 }),
        currentPlayersOffset: fc.integer({ min: 0, max: 20 }),
        joinPrice: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }).map((n) =>
          Math.round(n * 100) / 100,
        ),
        visibility: visibilityArb,
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).filter((d) => !isNaN(d.getTime())),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }).filter((d) => !isNaN(d.getTime())),
      })
      .map((raw) => {
        const currentPlayers = Math.min(raw.currentPlayersOffset, raw.maxPlayers);
        const campaign: Campaign = {
          id: raw.id,
          name: raw.name,
          description: raw.description,
          owner: {
            id: raw.ownerId,
            name: raw.ownerName,
            subscriptionTier: raw.ownerTier,
          },
          maxPlayers: raw.maxPlayers,
          currentPlayers,
          joinPrice: raw.joinPrice,
          visibility: raw.visibility,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };
        return campaign;
      });

    let passed = true;
    fc.assert(
      fc.property(campaignArb, (original) => {
        const json = CampaignParser.toJson(original);
        const result = CampaignParser.parse(json);

        if (!result.success) { passed = false; return false; }

        const roundTripped = result.campaign;
        const ok =
          roundTripped.id === original.id &&
          roundTripped.name === original.name &&
          roundTripped.description === original.description &&
          roundTripped.owner.id === original.owner.id &&
          roundTripped.owner.name === original.owner.name &&
          roundTripped.owner.subscriptionTier === original.owner.subscriptionTier &&
          roundTripped.maxPlayers === original.maxPlayers &&
          roundTripped.currentPlayers === original.currentPlayers &&
          roundTripped.joinPrice === original.joinPrice &&
          roundTripped.visibility === original.visibility &&
          roundTripped.createdAt.getTime() === original.createdAt.getTime() &&
          roundTripped.updatedAt.getTime() === original.updatedAt.getTime();
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  /**
   * Property 24: Campaign Field Validation
   * For any campaign data with missing required fields, the validation
   * should detect and report the missing fields.
   *
   * **Validates: Requirements 9.4**
   */
  it('should always report errors for objects missing required fields', () => {
    const requiredFields = [
      'id',
      'name',
      'description',
      'owner',
      'maxPlayers',
      'currentPlayers',
      'joinPrice',
      'visibility',
    ];

    let passed = true;
    fc.assert(
      fc.property(fc.subarray(requiredFields, { minLength: 1 }), (fieldsToRemove) => {
        const raw = validRaw();
        for (const field of fieldsToRemove) {
          delete raw[field];
        }
        const result = CampaignParser.parse(raw);
        const ok = result.success === false;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Property-based test: Campaign Parser JSON Processing (Requirement 9.1)
// **Validates: Requirements 9.1**
// ---------------------------------------------------------------------------

describe('Property 25: Campaign Parser JSON Processing (Requirement 9.1)', () => {
  /**
   * Property 25: Campaign Parser JSON Processing
   * For any valid campaign JSON from the backend API, the parser should
   * successfully convert it to a typed TypeScript Campaign object.
   *
   * Feature: search-campaigns, Property 25: Campaign Parser JSON Processing
   * **Validates: Requirements 9.1**
   */
  it('should successfully parse any valid campaign JSON into a typed Campaign object', () => {
    const visibilityArb = fc.constantFrom(...Object.values(CampaignVisibility));

    // Arbitrary that generates valid raw campaign JSON objects
    // (simulating what the backend API would return)
    const rawCampaignArb = fc
      .record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        ownerId: fc.uuid(),
        ownerName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        ownerTier: fc.constantFrom('FREE', 'PREMIUM', 'ENTERPRISE'),
        maxPlayers: fc.integer({ min: 1, max: 20 }),
        currentPlayersOffset: fc.integer({ min: 0, max: 20 }),
        joinPrice: fc
          .double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
          .map((n) => Math.round(n * 100) / 100),
        visibility: visibilityArb,
        createdAt: fc
          .date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
          .filter((d) => !isNaN(d.getTime()))
          .map((d) => d.toISOString()),
        updatedAt: fc
          .date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
          .filter((d) => !isNaN(d.getTime()))
          .map((d) => d.toISOString()),
      })
      .map((raw) => ({
        id: raw.id,
        name: raw.name,
        description: raw.description,
        owner: {
          id: raw.ownerId,
          name: raw.ownerName,
          subscriptionTier: raw.ownerTier,
        },
        maxPlayers: raw.maxPlayers,
        currentPlayers: Math.min(raw.currentPlayersOffset, raw.maxPlayers),
        joinPrice: raw.joinPrice,
        visibility: raw.visibility,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      }));

    let passed = true;
    fc.assert(
      fc.property(rawCampaignArb, (rawJson) => {
        const result = CampaignParser.parse(rawJson);

        // The parser must succeed for every valid raw JSON object
        if (!result.success) {
          passed = false;
          return false;
        }

        const campaign = result.campaign;

        // Assert correct TypeScript types for all fields
        const typesOk =
          typeof campaign.id === 'string' &&
          typeof campaign.name === 'string' &&
          typeof campaign.description === 'string' &&
          typeof campaign.owner === 'object' &&
          campaign.owner !== null &&
          typeof campaign.owner.id === 'string' &&
          typeof campaign.owner.name === 'string' &&
          typeof campaign.owner.subscriptionTier === 'string' &&
          typeof campaign.maxPlayers === 'number' &&
          typeof campaign.currentPlayers === 'number' &&
          typeof campaign.joinPrice === 'number' &&
          Object.values(CampaignVisibility).includes(campaign.visibility) &&
          campaign.createdAt instanceof Date &&
          !isNaN(campaign.createdAt.getTime()) &&
          campaign.updatedAt instanceof Date &&
          !isNaN(campaign.updatedAt.getTime());

        if (!typesOk) {
          passed = false;
          return false;
        }

        // Assert field values match the raw input
        const valuesOk =
          campaign.id === rawJson['id'] &&
          campaign.name === rawJson['name'] &&
          campaign.description === rawJson['description'] &&
          campaign.maxPlayers === rawJson['maxPlayers'] &&
          campaign.currentPlayers === rawJson['currentPlayers'] &&
          campaign.joinPrice === rawJson['joinPrice'] &&
          campaign.visibility === rawJson['visibility'];

        if (!valuesOk) passed = false;
        return valuesOk;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

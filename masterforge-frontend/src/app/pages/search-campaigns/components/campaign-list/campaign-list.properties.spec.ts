/**
 * Property-based tests for campaign display logic.
 *
 * Tests the pure helper methods of CampaignListComponent and CampaignFormatter
 * that determine how campaigns are displayed and whether they can be joined.
 * These properties validate universal correctness across all possible inputs.
 *
 * Feature: search-campaigns
 * Testing framework: fast-check (property-based) + Jasmine
 */

import * as fc from 'fast-check';
import { Campaign, CampaignOwner, CampaignVisibility } from '../../models/campaign.models';
import { CampaignFormatter } from '../../models/campaign.formatter';
import { CampaignListComponent } from './campaign-list.component';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const ownerArb: fc.Arbitrary<CampaignOwner> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  subscriptionTier: fc.constantFrom('FREE', 'PREMIUM'),
});

/**
 * Generates a valid Campaign with currentPlayers in [0, maxPlayers].
 */
const campaignArb: fc.Arbitrary<Campaign> = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    owner: ownerArb,
    maxPlayers: fc.integer({ min: 1, max: 20 }),
    joinPrice: fc
      .double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
      .map((n) => Math.round(n * 100) / 100),
    visibility: fc.constantFrom(...Object.values(CampaignVisibility)),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  })
  .chain((raw) =>
    fc.integer({ min: 0, max: raw.maxPlayers }).map((currentPlayers) => ({
      ...raw,
      currentPlayers,
    })),
  );

/**
 * Generates a campaign where currentPlayers === maxPlayers (full campaign).
 */
const fullCampaignArb: fc.Arbitrary<Campaign> = campaignArb.map((c) => ({
  ...c,
  currentPlayers: c.maxPlayers,
}));

/**
 * Generates a campaign where currentPlayers < maxPlayers (available campaign).
 */
const availableCampaignArb: fc.Arbitrary<Campaign> = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    owner: ownerArb,
    maxPlayers: fc.integer({ min: 2, max: 20 }),
    joinPrice: fc
      .double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
      .map((n) => Math.round(n * 100) / 100),
    visibility: fc.constantFrom(...Object.values(CampaignVisibility)),
    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  })
  .chain((raw) =>
    fc.integer({ min: 0, max: raw.maxPlayers - 1 }).map((currentPlayers) => ({
      ...raw,
      currentPlayers,
    })),
  );

// ---------------------------------------------------------------------------
// Property 2: Campaign Display Field Completeness
// **Validates: Requirements 1.3**
// ---------------------------------------------------------------------------

describe('Property 2: Campaign Display Field Completeness (Requirement 1.3)', () => {
  /**
   * Property 2: Campaign Display Field Completeness
   * For any valid Campaign object, all required display fields must be present
   * and properly formatted.
   *
   * Feature: search-campaigns, Property 2: Campaign Display Field Completeness
   * **Validates: Requirements 1.3**
   */

  it('campaign name should always be a non-empty string', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok =
          typeof campaign.name === 'string' && campaign.name.trim().length > 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('campaign description should always be a non-empty string', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok =
          typeof campaign.description === 'string' && campaign.description.trim().length > 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('campaign owner name should always be a non-empty string', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok =
          typeof campaign.owner.name === 'string' && campaign.owner.name.trim().length > 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('formatPlayerCount should return a string matching "X/Y players" pattern', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const result = CampaignFormatter.formatPlayerCount(
          campaign.currentPlayers,
          campaign.maxPlayers,
        );
        const pattern = /^\d+\/\d+ players$/;
        const ok = typeof result === 'string' && pattern.test(result);
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('formatPrice should return "Free" for price 0, or a string containing the price value for price > 0', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const result = CampaignFormatter.formatPrice(campaign.joinPrice);
        let ok: boolean;
        if (campaign.joinPrice === 0) {
          ok = result === 'Free';
        } else {
          ok = typeof result === 'string' && result.includes(campaign.joinPrice.toFixed(2));
        }
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('maxPlayers should always be a positive integer', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok =
          Number.isInteger(campaign.maxPlayers) && campaign.maxPlayers > 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('currentPlayers should always be a non-negative integer', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok =
          Number.isInteger(campaign.currentPlayers) && campaign.currentPlayers >= 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Property 3: Campaign Full Status Logic
// **Validates: Requirements 1.4**
// ---------------------------------------------------------------------------

describe('Property 3: Campaign Full Status Logic (Requirement 1.4)', () => {
  /**
   * Property 3: Campaign Full Status Logic
   * For any campaign, the full/joinable status must be consistent and correct
   * based on currentPlayers vs maxPlayers.
   *
   * Feature: search-campaigns, Property 3: Campaign Full Status Logic
   * **Validates: Requirements 1.4**
   */

  it('isFull should return true and isJoinable should return false when currentPlayers >= maxPlayers', () => {
    const component = new CampaignListComponent();
    let passed = true;
    fc.assert(
      fc.property(fullCampaignArb, (campaign) => {
        const ok = component.isFull(campaign) === true && component.isJoinable(campaign) === false;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('isFull should return false and isJoinable should return true when currentPlayers < maxPlayers', () => {
    const component = new CampaignListComponent();
    let passed = true;
    fc.assert(
      fc.property(availableCampaignArb, (campaign) => {
        const ok =
          component.isFull(campaign) === false && component.isJoinable(campaign) === true;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('isFull and isJoinable should always be logical complements for any campaign', () => {
    const component = new CampaignListComponent();
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok = component.isFull(campaign) === !component.isJoinable(campaign);
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('CampaignFormatter.isFull should agree with component isFull for all campaigns', () => {
    const component = new CampaignListComponent();
    let passed = true;
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const ok = CampaignFormatter.isFull(campaign) === component.isFull(campaign);
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('formatAvailability should return "Full" when currentPlayers >= maxPlayers', () => {
    let passed = true;
    fc.assert(
      fc.property(fullCampaignArb, (campaign) => {
        const result = CampaignFormatter.formatAvailability(campaign);
        const ok = result === 'Full';
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('formatAvailability should return a string containing "slot" when currentPlayers < maxPlayers', () => {
    let passed = true;
    fc.assert(
      fc.property(availableCampaignArb, (campaign) => {
        const result = CampaignFormatter.formatAvailability(campaign);
        const ok = typeof result === 'string' && result.includes('slot');
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

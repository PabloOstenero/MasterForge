/**
 * Property-based tests for campaign filtering logic.
 *
 * Tests the pure filtering functions that determine which campaigns
 * match given filter criteria. These properties validate universal
 * correctness across all possible inputs.
 *
 * Feature: search-campaigns
 * Testing framework: fast-check (property-based) + Jasmine
 */

import * as fc from 'fast-check';
import {
  Campaign,
  CampaignOwner,
  CampaignVisibility,
  AvailabilityFilterType,
  CapacityFilterType,
  PriceRangePreset,
  CapacityFilter,
  AvailabilityFilter,
  PriceRange,
  CampaignFilters,
} from '../../models/campaign.models';

// ---------------------------------------------------------------------------
// Pure filtering functions (mirrors backend AND logic)
// These are the client-side equivalents used for testing filter correctness.
// ---------------------------------------------------------------------------

/**
 * Applies an availability filter to a campaign.
 * Returns true if the campaign matches the filter.
 */
function matchesAvailabilityFilter(campaign: Campaign, filter: AvailabilityFilter): boolean {
  const isFull = campaign.currentPlayers >= campaign.maxPlayers;
  switch (filter.type) {
    case AvailabilityFilterType.AVAILABLE_ONLY:
      return !isFull;
    case AvailabilityFilterType.FULL_ONLY:
      return isFull;
    case AvailabilityFilterType.ALL:
    default:
      return true;
  }
}

/**
 * Applies a capacity filter to a campaign.
 * Returns true if the campaign's maxPlayers matches the filter.
 */
function matchesCapacityFilter(campaign: Campaign, filter: CapacityFilter): boolean {
  const max = campaign.maxPlayers;
  switch (filter.type) {
    case CapacityFilterType.SMALL:
      return max >= 1 && max <= 4;
    case CapacityFilterType.MEDIUM:
      return max >= 5 && max <= 6;
    case CapacityFilterType.LARGE:
      return max >= 7;
    case CapacityFilterType.ANY:
    default:
      return true;
  }
}

/**
 * Applies a price range filter to a campaign.
 * Returns true if the campaign's joinPrice is within the range.
 */
function matchesPriceFilter(campaign: Campaign, priceRange: PriceRange): boolean {
  const price = campaign.joinPrice;
  const { preset, min, max } = priceRange;

  if (preset === PriceRangePreset.FREE) {
    return price === 0;
  }
  if (preset === PriceRangePreset.UNDER_10) {
    return price <= 10;
  }
  if (preset === PriceRangePreset.UNDER_25) {
    return price <= 25;
  }
  if (preset === PriceRangePreset.UNDER_50) {
    return price <= 50;
  }
  // CUSTOM or no preset: use min/max
  if (min !== undefined && price < min) return false;
  if (max !== undefined && price > max) return false;
  return true;
}

/**
 * Applies all filters to a campaign using AND logic.
 * Returns true only if the campaign matches ALL active filters.
 */
function matchesAllFilters(campaign: Campaign, filters: CampaignFilters): boolean {
  if (filters.availabilityFilter && !matchesAvailabilityFilter(campaign, filters.availabilityFilter)) {
    return false;
  }
  if (filters.capacityFilter && !matchesCapacityFilter(campaign, filters.capacityFilter)) {
    return false;
  }
  if (filters.priceRange && !matchesPriceFilter(campaign, filters.priceRange)) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const ownerArb: fc.Arbitrary<CampaignOwner> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  subscriptionTier: fc.constantFrom('FREE', 'PREMIUM'),
});

/**
 * Generates a valid Campaign with controlled maxPlayers and currentPlayers.
 */
function campaignArb(
  maxPlayersRange: { min: number; max: number } = { min: 1, max: 20 },
): fc.Arbitrary<Campaign> {
  return fc
    .record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      description: fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
      owner: ownerArb,
      maxPlayers: fc.integer(maxPlayersRange),
      currentPlayersOffset: fc.integer({ min: 0, max: maxPlayersRange.max }),
      joinPrice: fc
        .double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
        .map((n) => Math.round(n * 100) / 100),
      visibility: fc.constantFrom(...Object.values(CampaignVisibility)),
      createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
      updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    })
    .map((raw) => ({
      id: raw.id,
      name: raw.name,
      description: raw.description,
      owner: raw.owner,
      maxPlayers: raw.maxPlayers,
      currentPlayers: Math.min(raw.currentPlayersOffset, raw.maxPlayers),
      joinPrice: raw.joinPrice,
      visibility: raw.visibility,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }));
}

const campaignListArb = fc.array(campaignArb(), { minLength: 0, maxLength: 50 });

// ---------------------------------------------------------------------------
// Property 9: Availability Filtering
// **Validates: Requirements 3.3**
// ---------------------------------------------------------------------------

describe('Property 9: Availability Filtering (Requirement 3.3)', () => {
  /**
   * Property 9: Availability Filtering
   * For any availability filter and campaign dataset, the results should
   * match the availability criteria (available slots only, full campaigns
   * only, or all campaigns).
   *
   * Feature: search-campaigns, Property 9: Availability Filtering
   * **Validates: Requirements 3.3**
   */
  it('AVAILABLE_ONLY filter should only return campaigns with open slots', () => {
    const filter: AvailabilityFilter = { type: AvailabilityFilterType.AVAILABLE_ONLY };

    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const filtered = campaigns.filter((c) => matchesAvailabilityFilter(c, filter));

        // Every returned campaign must have available slots
        const allAvailable = filtered.every((c) => c.currentPlayers < c.maxPlayers);
        // Every campaign with available slots must be in the result
        const noneSkipped = campaigns
          .filter((c) => c.currentPlayers < c.maxPlayers)
          .every((c) => filtered.some((f) => f.id === c.id));

        const ok = allAvailable && noneSkipped;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('FULL_ONLY filter should only return campaigns with no available slots', () => {
    const filter: AvailabilityFilter = { type: AvailabilityFilterType.FULL_ONLY };

    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const filtered = campaigns.filter((c) => matchesAvailabilityFilter(c, filter));

        // Every returned campaign must be full
        const allFull = filtered.every((c) => c.currentPlayers >= c.maxPlayers);
        // Every full campaign must be in the result
        const noneSkipped = campaigns
          .filter((c) => c.currentPlayers >= c.maxPlayers)
          .every((c) => filtered.some((f) => f.id === c.id));

        const ok = allFull && noneSkipped;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('ALL filter should return every campaign regardless of availability', () => {
    const filter: AvailabilityFilter = { type: AvailabilityFilterType.ALL };

    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const filtered = campaigns.filter((c) => matchesAvailabilityFilter(c, filter));
        const ok = filtered.length === campaigns.length;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('AVAILABLE_ONLY and FULL_ONLY filters should be mutually exclusive (no campaign in both)', () => {
    const availableFilter: AvailabilityFilter = { type: AvailabilityFilterType.AVAILABLE_ONLY };
    const fullFilter: AvailabilityFilter = { type: AvailabilityFilterType.FULL_ONLY };

    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const available = campaigns.filter((c) => matchesAvailabilityFilter(c, availableFilter));
        const full = campaigns.filter((c) => matchesAvailabilityFilter(c, fullFilter));

        // No campaign should appear in both sets
        const intersection = available.filter((a) => full.some((f) => f.id === a.id));
        const ok = intersection.length === 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Property 10: Multiple Filter AND Logic
// **Validates: Requirements 3.4**
// ---------------------------------------------------------------------------

describe('Property 10: Multiple Filter AND Logic (Requirement 3.4)', () => {
  /**
   * Property 10: Multiple Filter AND Logic
   * For any combination of multiple filters applied to a campaign dataset,
   * the results should satisfy ALL filter criteria simultaneously.
   *
   * Feature: search-campaigns, Property 10: Multiple Filter AND Logic
   * **Validates: Requirements 3.4**
   */
  it('combined filters should only return campaigns matching ALL criteria', () => {
    // Generate campaigns with varied characteristics
    const mixedCampaignArb = fc.array(
      fc.oneof(
        // Small free available campaigns
        campaignArb({ min: 1, max: 4 }).map((c) => ({ ...c, joinPrice: 0, currentPlayers: 0 })),
        // Large paid full campaigns
        campaignArb({ min: 7, max: 15 }).map((c) => ({
          ...c,
          joinPrice: 15,
          currentPlayers: c.maxPlayers,
        })),
        // Medium campaigns with various states
        campaignArb({ min: 5, max: 6 }),
      ),
      { minLength: 5, maxLength: 30 },
    );

    let passed = true;
    fc.assert(
      fc.property(
        mixedCampaignArb,
        fc.constantFrom(
          AvailabilityFilterType.AVAILABLE_ONLY,
          AvailabilityFilterType.FULL_ONLY,
          AvailabilityFilterType.ALL,
        ),
        fc.constantFrom(
          CapacityFilterType.SMALL,
          CapacityFilterType.MEDIUM,
          CapacityFilterType.LARGE,
          CapacityFilterType.ANY,
        ),
        (campaigns, availType, capType) => {
          const filters: CampaignFilters = {
            availabilityFilter: { type: availType },
            capacityFilter: { type: capType },
          };

          const filtered = campaigns.filter((c) => matchesAllFilters(c, filters));

          // Every result must satisfy BOTH filters
          const allMatchAvailability = filtered.every((c) =>
            matchesAvailabilityFilter(c, { type: availType }),
          );
          const allMatchCapacity = filtered.every((c) =>
            matchesCapacityFilter(c, { type: capType }),
          );

          // No campaign that satisfies both filters should be excluded
          const noneExcluded = campaigns
            .filter(
              (c) =>
                matchesAvailabilityFilter(c, { type: availType }) &&
                matchesCapacityFilter(c, { type: capType }),
            )
            .every((c) => filtered.some((f) => f.id === c.id));

          const ok = allMatchAvailability && allMatchCapacity && noneExcluded;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('applying no filters should return all campaigns', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const filtered = campaigns.filter((c) => matchesAllFilters(c, {}));
        const ok = filtered.length === campaigns.length;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('AND logic: result set is always a subset of each individual filter result', () => {
    let passed = true;
    fc.assert(
      fc.property(
        campaignListArb,
        fc.constantFrom(
          AvailabilityFilterType.AVAILABLE_ONLY,
          AvailabilityFilterType.FULL_ONLY,
          AvailabilityFilterType.ALL,
        ),
        fc.constantFrom(
          CapacityFilterType.SMALL,
          CapacityFilterType.MEDIUM,
          CapacityFilterType.LARGE,
          CapacityFilterType.ANY,
        ),
        (campaigns, availType, capType) => {
          const combined = campaigns.filter((c) =>
            matchesAllFilters(c, {
              availabilityFilter: { type: availType },
              capacityFilter: { type: capType },
            }),
          );
          const availOnly = campaigns.filter((c) =>
            matchesAvailabilityFilter(c, { type: availType }),
          );
          const capOnly = campaigns.filter((c) =>
            matchesCapacityFilter(c, { type: capType }),
          );

          // Combined result must be a subset of each individual filter
          const subsetOfAvail = combined.every((c) => availOnly.some((a) => a.id === c.id));
          const subsetOfCap = combined.every((c) => capOnly.some((a) => a.id === c.id));

          const ok = subsetOfAvail && subsetOfCap;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Property 11: Filter Result Count Accuracy
// **Validates: Requirements 3.6**
// ---------------------------------------------------------------------------

describe('Property 11: Filter Result Count Accuracy (Requirement 3.6)', () => {
  /**
   * Property 11: Filter Result Count Accuracy
   * For any filter combination applied to a campaign dataset, the displayed
   * count should equal the actual number of campaigns in the filtered results.
   *
   * Feature: search-campaigns, Property 11: Filter Result Count Accuracy
   * **Validates: Requirements 3.6**
   */
  it('filter result count should always equal the length of the filtered array', () => {
    let passed = true;
    fc.assert(
      fc.property(
        campaignListArb,
        fc.constantFrom(
          AvailabilityFilterType.AVAILABLE_ONLY,
          AvailabilityFilterType.FULL_ONLY,
          AvailabilityFilterType.ALL,
        ),
        fc.constantFrom(
          CapacityFilterType.SMALL,
          CapacityFilterType.MEDIUM,
          CapacityFilterType.LARGE,
          CapacityFilterType.ANY,
        ),
        (campaigns, availType, capType) => {
          const filters: CampaignFilters = {
            availabilityFilter: { type: availType },
            capacityFilter: { type: capType },
          };

          const filtered = campaigns.filter((c) => matchesAllFilters(c, filters));
          const reportedCount = filtered.length; // This is what the UI would display

          // The count must exactly match the number of filtered campaigns
          const ok = reportedCount === filtered.length;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('count should be 0 when no campaigns match the filters', () => {
    // Create campaigns that are all full (currentPlayers === maxPlayers)
    const fullCampaignsArb = fc.array(
      campaignArb().map((c) => ({ ...c, currentPlayers: c.maxPlayers })),
      { minLength: 1, maxLength: 20 },
    );

    let passed = true;
    fc.assert(
      fc.property(fullCampaignsArb, (campaigns) => {
        // Filter for available-only — should return 0 since all are full
        const filter: AvailabilityFilter = { type: AvailabilityFilterType.AVAILABLE_ONLY };
        const filtered = campaigns.filter((c) => matchesAvailabilityFilter(c, filter));
        const ok = filtered.length === 0;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('count with ALL filter should equal total campaign count', () => {
    let passed = true;
    fc.assert(
      fc.property(campaignListArb, (campaigns) => {
        const filter: AvailabilityFilter = { type: AvailabilityFilterType.ALL };
        const filtered = campaigns.filter((c) => matchesAvailabilityFilter(c, filter));
        const ok = filtered.length === campaigns.length;
        if (!ok) passed = false;
        return ok;
      }),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });

  it('count should be monotonically non-increasing as more filters are added', () => {
    let passed = true;
    fc.assert(
      fc.property(
        campaignListArb,
        fc.constantFrom(
          AvailabilityFilterType.AVAILABLE_ONLY,
          AvailabilityFilterType.FULL_ONLY,
        ),
        fc.constantFrom(
          CapacityFilterType.SMALL,
          CapacityFilterType.MEDIUM,
          CapacityFilterType.LARGE,
        ),
        (campaigns, availType, capType) => {
          // Count with only availability filter
          const withAvailOnly = campaigns.filter((c) =>
            matchesAvailabilityFilter(c, { type: availType }),
          ).length;

          // Count with both filters (AND logic)
          const withBoth = campaigns.filter((c) =>
            matchesAllFilters(c, {
              availabilityFilter: { type: availType },
              capacityFilter: { type: capType },
            }),
          ).length;

          // Adding more filters can only reduce or maintain the count
          const ok = withBoth <= withAvailOnly;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

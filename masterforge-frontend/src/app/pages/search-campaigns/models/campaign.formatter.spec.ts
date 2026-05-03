/**
 * Unit tests for CampaignFormatter.
 * Covers formatPrice(), formatPlayerCount(), isFull(),
 * formatAvailability(), and formatDate() methods.
 *
 * Validates: Requirements 9.2, 9.3, 1.4
 */

import * as fc from 'fast-check';
import { Campaign, CampaignVisibility } from './campaign.models';
import { CampaignFormatter } from './campaign.formatter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCampaign(currentPlayers: number, maxPlayers: number): Campaign {
  return {
    id: 'c1',
    name: 'Test',
    description: 'Desc',
    owner: { id: 'o1', name: 'DM', subscriptionTier: 'FREE' },
    maxPlayers,
    currentPlayers,
    joinPrice: 0,
    visibility: CampaignVisibility.PUBLIC,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };
}

// ---------------------------------------------------------------------------
// formatPrice()
// ---------------------------------------------------------------------------

describe('CampaignFormatter.formatPrice()', () => {
  it('should return "Free" for 0', () => {
    expect(CampaignFormatter.formatPrice(0)).toBe('Free');
  });

  it('should format a whole-dollar price with two decimal places', () => {
    expect(CampaignFormatter.formatPrice(10)).toBe('$10.00');
  });

  it('should format a fractional price with two decimal places', () => {
    expect(CampaignFormatter.formatPrice(9.99)).toBe('$9.99');
  });

  it('should format a price with one decimal digit correctly', () => {
    expect(CampaignFormatter.formatPrice(5.5)).toBe('$5.50');
  });

  it('should format a large price correctly', () => {
    expect(CampaignFormatter.formatPrice(100)).toBe('$100.00');
  });

  /**
   * Property: any positive price should start with "$" and contain "."
   * **Validates: Requirements 9.2**
   */
  it('positive prices should always start with "$" and contain a decimal point', () => {
    let passed = true;
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 9999, noNaN: true, noDefaultInfinity: true }),
        (price) => {
          const formatted = CampaignFormatter.formatPrice(price);
          const ok = formatted.startsWith('$') && formatted.includes('.');
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
// formatPlayerCount()
// ---------------------------------------------------------------------------

describe('CampaignFormatter.formatPlayerCount()', () => {
  it('should format as "X/Y players"', () => {
    expect(CampaignFormatter.formatPlayerCount(3, 5)).toBe('3/5 players');
  });

  it('should format when current equals max', () => {
    expect(CampaignFormatter.formatPlayerCount(5, 5)).toBe('5/5 players');
  });

  it('should format when current is 0', () => {
    expect(CampaignFormatter.formatPlayerCount(0, 6)).toBe('0/6 players');
  });

  /**
   * Property: output always matches "X/Y players" pattern.
   * **Validates: Requirements 9.3**
   */
  it('should always produce "X/Y players" format', () => {
    let passed = true;
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (max, offset) => {
          const current = Math.min(offset, max);
          const result = CampaignFormatter.formatPlayerCount(current, max);
          const ok = result === `${current}/${max} players`;
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
// isFull()
// ---------------------------------------------------------------------------

describe('CampaignFormatter.isFull()', () => {
  it('should return true when currentPlayers equals maxPlayers', () => {
    expect(CampaignFormatter.isFull(makeCampaign(5, 5))).toBeTrue();
  });

  it('should return true when currentPlayers exceeds maxPlayers', () => {
    // Edge case: data inconsistency — still considered full
    expect(CampaignFormatter.isFull(makeCampaign(6, 5))).toBeTrue();
  });

  it('should return false when there are available slots', () => {
    expect(CampaignFormatter.isFull(makeCampaign(4, 5))).toBeFalse();
  });

  it('should return false when currentPlayers is 0', () => {
    expect(CampaignFormatter.isFull(makeCampaign(0, 5))).toBeFalse();
  });

  /**
   * Property 3: Campaign Full Status Logic
   * For any campaign, when currentPlayers >= maxPlayers, isFull() returns true.
   * **Validates: Requirements 1.4**
   */
  it('should return true iff currentPlayers >= maxPlayers', () => {
    let passed = true;
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 25 }),
        (max, current) => {
          const campaign = makeCampaign(current, max);
          const full = CampaignFormatter.isFull(campaign);
          const ok = full === (current >= max);
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
// formatAvailability()
// ---------------------------------------------------------------------------

describe('CampaignFormatter.formatAvailability()', () => {
  it('should return "Full" when campaign is full', () => {
    expect(CampaignFormatter.formatAvailability(makeCampaign(5, 5))).toBe('Full');
  });

  it('should return "1 slot available" for a single open slot', () => {
    expect(CampaignFormatter.formatAvailability(makeCampaign(4, 5))).toBe('1 slot available');
  });

  it('should return "2 slots available" for two open slots (plural)', () => {
    expect(CampaignFormatter.formatAvailability(makeCampaign(3, 5))).toBe('2 slots available');
  });

  it('should return "5 slots available" when campaign is empty', () => {
    expect(CampaignFormatter.formatAvailability(makeCampaign(0, 5))).toBe('5 slots available');
  });

  it('should use singular "slot" for exactly 1 available slot', () => {
    const result = CampaignFormatter.formatAvailability(makeCampaign(4, 5));
    expect(result).not.toContain('slots');
    expect(result).toContain('slot');
  });
});

// ---------------------------------------------------------------------------
// formatDate()
// ---------------------------------------------------------------------------

describe('CampaignFormatter.formatDate()', () => {
  it('should format a known date as "Jan 5, 2025"', () => {
    const date = new Date('2025-01-05T12:00:00.000Z');
    // Use the same locale logic as the formatter to avoid timezone issues in CI
    const expected = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expect(CampaignFormatter.formatDate(date)).toBe(expected);
  });

  it('should return a non-empty string for any valid date', () => {
    let passed = true;
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
        (date) => {
          const result = CampaignFormatter.formatDate(date);
          const ok = typeof result === 'string' && result.length > 0;
          if (!ok) passed = false;
          return ok;
        },
      ),
      { numRuns: 100 },
    );
    expect(passed).toBeTrue();
  });
});

/**
 * CampaignFormatter — utility class for formatting Campaign data
 * into human-readable strings for display in the UI.
 *
 * Validates: Requirements 9.2, 9.3, 1.4
 */

import { Campaign } from './campaign.models';

export class CampaignFormatter {
  /**
   * Formats a join price as a currency string.
   *
   * - 0       → "Free"
   * - positive → "$X.XX" (USD, 2 decimal places)
   *
   * Validates: Requirement 9.2
   */
  static formatPrice(joinPrice: number): string {
    if (joinPrice === 0) {
      return 'Free';
    }
    return `${joinPrice.toFixed(2)}€`;
  }

  /**
   * Formats player counts as "X/Y players".
   *
   * Validates: Requirement 9.3
   */
  static formatPlayerCount(currentPlayers: number, maxPlayers: number): string {
    return `${currentPlayers}/${maxPlayers} players`;
  }

  /**
   * Returns true if the campaign has no available slots
   * (i.e. currentPlayers >= maxPlayers).
   *
   * Validates: Requirement 1.4
   */
  static isFull(campaign: Campaign): boolean {
    return campaign.currentPlayers >= campaign.maxPlayers;
  }

  /**
   * Returns a human-readable availability label:
   * - "Full" when no slots remain
   * - "X slots available" when slots are open
   */
  static formatAvailability(campaign: Campaign): string {
    if (CampaignFormatter.isFull(campaign)) {
      return 'Full';
    }
    const available = campaign.maxPlayers - campaign.currentPlayers;
    return `${available} slot${available === 1 ? '' : 's'} available`;
  }

  /**
   * Formats a Date to a locale-friendly display string (e.g. "Jan 5, 2025").
   * Uses the 'en-US' locale for consistent output across environments.
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

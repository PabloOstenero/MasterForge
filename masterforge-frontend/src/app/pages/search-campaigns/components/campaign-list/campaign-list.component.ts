/**
 * CampaignListComponent — displays a paginated list of campaign cards.
 *
 * Provides:
 * - Campaign card display with all required fields (name, description, owner,
 *   current/max players, join price)
 * - "Full" status marking for campaigns with no available slots
 * - Join button with proper state management (disabled when full)
 * - Infinite scroll / load-more pagination support
 * - Search result highlighting via SearchHighlightPipe (Req 2.5)
 * - Optional scrollable container with CSS containment for performance (Req 8.1, 8.3, 8.4)
 * - Scroll-based load-more trigger when scrollable mode is enabled
 *
 * Validates: Requirements 1.3, 1.4, 2.5, 2.6, 8.1, 8.3, 8.4
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  cashOutline,
  personOutline,
  lockClosedOutline,
  addCircleOutline,
  chevronDownOutline,
} from 'ionicons/icons';

import { Campaign } from '../../models/campaign.models';
import { CampaignFormatter } from '../../models/campaign.formatter';
import { SearchHighlightPipe } from '../../pipes/search-highlight.pipe';

@Component({
  selector: 'app-campaign-list',
  templateUrl: './campaign-list.component.html',
  styleUrls: ['./campaign-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonSpinner, IonButton, IonIcon, SearchHighlightPipe],
})
export class CampaignListComponent {
  /** The list of campaigns to display. */
  @Input() campaigns: Campaign[] = [];

  /** Whether more campaigns are being loaded (shows spinner at bottom). */
  @Input() loading = false;

  /**
   * The current search text used to highlight matching terms in results.
   * Req 2.5: Highlight matching text in search results.
   */
  @Input() searchText = '';

  /**
   * When true, the list renders inside a fixed-height scrollable container
   * with CSS containment for improved rendering performance.
   * Req 8.1, 8.3, 8.4: Virtual scrolling via CSS containment.
   */
  @Input() scrollable = false;

  /** Emits the campaign ID when the user clicks the join button. */
  @Output() joinCampaign = new EventEmitter<string>();

  /** Emits when the user requests more campaigns (load more / infinite scroll). */
  @Output() loadMore = new EventEmitter<void>();

  constructor() {
    addIcons({
      peopleOutline,
      cashOutline,
      personOutline,
      lockClosedOutline,
      addCircleOutline,
      chevronDownOutline,
    });
  }

  // ── Scroll-based load-more ─────────────────────────────────────────────────

  /**
   * Listens for scroll events on the host element.
   * When scrollable mode is enabled and the user scrolls within 200px of the
   * bottom, emits loadMore to trigger pagination.
   * Req 8.4: Pagination support for large campaign catalogs.
   */
  @HostListener('scroll', ['$event.target'])
  onScroll(target: HTMLElement): void {
    if (!this.scrollable) return;
    const threshold = 200;
    const position = target.scrollTop + target.clientHeight;
    const height = target.scrollHeight;
    if (position >= height - threshold) {
      this.loadMore.emit();
    }
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  /**
   * TrackBy function for ngFor to avoid unnecessary DOM re-renders.
   */
  trackByCampaignId(_index: number, campaign: Campaign): string {
    return campaign.id;
  }

  /**
   * Req 1.4: Returns true if the campaign has available slots (can be joined).
   * When currentPlayers >= maxPlayers, the campaign is full.
   */
  isJoinable(campaign: Campaign): boolean {
    return campaign.currentPlayers < campaign.maxPlayers;
  }

  /**
   * Req 1.4: Returns true when the campaign has no available slots.
   */
  isFull(campaign: Campaign): boolean {
    return campaign.currentPlayers >= campaign.maxPlayers;
  }

  /**
   * Req 1.3: Formats the player count as "X/Y players".
   */
  formatPlayerCount(campaign: Campaign): string {
    return CampaignFormatter.formatPlayerCount(campaign.currentPlayers, campaign.maxPlayers);
  }

  /**
   * Req 1.3: Formats the join price as currency string.
   */
  formatPrice(campaign: Campaign): string {
    return CampaignFormatter.formatPrice(campaign.joinPrice);
  }

  /**
   * Handles the join button click.
   */
  onJoinClick(campaign: Campaign): void {
    if (!this.isJoinable(campaign)) return;
    this.joinCampaign.emit(campaign.id);
  }

  /**
   * Handles the load more button click.
   */
  onLoadMoreClick(): void {
    this.loadMore.emit();
  }
}

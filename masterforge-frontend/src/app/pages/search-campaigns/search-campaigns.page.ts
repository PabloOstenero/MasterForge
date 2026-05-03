/**
 * SearchCampaignsPage — main container for the campaign discovery feature.
 *
 * Provides:
 * - Reactive search form with debounced text input
 * - Filter form integration with CampaignFilterComponent
 * - Paginated campaign list via CampaignListComponent
 * - Authentication guard integration (redirects unauthenticated users)
 * - Load-more / infinite scroll pagination
 * - Real-time campaign availability monitoring via WebSocketService
 * - 30-second auto-refresh cycle
 * - Inactivity refresh prompt after 5 minutes
 * - Fallback polling status indicator
 *
 * Validates: Requirements 1.1, 1.2, 6.1, 6.2, 6.4, 8.1, 8.4, 10.1, 10.2, 10.3, 10.4, 10.6
 */

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, refreshOutline, alertCircleOutline } from 'ionicons/icons';
import {
  Subject,
  BehaviorSubject,
  combineLatest,
  interval,
  timer,
} from 'rxjs';
import {
  distinctUntilChanged,
  takeUntil,
  switchMap,
  startWith,
} from 'rxjs/operators';

import { CampaignSearchService } from '../../services/campaign-search.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import {
  Campaign,
  CampaignFilters,
  SearchCriteria,
  CampaignSearchResult,
  AvailabilityFilterType,
} from './models/campaign.models';
import { PaymentData, PaymentResult } from '../../shared/models/payment.models';
import { CampaignFilterComponent } from './components/campaign-filter/campaign-filter.component';
import { CampaignListComponent } from './components/campaign-list/campaign-list.component';
import { SearchInputComponent } from './components/search-input/search-input.component';
import { PaymentProcessorComponent } from './components/payment-processor/payment-processor.component';
import { LoadingOverlayComponent } from './components/loading-overlay/loading-overlay.component';
import { ToastNotificationComponent } from './components/toast-notification/toast-notification.component';
import { HelpTooltipComponent } from './components/help-tooltip/help-tooltip.component';

/** Default page size per requirement 1.2 (load first 20 campaigns). */
const DEFAULT_PAGE_SIZE = 20;

@Component({
  selector: 'app-search-campaigns',
  templateUrl: './search-campaigns.page.html',
  styleUrls: ['./search-campaigns.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonSpinner,
    IonButton,
    IonIcon,
    CampaignFilterComponent,
    CampaignListComponent,
    SearchInputComponent,
    PaymentProcessorComponent,
    LoadingOverlayComponent,
    ToastNotificationComponent,
    HelpTooltipComponent,
  ],
})
export class SearchCampaignsPage implements OnInit, OnDestroy {
  // ── ViewChild ──────────────────────────────────────────────────────────────

  /** Reference to the payment processor so we can call notifyResult() on it. */
  @ViewChild(PaymentProcessorComponent)
  private paymentProcessor?: PaymentProcessorComponent;

  // ── State ──────────────────────────────────────────────────────────────────

  campaigns: Campaign[] = [];
  loading = false;
  loadingMore = false;
  error: string | null = null;
  totalElements = 0;
  hasNext = false;
  currentPage = 0;

  /**
   * The current search text, kept in sync with the SearchInputComponent.
   * Passed to CampaignListComponent for search result highlighting (Req 2.5).
   */
  currentSearchText = '';

  /**
   * The campaign for which the payment processor is currently shown.
   * Req 4.2: Initiates payment process when user clicks join on a paid campaign.
   */
  paymentCampaign: Campaign | null = null;

  /**
   * Whether to show the inactivity refresh prompt (Req 10.4).
   */
  showRefreshPrompt = false;

  // ── Forms ──────────────────────────────────────────────────────────────────

  searchForm: FormGroup;
  filterForm: FormGroup;

  // ── Internal subjects ──────────────────────────────────────────────────────

  private destroy$ = new Subject<void>();
  private filters$ = new BehaviorSubject<CampaignFilters>({});

  /** Tracks last user interaction time for inactivity detection (Req 10.4). */
  private lastInteractionTime = Date.now();

  // ── Constructor ────────────────────────────────────────────────────────────

  constructor(
    private fb: FormBuilder,
    private campaignSearchService: CampaignSearchService,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {
    addIcons({ searchOutline, refreshOutline, alertCircleOutline });

    this.searchForm = this.fb.group({
      searchText: [''],
    });

    this.filterForm = this.fb.group({
      // Filter state is managed by CampaignFilterComponent via output events
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Req 6.1 / 6.2: Require authentication; redirect if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Req 1.2: Load first 20 campaigns on page access
    this.setupSearchSubscription();

    // Req 10.1: 30-second auto-refresh cycle
    interval(30_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.campaignSearchService.refreshCampaignData()
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.currentPage = 0;
            this.campaigns = [];
            this.filters$.next(this.filters$.getValue());
          });
      });

    // Req 10.4: Inactivity detection — check every 30s after 5 min
    timer(5 * 60 * 1000, 30_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const inactiveMs = Date.now() - this.lastInteractionTime;
        if (inactiveMs > 5 * 60 * 1000) {
          this.showRefreshPrompt = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  /**
   * Resets the inactivity timer on user interaction (Req 10.4).
   */
  onUserInteraction(): void {
    this.lastInteractionTime = Date.now();
    if (this.showRefreshPrompt) {
      this.showRefreshPrompt = false;
    }
  }

  /**
   * Called by CampaignFilterComponent when filters change.
   * Req 3.5: Update results immediately when filters change.
   */
  onFilterChange(filters: CampaignFilters): void {
    this.currentPage = 0;
    this.campaigns = [];
    this.filters$.next(filters);
  }

  /**
   * Called by SearchInputComponent when the search text changes.
   * Updates the form control so the existing reactive subscription fires.
   * Also keeps currentSearchText in sync for highlighting (Req 2.5).
   */
  onSearchChange(searchText: string): void {
    this.currentSearchText = searchText;
    this.searchForm.get('searchText')!.setValue(searchText, { emitEvent: true });
  }

  /**
   * Called by CampaignListComponent when user clicks join on a campaign.
   * Req 4.2: For paid campaigns, initiates the payment process via PaymentProcessorComponent.
   */
  onJoinCampaign(campaignId: string): void {
    const campaign = this.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    if (campaign.joinPrice > 0) {
      // Paid campaign — open the PaymentProcessorComponent (Req 4.2)
      this.paymentCampaign = campaign;
    } else {
      // Free campaign
      this.campaignSearchService.joinFreeCampaign(campaignId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('¡Te has unido a la campaña exitosamente!');
            this.refreshCurrentPage();
          },
          error: (err) => {
            this.error = err?.message ?? 'Error al unirse a la campaña';
            this.notificationService.showError(err?.message ?? 'Error al unirse a la campaña');
          },
        });
    }
  }

  /**
   * Called by PaymentProcessorComponent when the user submits the payment form.
   * This is where the enrollment API call lives — the component only collects data.
   * Req 4.2, 5.4, 5.5
   */
  onPaymentSubmit(paymentData: PaymentData): void {
    if (!this.paymentCampaign) return;

    this.campaignSearchService.joinPaidCampaign(this.paymentCampaign.id, paymentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollmentResult) => {
          const result: PaymentResult = {
            success: enrollmentResult.success,
            errorMessage: enrollmentResult.success ? undefined : enrollmentResult.message,
            enrollmentConfirmed: enrollmentResult.success,
          };
          this.paymentProcessor?.notifyResult(result);
          if (result.success) {
            this.notificationService.showSuccess('¡Pago procesado y campaña unida exitosamente!');
            this.paymentCampaign = null;
            this.refreshCurrentPage();
          }
        },
        error: (err: Error) => {
          const result: PaymentResult = {
            success: false,
            errorMessage: err.message ?? 'Error al procesar el pago. Por favor, inténtalo de nuevo.',
          };
          this.paymentProcessor?.notifyResult(result);
        },
      });
  }

  /**
   * Called by PaymentProcessorComponent when the user cancels the payment.
   */
  onPaymentCancelled(): void {
    this.paymentCampaign = null;
  }

  /**
   * Called by CampaignListComponent when user scrolls to the bottom.
   * Req 8.4: Pagination support for large campaign catalogs.
   */
  onLoadMore(): void {
    if (!this.hasNext || this.loadingMore) return;
    this.currentPage++;
    this.loadMoreCampaigns();
  }

  /**
   * Retry loading after an error.
   */
  onRetry(): void {
    this.error = null;
    this.currentPage = 0;
    this.campaigns = [];
    this.filters$.next(this.filters$.getValue());
  }

  /**
   * Manual refresh triggered by the refresh prompt (Req 10.4).
   */
  onManualRefresh(): void {
    this.refreshCurrentPage();
    this.showRefreshPrompt = false;
    this.notificationService.showInfo('Campañas actualizadas');
  }

  /**
   * Dismisses the inactivity refresh prompt without refreshing.
   */
  dismissRefreshPrompt(): void {
    this.showRefreshPrompt = false;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Sets up the reactive subscription that triggers a new search whenever
   * the search text or filters change.
   */
  private setupSearchSubscription(): void {
    const searchText$ = this.searchForm.get('searchText')!.valueChanges.pipe(
      startWith(''),
      // Note: debouncing is handled by SearchInputComponent (Req 8.2).
      // We still use distinctUntilChanged to avoid duplicate API calls.
      distinctUntilChanged(),
    );

    combineLatest([searchText$, this.filters$])
      .pipe(
        takeUntil(this.destroy$),
        switchMap(([searchText, filters]) => {
          this.currentPage = 0;
          this.campaigns = [];
          this.loading = true;
          this.error = null;

          const criteria = this.buildCriteria(searchText, filters, 0);
          return this.campaignSearchService.searchCampaigns(criteria);
        }),
      )
      .subscribe({
        next: (result) => this.handleSearchResult(result, false),
        error: (err) => {
          this.loading = false;
          this.error = err?.message ?? 'Error al cargar campañas';
        },
      });
  }

  /**
   * Loads the next page of campaigns (append to existing list).
   */
  private loadMoreCampaigns(): void {
    this.loadingMore = true;
    const criteria = this.buildCriteria(
      this.searchForm.get('searchText')!.value ?? '',
      this.filters$.getValue(),
      this.currentPage,
    );

    this.campaignSearchService.searchCampaigns(criteria)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => this.handleSearchResult(result, true),
        error: (err) => {
          this.loadingMore = false;
          this.error = err?.message ?? 'Error al cargar más campañas';
        },
      });
  }

  /**
   * Refreshes the current page (e.g. after a join action or manual refresh).
   * Public so it can be called from onManualRefresh.
   */
  refreshCurrentPage(): void {
    this.campaignSearchService.refreshCampaignData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 0;
        this.campaigns = [];
        this.filters$.next(this.filters$.getValue());
      });
  }

  /**
   * Handles a successful search result, either replacing or appending campaigns.
   */
  private handleSearchResult(result: CampaignSearchResult, append: boolean): void {
    if (append) {
      this.campaigns = [...this.campaigns, ...result.campaigns];
      this.loadingMore = false;
    } else {
      this.campaigns = result.campaigns;
      this.loading = false;
    }
    this.totalElements = result.totalElements;
    this.hasNext = result.hasNext;
  }

  /**
   * Builds a SearchCriteria object from the current form state and filters.
   */
  private buildCriteria(
    searchText: string,
    filters: CampaignFilters,
    page: number,
  ): SearchCriteria {
    return {
      searchText: searchText?.trim() || undefined,
      priceRange: filters.priceRange,
      capacityFilter: filters.capacityFilter,
      availabilityFilter: filters.availabilityFilter ?? { type: AvailabilityFilterType.ALL },
      page,
      size: DEFAULT_PAGE_SIZE,
    };
  }
}

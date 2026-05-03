/**
 * CampaignSearchService — manages campaign search, filtering, and enrollment.
 *
 * Provides:
 * - HTTP-backed campaign search with query-param mapping
 * - 5-minute in-memory cache using shareReplay
 * - Retry logic (up to 2 retries on transient failures)
 * - 10-second request timeout
 * - Free and paid campaign enrollment
 *
 * Validates: Requirements 1.1, 1.2, 4.1, 4.2, 7.1, 7.2, 7.5, 8.5
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import {
  Observable,
  throwError,
  timer,
  of,
} from 'rxjs';
import {
  catchError,
  retry,
  shareReplay,
  timeout,
  tap,
  map,
} from 'rxjs/operators';

import {
  Campaign,
  CampaignSearchResult,
  SearchCriteria,
  EnrollmentResult,
  CapacityFilterType,
  AvailabilityFilterType,
} from '../pages/search-campaigns/models/campaign.models';
import {
  PaymentData,
} from '../shared/models/payment.models';
import { environment } from '../../environments/environment';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = `${environment.apiBaseUrl}/api`;

/** Cache TTL in milliseconds (5 minutes). */
const CACHE_TTL_MS = environment.campaignCacheTtlMs;

/** HTTP request timeout in milliseconds (10 seconds). */
const REQUEST_TIMEOUT_MS = environment.requestTimeoutMs;

/** Maximum number of retry attempts on transient failures. */
const MAX_RETRIES = 2;

/** Retry delay in milliseconds. Exposed for testing overrides. */
export const RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Internal cache entry type
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data$: Observable<T>;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Backend DTO → Frontend model mapping
// ---------------------------------------------------------------------------

/**
 * Shape returned by the backend CampaignSearchDto.
 * The backend returns ownerName/ownerId as flat fields; the frontend
 * Campaign interface expects a nested owner object.
 */
interface BackendCampaignDto {
  id: string;
  name: string;
  description: string;
  ownerName: string;
  ownerId: string;
  maxPlayers: number;
  currentPlayers: number;
  joinPrice: number;
  visibility: string;
  hasAvailableSlots: boolean;
  createdAt?: string;
}

function mapBackendCampaign(dto: BackendCampaignDto): Campaign {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    owner: {
      id: dto.ownerId,
      name: dto.ownerName,
      subscriptionTier: 'FREE',
    },
    maxPlayers: dto.maxPlayers,
    currentPlayers: dto.currentPlayers,
    joinPrice: dto.joinPrice,
    visibility: dto.visibility as Campaign['visibility'],
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class CampaignSearchService {
  private http = inject(HttpClient);

  /**
   * Cache keyed by a serialised SearchCriteria string.
   * Each entry holds a shared Observable and an expiry timestamp.
   */
  private searchCache = new Map<string, CacheEntry<CampaignSearchResult>>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Searches campaigns using the provided criteria.
   *
   * Results are cached for 5 minutes per unique criteria combination.
   * Requests time out after 10 seconds and are retried up to 2 times.
   *
   * Validates: Requirements 1.1, 1.2, 8.5
   */
  searchCampaigns(criteria: SearchCriteria): Observable<CampaignSearchResult> {
    const cacheKey = this.buildCacheKey(criteria);
    const now = Date.now();

    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data$;
    }

    const params = this.buildHttpParams(criteria);

    const request$ = this.http
      .get<{ campaigns: BackendCampaignDto[]; totalElements: number; totalPages: number; currentPage: number; hasNext: boolean }>(`${API_URL}/campaigns/search`, { params })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry({ count: MAX_RETRIES, delay: this.retryDelay }),
        map((response) => ({
          campaigns: response.campaigns.map(mapBackendCampaign),
          totalElements: response.totalElements,
          totalPages: response.totalPages,
          currentPage: response.currentPage,
          hasNext: response.hasNext,
        })),
        catchError((err) => this.handleError(err)),
        shareReplay(1),
      );

    this.searchCache.set(cacheKey, {
      data$: request$,
      expiresAt: now + CACHE_TTL_MS,
    });

    return request$;
  }

  /**
   * Retrieves the full details of a single campaign by ID.
   *
   * Validates: Requirements 1.1
   */
  getCampaignDetails(campaignId: string): Observable<Campaign> {
    return this.http
      .get<Campaign>(`${API_URL}/campaigns/${campaignId}`)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry({ count: MAX_RETRIES, delay: this.retryDelay }),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Enrolls the authenticated user in a free campaign.
   *
   * Validates: Requirements 4.1
   */
  joinFreeCampaign(campaignId: string): Observable<EnrollmentResult> {
    return this.http
      .post<EnrollmentResult>(`${API_URL}/campaigns/${campaignId}/join`, {})
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry({ count: MAX_RETRIES, delay: this.retryDelay }),
        tap(() => this.invalidateCacheForCampaign(campaignId)),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Enrolls the authenticated user in a paid campaign after processing payment.
   *
   * Validates: Requirements 4.2
   */
  joinPaidCampaign(
    campaignId: string,
    paymentData: PaymentData,
  ): Observable<EnrollmentResult> {
    return this.http
      .post<EnrollmentResult>(
        `${API_URL}/campaigns/${campaignId}/join-paid`,
        paymentData,
      )
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        // Do not retry paid requests — avoid duplicate charges (even mock ones)
        tap(() => this.invalidateCacheForCampaign(campaignId)),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Checks the current availability of a campaign (available slots).
   *
   * Validates: Requirements 10.2, 10.3
   */
  checkAvailability(campaignId: string): Observable<{ hasAvailableSlots: boolean; currentPlayers: number; maxPlayers: number }> {
    return this.http
      .get<{ hasAvailableSlots: boolean; currentPlayers: number; maxPlayers: number }>(
        `${API_URL}/campaigns/${campaignId}/availability`,
      )
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry({ count: MAX_RETRIES, delay: this.retryDelay }),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Clears the entire search cache, forcing fresh data on the next request.
   *
   * Validates: Requirements 8.5
   */
  refreshCampaignData(): Observable<void> {
    this.searchCache.clear();
    return of(undefined);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Builds a deterministic cache key from a SearchCriteria object.
   */
  private buildCacheKey(criteria: SearchCriteria): string {
    return JSON.stringify({
      searchText: criteria.searchText ?? '',
      pricePreset: criteria.priceRange?.preset ?? '',
      priceMin: criteria.priceRange?.min ?? '',
      priceMax: criteria.priceRange?.max ?? '',
      capacityType: criteria.capacityFilter?.type ?? '',
      availabilityType: criteria.availabilityFilter?.type ?? '',
      page: criteria.page,
      size: criteria.size,
    });
  }

  /**
   * Converts a SearchCriteria object into Angular HttpParams for the backend.
   */
  private buildHttpParams(criteria: SearchCriteria): HttpParams {
    let params = new HttpParams()
      .set('page', String(criteria.page))
      .set('size', String(criteria.size));

    if (criteria.searchText && criteria.searchText.trim().length > 0) {
      params = params.set('searchText', criteria.searchText.trim());
    }

    // Price range
    if (criteria.priceRange) {
      const { preset, min, max } = criteria.priceRange;
      if (preset === 'FREE') {
        params = params.set('minPrice', '0').set('maxPrice', '0');
      } else if (preset === 'UNDER_10') {
        params = params.set('maxPrice', '10');
      } else if (preset === 'UNDER_25') {
        params = params.set('maxPrice', '25');
      } else if (preset === 'UNDER_50') {
        params = params.set('maxPrice', '50');
      } else {
        // CUSTOM or no preset
        if (min !== undefined) params = params.set('minPrice', String(min));
        if (max !== undefined) params = params.set('maxPrice', String(max));
      }
    }

    // Capacity filter
    if (criteria.capacityFilter) {
      const { type, minPlayers, maxPlayers } = criteria.capacityFilter;
      if (type === CapacityFilterType.SMALL) {
        params = params.set('minPlayers', '1').set('maxPlayers', '4');
      } else if (type === CapacityFilterType.MEDIUM) {
        params = params.set('minPlayers', '5').set('maxPlayers', '6');
      } else if (type === CapacityFilterType.LARGE) {
        params = params.set('minPlayers', '7');
      } else if (type === CapacityFilterType.ANY) {
        if (minPlayers !== undefined) params = params.set('minPlayers', String(minPlayers));
        if (maxPlayers !== undefined) params = params.set('maxPlayers', String(maxPlayers));
      }
    }

    // Availability filter
    if (criteria.availabilityFilter) {
      const { type } = criteria.availabilityFilter;
      if (type === AvailabilityFilterType.AVAILABLE_ONLY) {
        params = params.set('availableOnly', 'true');
      } else if (type === AvailabilityFilterType.FULL_ONLY) {
        params = params.set('availableOnly', 'false');
      }
      // ALL: no param needed
    }

    return params;
  }

  /**
   * Invalidates all cache entries that contain the given campaign ID.
   * Called after a successful enrollment to ensure fresh data is fetched.
   */
  private invalidateCacheForCampaign(_campaignId: string): void {
    // Simplest strategy: clear the whole cache so the next search is fresh.
    this.searchCache.clear();
  }

  /**
   * Delay function for retry logic.
   * Uses exponential back-off: 1 s, 2 s.
   * Exposed as a property so tests can override it with zero delay.
   */
  retryDelay(_error: unknown, retryCount: number): Observable<number> {
    const delayMs = Math.pow(2, retryCount - 1) * RETRY_DELAY_MS;
    return timer(delayMs);
  }

  /**
   * Centralised error handler.
   *
   * Maps HTTP status codes to user-friendly error messages.
   * Validates: Requirements 7.1, 7.2, 7.5
   */
  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      let message: string;

      switch (error.status) {
        case 0:
          message = 'Service temporarily unavailable. Please check your connection.';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'Campaign not found.';
          break;
        case 409:
          message = error.error?.message ?? 'Conflict: you may already be enrolled in this campaign.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          message = error.error?.message ?? `Unexpected error (${error.status}).`;
      }

      return throwError(() => new Error(message));
    }

    // Timeout or other non-HTTP errors
    if (error instanceof Error && error.name === 'TimeoutError') {
      return throwError(
        () => new Error('Request timed out after 10 seconds. Please try again.'),
      );
    }

    return throwError(() => error);
  }
}

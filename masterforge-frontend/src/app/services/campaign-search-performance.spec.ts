/**
 * Performance-related tests for the search-campaigns feature.
 *
 * Tests cover:
 * - Cache effectiveness: verifies that repeated calls with same criteria
 *   do not make additional HTTP requests (Req 8.5)
 * - Cache invalidation: verifies that refreshCampaignData() clears the cache
 *   so the next call hits the network (Req 8.5)
 * - Pagination metadata: verifies that hasNext/totalElements are correct
 *   for various page sizes (Req 8.4)
 * - Concurrent access simulation: verifies that multiple simultaneous subscribers
 *   share a single HTTP request (Req 8.6)
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { of } from 'rxjs';

import { CampaignSearchService } from './campaign-search.service';
import {
  SearchCriteria,
  CampaignSearchResult,
  CampaignVisibility,
} from '../pages/search-campaigns/models/campaign.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080/api';

function makeCriteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return { page: 0, size: 20, ...overrides };
}

function makeSearchResult(
  count: number,
  hasNext = false,
  totalElements?: number,
): CampaignSearchResult {
  return {
    campaigns: Array.from({ length: count }, (_, i) => ({
      id: `camp-${i}`,
      name: `Campaign ${i}`,
      description: `Description ${i}`,
      owner: { id: 'owner-1', name: 'DM Name', subscriptionTier: 'FREE' },
      maxPlayers: 5,
      currentPlayers: i % 5,
      joinPrice: 0,
      visibility: CampaignVisibility.PUBLIC,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    totalElements: totalElements ?? count,
    totalPages: hasNext ? 2 : 1,
    currentPage: 0,
    hasNext,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Search Campaigns Performance Tests', () => {
  let service: CampaignSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CampaignSearchService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CampaignSearchService);
    httpMock = TestBed.inject(HttpTestingController);

    // Override retry delay to 0ms so tests don't need long tick() calls
    service.retryDelay = (_err: unknown, _count: number) => of(0);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ── Req 8.5: Caching effectiveness ────────────────────────────────────────

  describe('Caching effectiveness (Req 8.5)', () => {
    it('should make only ONE HTTP request for N repeated calls with the same criteria', () => {
      const criteria = makeCriteria({ searchText: 'dragon' });
      const mockResult = makeSearchResult(5);
      const received: CampaignSearchResult[] = [];

      // Make 5 calls with the same criteria
      for (let i = 0; i < 5; i++) {
        service.searchCampaigns(criteria).subscribe((r) => received.push(r));
      }

      // Only ONE HTTP request should have been made
      const requests = httpMock.match(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(requests.length).toBe(1);
      requests[0].flush(mockResult);

      // All 5 subscribers should have received the result
      expect(received.length).toBe(5);
      received.forEach((r) => expect(r.totalElements).toBe(5));
    });

    it('should make a new HTTP request after refreshCampaignData() clears the cache', () => {
      const criteria = makeCriteria({ searchText: 'elf' });
      const mockResult = makeSearchResult(3);

      // First call — populates cache
      service.searchCampaigns(criteria).subscribe();
      httpMock
        .expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .flush(mockResult);

      // Clear cache
      service.refreshCampaignData().subscribe();

      // Second call — should hit the network again
      service.searchCampaigns(criteria).subscribe();
      const req2 = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req2).toBeTruthy();
      req2.flush(mockResult);
    });

    it('should use separate cache entries for different search criteria', () => {
      const criteria1 = makeCriteria({ searchText: 'goblin' });
      const criteria2 = makeCriteria({ searchText: 'dragon' });
      const criteria3 = makeCriteria({ page: 1, size: 20 });

      // Three different criteria — should make 3 separate HTTP requests
      service.searchCampaigns(criteria1).subscribe();
      service.searchCampaigns(criteria2).subscribe();
      service.searchCampaigns(criteria3).subscribe();

      const requests = httpMock.match(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(requests.length).toBe(3);
      requests.forEach((r) => r.flush(makeSearchResult(2)));
    });

    it('should return cached result immediately on second call (no additional HTTP request)', () => {
      const criteria = makeCriteria({ searchText: 'wizard' });
      const mockResult = makeSearchResult(4);
      let firstResult: CampaignSearchResult | null = null;
      let secondResult: CampaignSearchResult | null = null;

      // First call
      service
        .searchCampaigns(criteria)
        .subscribe((r) => {
          firstResult = r;
        });
      httpMock
        .expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .flush(mockResult);

      // Second call — should resolve from cache without a new HTTP request
      service
        .searchCampaigns(criteria)
        .subscribe((r) => {
          secondResult = r;
        });
      httpMock.expectNone(`${BASE_URL}/campaigns/search`);

      expect(firstResult).toBeTruthy();
      expect(secondResult).toBeTruthy();
      expect((firstResult as unknown as CampaignSearchResult).totalElements).toBe(
        (secondResult as unknown as CampaignSearchResult).totalElements,
      );
    });
  });

  // ── Req 8.4: Pagination metadata ──────────────────────────────────────────

  describe('Pagination metadata correctness (Req 8.4)', () => {
    it('should correctly report hasNext=true when more pages exist', () => {
      const criteria = makeCriteria({ page: 0, size: 20 });
      const mockResult = makeSearchResult(20, true, 45);
      let received: CampaignSearchResult | null = null;

      service.searchCampaigns(criteria).subscribe((r) => {
        received = r;
      });
      httpMock
        .expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .flush(mockResult);

      expect(received!.hasNext).toBeTrue();
      expect(received!.totalElements).toBe(45);
      expect(received!.campaigns.length).toBe(20);
    });

    it('should correctly report hasNext=false on the last page', () => {
      const criteria = makeCriteria({ page: 2, size: 20 });
      const mockResult = makeSearchResult(5, false, 45);
      let received: CampaignSearchResult | null = null;

      service.searchCampaigns(criteria).subscribe((r) => {
        received = r;
      });
      httpMock
        .expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .flush(mockResult);

      expect(received!.hasNext).toBeFalse();
      expect(received!.campaigns.length).toBe(5);
    });

    it('should include correct page and size params in HTTP request', () => {
      const criteria = makeCriteria({ page: 2, size: 10 });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('10');
      req.flush(makeSearchResult(10));
    });
  });

  // ── Req 8.6: Concurrent access simulation ─────────────────────────────────

  describe('Concurrent access simulation (Req 8.6)', () => {
    it('should handle multiple simultaneous subscribers to the same search', () => {
      const criteria = makeCriteria({ searchText: 'orc' });
      const mockResult = makeSearchResult(8);
      const results: CampaignSearchResult[] = [];

      // Simulate 10 concurrent subscribers (e.g., 10 users searching simultaneously)
      for (let i = 0; i < 10; i++) {
        service.searchCampaigns(criteria).subscribe((r) => results.push(r));
      }

      // Only one HTTP request should be made (shareReplay(1) behavior)
      const requests = httpMock.match(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(requests.length).toBe(1);
      requests[0].flush(mockResult);

      // All 10 subscribers should receive the result
      expect(results.length).toBe(10);
      results.forEach((r) => expect(r.campaigns.length).toBe(8));
    });

    it('should handle concurrent searches with different criteria independently', () => {
      const criteriaList = Array.from({ length: 5 }, (_, i) =>
        makeCriteria({ searchText: `term${i}` }),
      );
      const results: Map<string, CampaignSearchResult> = new Map();

      // Launch 5 concurrent searches with different criteria
      criteriaList.forEach((criteria) => {
        service.searchCampaigns(criteria).subscribe((r) => {
          results.set(criteria.searchText!, r);
        });
      });

      // Each should make its own HTTP request
      const requests = httpMock.match(
        (r) => r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(requests.length).toBe(5);

      // Flush each with a different result count
      requests.forEach((req, i) => {
        req.flush(makeSearchResult(i + 1, false, i + 1));
      });

      // Each criteria should have received its own result
      expect(results.size).toBe(5);
    });
  });
});

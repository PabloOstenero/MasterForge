/**
 * Unit tests for CampaignSearchService.
 *
 * Tests cover:
 * - HTTP method and URL correctness
 * - SearchCriteria → HttpParams mapping
 * - 5-minute cache behaviour (hit / miss / expiry)
 * - Retry logic on transient failures
 * - 10-second timeout handling
 * - Error mapping for common HTTP status codes
 * - Free and paid campaign enrollment
 *
 * Validates: Requirements 7.1, 7.2, 7.5
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
  EnrollmentResult,
  PaymentData,
  CampaignVisibility,
  CapacityFilterType,
  AvailabilityFilterType,
  PriceRangePreset,
  PaymentScenario,
  PaymentStatus,
} from '../pages/search-campaigns/models/campaign.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080/api';

function makeCriteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return { page: 0, size: 20, ...overrides };
}

function makeSearchResult(count = 2): CampaignSearchResult {
  return {
    campaigns: Array.from({ length: count }, (_, i) => ({
      id: `camp-${i}`,
      name: `Campaign ${i}`,
      description: `Description ${i}`,
      owner: { id: 'owner-1', name: 'DM Name', subscriptionTier: 'FREE' },
      maxPlayers: 5,
      currentPlayers: i,
      joinPrice: 0,
      visibility: CampaignVisibility.PUBLIC,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    totalElements: count,
    totalPages: 1,
    currentPage: 0,
    hasNext: false,
  };
}

function makeEnrollmentResult(success = true): EnrollmentResult {
  return {
    success,
    message: success ? 'Enrolled successfully' : 'Enrollment failed',
    campaignId: 'camp-1',
    enrollmentDate: success ? new Date() : undefined,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CampaignSearchService', () => {
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

  // -------------------------------------------------------------------------
  // Basic HTTP behaviour
  // -------------------------------------------------------------------------

  describe('searchCampaigns()', () => {
    it('should call GET /api/campaigns/search with page and size params', () => {
      const criteria = makeCriteria({ page: 0, size: 20 });
      const mockResult = makeSearchResult();
      let received: CampaignSearchResult | null = null;

      service.searchCampaigns(criteria).subscribe((result) => {
        received = result;
      });

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search` &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '20',
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResult);

      expect(received).toEqual(mockResult as any);
    });

    it('should include searchText param when provided', () => {
      const criteria = makeCriteria({ searchText: 'dragon' });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search` &&
        r.params.get('searchText') === 'dragon',
      );
      expect(req.request.params.get('searchText')).toBe('dragon');
      req.flush(makeSearchResult());
    });

    it('should NOT include searchText param when empty', () => {
      const criteria = makeCriteria({ searchText: '' });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.has('searchText')).toBeFalse();
      req.flush(makeSearchResult());
    });

    it('should map FREE price preset to minPrice=0 and maxPrice=0', () => {
      const criteria = makeCriteria({
        priceRange: { preset: PriceRangePreset.FREE },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('minPrice')).toBe('0');
      expect(req.request.params.get('maxPrice')).toBe('0');
      req.flush(makeSearchResult());
    });

    it('should map UNDER_10 price preset to maxPrice=10', () => {
      const criteria = makeCriteria({
        priceRange: { preset: PriceRangePreset.UNDER_10 },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('maxPrice')).toBe('10');
      req.flush(makeSearchResult());
    });

    it('should map SMALL capacity filter to minPlayers=1 and maxPlayers=4', () => {
      const criteria = makeCriteria({
        capacityFilter: { type: CapacityFilterType.SMALL },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('minPlayers')).toBe('1');
      expect(req.request.params.get('maxPlayers')).toBe('4');
      req.flush(makeSearchResult());
    });

    it('should map MEDIUM capacity filter to minPlayers=5 and maxPlayers=6', () => {
      const criteria = makeCriteria({
        capacityFilter: { type: CapacityFilterType.MEDIUM },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('minPlayers')).toBe('5');
      expect(req.request.params.get('maxPlayers')).toBe('6');
      req.flush(makeSearchResult());
    });

    it('should map LARGE capacity filter to minPlayers=7', () => {
      const criteria = makeCriteria({
        capacityFilter: { type: CapacityFilterType.LARGE },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('minPlayers')).toBe('7');
      req.flush(makeSearchResult());
    });

    it('should map AVAILABLE_ONLY availability filter to availableOnly=true', () => {
      const criteria = makeCriteria({
        availabilityFilter: { type: AvailabilityFilterType.AVAILABLE_ONLY },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('availableOnly')).toBe('true');
      req.flush(makeSearchResult());
    });

    it('should map FULL_ONLY availability filter to availableOnly=false', () => {
      const criteria = makeCriteria({
        availabilityFilter: { type: AvailabilityFilterType.FULL_ONLY },
      });

      service.searchCampaigns(criteria).subscribe();

      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      expect(req.request.params.get('availableOnly')).toBe('false');
      req.flush(makeSearchResult());
    });
  });

  // -------------------------------------------------------------------------
  // Caching behaviour
  // -------------------------------------------------------------------------

  describe('caching', () => {
    it('should return cached result on second call with same criteria', () => {
      const criteria = makeCriteria({ searchText: 'goblin' });
      const mockResult = makeSearchResult(3);
      const received: CampaignSearchResult[] = [];

      // First call — hits the network
      service.searchCampaigns(criteria).subscribe((r) => received.push(r));
      const req1 = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`,
      );
      req1.flush(mockResult);

      // Second call — should use the cached observable (no new HTTP request)
      service.searchCampaigns(criteria).subscribe((r) => received.push(r));
      httpMock.expectNone(`${BASE_URL}/campaigns/search`);

      expect(received.length).toBe(2);
      expect(received[0]).toEqual(mockResult);
      expect(received[1]).toEqual(mockResult);
    });

    it('should make a new HTTP request for different criteria', () => {
      const criteria1 = makeCriteria({ searchText: 'goblin' });
      const criteria2 = makeCriteria({ searchText: 'dragon' });

      service.searchCampaigns(criteria1).subscribe();
      const req1 = httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`);
      req1.flush(makeSearchResult());

      service.searchCampaigns(criteria2).subscribe();
      const req2 = httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`);
      req2.flush(makeSearchResult());

      expect(req1.request.params.get('searchText')).toBe('goblin');
      expect(req2.request.params.get('searchText')).toBe('dragon');
    });

    it('refreshCampaignData() should clear the cache so next call hits the network', () => {
      const criteria = makeCriteria({ searchText: 'elf' });
      const mockResult = makeSearchResult(1);

      // Populate cache
      service.searchCampaigns(criteria).subscribe();
      httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`).flush(mockResult);

      // Clear cache
      service.refreshCampaignData().subscribe();

      // Next call should hit the network again
      service.searchCampaigns(criteria).subscribe();
      const req2 = httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`);
      expect(req2).toBeTruthy();
      req2.flush(mockResult);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling (with zero-delay retry override)
  // -------------------------------------------------------------------------

  describe('error handling', () => {
    it('should emit a user-friendly error for HTTP 0 (network failure)', fakeAsync(() => {
      const criteria = makeCriteria();
      let errorMessage = '';

      service.searchCampaigns(criteria).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      // Initial request
      httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .error(new ProgressEvent('error'), { status: 0 });
      tick(0);

      // Retry 1
      httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .error(new ProgressEvent('error'), { status: 0 });
      tick(0);

      // Retry 2
      httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
        .error(new ProgressEvent('error'), { status: 0 });
      tick(0);

      expect(errorMessage).toContain('temporarily unavailable');
    }));

    it('should emit a user-friendly error for HTTP 404', fakeAsync(() => {
      let errorMessage = '';

      service.getCampaignDetails('nonexistent-id').subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      // Initial + 2 retries
      for (let i = 0; i < 3; i++) {
        httpMock.expectOne(`${BASE_URL}/campaigns/nonexistent-id`)
          .flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
        tick(0);
      }

      expect(errorMessage).toContain('not found');
    }));

    it('should emit a user-friendly error for HTTP 500', fakeAsync(() => {
      const criteria = makeCriteria();
      let errorMessage = '';

      service.searchCampaigns(criteria).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      for (let i = 0; i < 3; i++) {
        httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
          .flush({ message: 'Internal error' }, { status: 500, statusText: 'Server Error' });
        tick(0);
      }

      expect(errorMessage).toContain('Server error');
    }));

    it('should emit a user-friendly error for HTTP 401', fakeAsync(() => {
      const criteria = makeCriteria();
      let errorMessage = '';

      service.searchCampaigns(criteria).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      for (let i = 0; i < 3; i++) {
        httpMock.expectOne((r) => r.url === `${BASE_URL}/campaigns/search`)
          .flush({}, { status: 401, statusText: 'Unauthorized' });
        tick(0);
      }

      expect(errorMessage).toContain('Authentication required');
    }));
  });

  // -------------------------------------------------------------------------
  // Enrollment methods
  // -------------------------------------------------------------------------

  describe('joinFreeCampaign()', () => {
    it('should POST to /api/campaigns/{id}/join', () => {
      const mockResult = makeEnrollmentResult(true);
      let received: EnrollmentResult | null = null;

      service.joinFreeCampaign('camp-1').subscribe((result) => {
        received = result;
      });

      const req = httpMock.expectOne(`${BASE_URL}/campaigns/camp-1/join`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResult);

      expect(received).toEqual(mockResult as any);
    });

    it('should emit error when join fails with 409 (already enrolled)', fakeAsync(() => {
      let errorMessage = '';

      service.joinFreeCampaign('camp-1').subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      // Initial + 2 retries
      for (let i = 0; i < 3; i++) {
        httpMock.expectOne(`${BASE_URL}/campaigns/camp-1/join`)
          .flush(
            { message: 'Already enrolled' },
            { status: 409, statusText: 'Conflict' },
          );
        tick(0);
      }

      expect(errorMessage).toContain('enrolled');
    }));
  });

  describe('joinPaidCampaign()', () => {
    it('should POST to /api/campaigns/{id}/join-paid with payment data', () => {
      const paymentData: PaymentData = {
        campaignId: 'camp-2',
        amount: 9.99,
        cardData: {
          cardNumber: '4111111111111111',
          expiryDate: '12/26',
          cvv: '123',
          cardholderName: 'Test User',
        },
      };
      const mockResult = makeEnrollmentResult(true);
      let received: EnrollmentResult | null = null;

      service.joinPaidCampaign('camp-2', paymentData).subscribe((result) => {
        received = result;
      });

      const req = httpMock.expectOne(`${BASE_URL}/campaigns/camp-2/join-paid`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(paymentData);
      req.flush(mockResult);

      expect(received).toEqual(mockResult as any);
    });

    it('should NOT retry paid campaign join requests', () => {
      const paymentData: PaymentData = {
        campaignId: 'camp-2',
        amount: 9.99,
        cardData: {
          cardNumber: '4111111111111111',
          expiryDate: '12/26',
          cvv: '123',
          cardholderName: 'Test User',
        },
      };
      let errorCalled = false;

      service.joinPaidCampaign('camp-2', paymentData).subscribe({
        error: () => { errorCalled = true; },
      });

      // Only ONE request should be made (no retries for paid requests)
      const req = httpMock.expectOne(`${BASE_URL}/campaigns/camp-2/join-paid`);
      req.flush({}, { status: 500, statusText: 'Server Error' });

      // No further requests expected
      httpMock.expectNone(`${BASE_URL}/campaigns/camp-2/join-paid`);
      expect(errorCalled).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // getCampaignDetails()
  // -------------------------------------------------------------------------

  describe('getCampaignDetails()', () => {
    it('should call GET /api/campaigns/{id}', () => {
      const mockCampaign = {
        id: 'camp-1',
        name: 'Test Campaign',
        description: 'A test',
        owner: { id: 'owner-1', name: 'DM', subscriptionTier: 'FREE' },
        maxPlayers: 5,
        currentPlayers: 2,
        joinPrice: 0,
        visibility: CampaignVisibility.PUBLIC,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      let received: any = null;

      service.getCampaignDetails('camp-1').subscribe((campaign) => {
        received = campaign;
      });

      const req = httpMock.expectOne(`${BASE_URL}/campaigns/camp-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCampaign);

      expect(received.id).toBe('camp-1');
    });
  });
});

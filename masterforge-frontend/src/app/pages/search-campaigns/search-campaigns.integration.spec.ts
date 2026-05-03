/**
 * Integration tests for SearchCampaignsPage.
 *
 * Tests complete component workflows using HttpTestingController to intercept
 * HTTP requests and verify component state changes.
 *
 * Validates: Requirements 1.1, 1.2, 4.1, 4.2, 7.1, 8.4, 10.2
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SearchCampaignsPage } from './search-campaigns.page';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { CampaignSearchService } from '../../services/campaign-search.service';
import { Campaign, CampaignVisibility } from './models/campaign.models';
import { of } from 'rxjs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: `campaign-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Campaign',
    description: 'A test campaign description',
    owner: { id: 'owner-1', name: 'Owner Name', subscriptionTier: 'FREE' },
    maxPlayers: 4,
    currentPlayers: 0,
    joinPrice: 0,
    visibility: CampaignVisibility.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeSearchResult(campaigns: Campaign[], hasNext = false) {
  return {
    campaigns,
    totalElements: campaigns.length,
    totalPages: hasNext ? 2 : 1,
    currentPage: 0,
    hasNext,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SearchCampaignsPage — Integration', () => {
  let component: SearchCampaignsPage;
  let fixture: ComponentFixture<SearchCampaignsPage>;
  let httpMock: HttpTestingController;
  let campaignSearchService: CampaignSearchService;

  const mockAuthService = {
    isAuthenticated: () => true,
    getToken: () => 'mock-token',
  };

  const mockNotificationService = {
    showSuccess: jasmine.createSpy('showSuccess'),
    showError: jasmine.createSpy('showError'),
    showInfo: jasmine.createSpy('showInfo'),
    activeToast$: of(null),
    notifications$: of([]),
    dismiss: jasmine.createSpy('dismiss'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchCampaignsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchCampaignsPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    campaignSearchService = TestBed.inject(CampaignSearchService);

    // Clear the service cache before each test to avoid cross-test contamination
    campaignSearchService.refreshCampaignData().subscribe();
    // Override retry delay to 0ms so error tests don't need long tick() calls
    campaignSearchService.retryDelay = (_err: unknown, _count: number) => of(0);
  });

  afterEach(() => {
    // Cancel any pending (non-cancelled) requests before verifying
    // The CampaignSearchService uses shareReplay which may leave pending requests
    httpMock.match(() => true)
      .filter((req) => !req.cancelled)
      .forEach((req) => req.flush(makeSearchResult([])));
    httpMock.verify();
  });

  // ── Test 1: Load campaigns on init ───────────────────────────────────────

  it('should load campaigns on init and display them', fakeAsync(() => {
    const campaigns = [makeCampaign({ id: 'c1' }), makeCampaign({ id: 'c2' })];

    fixture.detectChanges(); // triggers ngOnInit → searchCampaigns()

    const req = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    expect(req.request.method).toBe('GET');
    req.flush(makeSearchResult(campaigns));
    tick();

    expect(component.campaigns.length).toBe(2);
    expect(component.campaigns[0].id).toBe('c1');
    expect(component.campaigns[1].id).toBe('c2');
  }));

  // ── Test 2: New HTTP request when search text changes ────────────────────

  it('should make new HTTP request when search text changes', fakeAsync(() => {
    fixture.detectChanges();

    // Flush initial request
    const initialReq = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    initialReq.flush(makeSearchResult([]));
    tick();

    // Change search text
    component.onSearchChange('dragon');
    fixture.detectChanges();
    tick();

    // Expect a new request with searchText param
    const searchReq = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search` &&
      r.params.get('searchText') === 'dragon'
    );
    expect(searchReq.request.params.get('searchText')).toBe('dragon');
    searchReq.flush(makeSearchResult([]));
    tick();
  }));

  // ── Test 3: Join free campaign calls POST /join ──────────────────────────

  it('should call joinFreeCampaign when joining a free campaign', fakeAsync(() => {
    const campaign = makeCampaign({ id: 'free-camp', joinPrice: 0 });
    component.campaigns = [campaign];
    fixture.detectChanges();

    // Flush initial search request
    const initReq = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    initReq.flush(makeSearchResult([campaign]));
    tick();

    // Trigger join
    component.onJoinCampaign('free-camp');
    tick();

    // Expect POST to /join endpoint
    const joinReq = httpMock.expectOne(`${BASE_URL}/campaigns/free-camp/join`);
    expect(joinReq.request.method).toBe('POST');
    joinReq.flush({ success: true, message: 'Enrolled', campaignId: 'free-camp' });
    tick();

    // After join, refreshCampaignData is called, then a new search request is made
    const refreshReq = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    refreshReq.flush(makeSearchResult([{ ...campaign, currentPlayers: 1 }]));
    tick();
  }));

  // ── Test 4: Show payment processor for paid campaign ────────────────────

  it('should show payment processor when joining a paid campaign', fakeAsync(() => {
    const paidCampaign = makeCampaign({ id: 'paid-camp', joinPrice: 9.99 });
    component.campaigns = [paidCampaign];
    fixture.detectChanges();

    // Flush initial search request
    const initReq = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    initReq.flush(makeSearchResult([paidCampaign]));
    tick();

    // Trigger join on paid campaign
    component.onJoinCampaign('paid-camp');
    fixture.detectChanges();

    // paymentCampaign should be set (PaymentProcessorComponent shown)
    expect(component.paymentCampaign).toBeTruthy();
    expect(component.paymentCampaign?.id).toBe('paid-camp');
    expect(component.paymentCampaign?.joinPrice).toBe(9.99);
  }));

  // ── Test 5: Show error when API call fails ───────────────────────────────

  it('should show error message when API call fails', fakeAsync(() => {
    fixture.detectChanges();

    // The service retries up to 2 times — fail all 3 requests
    for (let i = 0; i < 3; i++) {
      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`
      );
      req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });
      tick(0);
    }

    expect(component.error).toBeTruthy();
    expect(component.error).toContain('Server error');
  }));

  // ── Test 6: Clear error and retry on onRetry ─────────────────────────────

  it('should clear error and retry when onRetry is called', fakeAsync(() => {
    fixture.detectChanges();

    // Fail initial request + 2 retries
    for (let i = 0; i < 3; i++) {
      const req = httpMock.expectOne((r) =>
        r.url === `${BASE_URL}/campaigns/search`
      );
      req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });
      tick(0);
    }

    expect(component.error).toBeTruthy();

    // Call retry — should clear the error state
    component.onRetry();
    fixture.detectChanges();
    tick();

    // Error should be cleared immediately
    expect(component.error).toBeNull();
    // Campaigns array should be reset
    expect(component.campaigns.length).toBe(0);
  }));

  // ── Test 7: Append campaigns when loading more pages ────────────────────

  it('should append campaigns when loading more pages', fakeAsync(() => {
    const page1Campaigns = [makeCampaign({ id: 'c1' }), makeCampaign({ id: 'c2' })];
    const page2Campaigns = [makeCampaign({ id: 'c3' })];

    fixture.detectChanges();

    // Flush initial request with hasNext=true
    const req1 = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search`
    );
    req1.flush({
      campaigns: page1Campaigns,
      totalElements: 3,
      totalPages: 2,
      currentPage: 0,
      hasNext: true,
    });
    tick();

    expect(component.campaigns.length).toBe(2);
    expect(component.hasNext).toBeTrue();

    // Load more
    component.onLoadMore();
    fixture.detectChanges();
    tick();

    // Flush second page request
    const req2 = httpMock.expectOne((r) =>
      r.url === `${BASE_URL}/campaigns/search` &&
      r.params.get('page') === '1'
    );
    req2.flush({
      campaigns: page2Campaigns,
      totalElements: 3,
      totalPages: 2,
      currentPage: 1,
      hasNext: false,
    });
    tick();

    // Campaigns should be appended (2 + 1 = 3)
    expect(component.campaigns.length).toBe(3);
    expect(component.campaigns.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  }));

});

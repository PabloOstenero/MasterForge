import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignsPage } from './campaigns.page';
import { ApiService } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const campaignArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ maxLength: 100 }),
});

const sessionArb = fc.record({
  id: fc.uuid(),
  scheduledDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  price: fc.float({ min: 0, max: 500, noNaN: true }),
  campaign: fc.option(fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }) }), { nil: null }),
});

const nonEmptyNameArb = fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0);
const blankNameArb = fc.stringMatching(/^\s*$/);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getCampaigns', 'getSessions', 'createCampaign', 'createSession',
  ]);
  spy.getCampaigns.and.returnValue(of([]));
  spy.getSessions.and.returnValue(of([]));
  spy.createCampaign.and.returnValue(of({}));
  spy.createSession.and.returnValue(of({}));
  return spy;
}

// ---------------------------------------------------------------------------
// CampanyasPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('CampaignsPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<CampaignsPage>;
  let component: CampaignsPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [CampaignsPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 8: Campaign list renders all campaigns
  // Validates: Requirement 6.1
  // -------------------------------------------------------------------------
  it('P8 — for any N campaigns, exactly N campaign-cards are rendered', () => {
    fc.assert(
      fc.property(fc.array(campaignArb, { minLength: 0, maxLength: 15 }), (campaigns) => {
        component.campaigns = campaigns;
        component.loadingCampaigns = false;
        component.errorCampaigns = null;
        fixture.detectChanges();

        const cards = fixture.nativeElement.querySelectorAll('[data-testid="campaign-card"]');
        expect(cards.length).toBe(campaigns.length);
      }),
      { numRuns: 100 }
    );
  });

  it('P8b — for any N sessions, exactly N session-cards are rendered', () => {
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 15 }), (sessions) => {
        component.sessions = sessions;
        component.loadingSessions = false;
        component.errorSessions = null;
        fixture.detectChanges();

        const cards = fixture.nativeElement.querySelectorAll('[data-testid="session-card"]');
        expect(cards.length).toBe(sessions.length);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 9: Empty campaign name is rejected
  // Validates: Requirement 6.8
  // -------------------------------------------------------------------------
  it('P9 — whitespace-only campaign name does not call API and sets validation error', () => {
    fc.assert(
      fc.property(blankNameArb, (blankName) => {
        apiSpy.createCampaign.calls.reset();
        component.validationErrorCampaign = null;
        component.newCampaign = { name: blankName, description: '' };
        component.submitCampaign();
        expect(apiSpy.createCampaign).not.toHaveBeenCalled();
        expect(component.validationErrorCampaign).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('P9b — non-empty campaign name calls createCampaign exactly once', () => {
    fc.assert(
      fc.property(nonEmptyNameArb, fc.string({ maxLength: 100 }), (name, description) => {
        apiSpy.createCampaign.calls.reset();
        component.newCampaign = { name, description };
        component.submitCampaign();
        expect(apiSpy.createCampaign).toHaveBeenCalledTimes(1);
        expect(apiSpy.createCampaign).toHaveBeenCalledWith(
          jasmine.objectContaining({ name: name.trim() })
        );
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: API error sets error state and clears loading
  // Validates: Requirements 9.4
  // -------------------------------------------------------------------------
  it('P10a — getCampaigns error sets errorCampaigns and clears loadingCampaigns', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errMsg) => {
        apiSpy.getCampaigns.and.returnValue(throwError(() => new Error(errMsg)));
        component.loadCampaigns();
        expect(component.loadingCampaigns).toBeFalse();
        expect(component.errorCampaigns).toBeTruthy();
        apiSpy.getCampaigns.and.returnValue(of([]));
      }),
      { numRuns: 100 }
    );
  });

  it('P10b — getSessions error sets errorSessions and clears loadingSessions', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errMsg) => {
        apiSpy.getSessions.and.returnValue(throwError(() => new Error(errMsg)));
        component.loadSessions();
        expect(component.loadingSessions).toBeFalse();
        expect(component.errorSessions).toBeTruthy();
        apiSpy.getSessions.and.returnValue(of([]));
      }),
      { numRuns: 100 }
    );
  });

  it('P10c — createCampaign error sets errorCampaigns', () => {
    fc.assert(
      fc.property(nonEmptyNameArb, fc.string({ minLength: 1 }), (name, errMsg) => {
        apiSpy.createCampaign.and.returnValue(throwError(() => new Error(errMsg)));
        component.errorCampaigns = null;
        component.newCampaign = { name, description: '' };
        component.submitCampaign();
        expect(component.errorCampaigns).toBeTruthy();
        apiSpy.createCampaign.and.returnValue(of({}));
      }),
      { numRuns: 100 }
    );
  });

  it('P10d — createSession error sets errorSessions', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString()),
        fc.float({ min: 1, max: 200, noNaN: true }),
        fc.uuid(),
        fc.string({ minLength: 1 }),
        (scheduledDate, price, campaignId, errMsg) => {
          apiSpy.createSession.and.returnValue(throwError(() => new Error(errMsg)));
          component.errorSessions = null;
          component.newSession = { scheduledDate, price: String(price), campaignId };
          component.submitSession();
          expect(component.errorSessions).toBeTruthy();
          apiSpy.createSession.and.returnValue(of({}));
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // toggleCampaignForm / toggleSessionForm — pure toggle
  // -------------------------------------------------------------------------
  it('toggleCampaignForm — always flips showNewCampaignForm', () => {
    fc.assert(
      fc.property(fc.boolean(), (initial) => {
        component.showNewCampaignForm = initial;
        component.toggleCampaignForm();
        expect(component.showNewCampaignForm).toBe(!initial);
      }),
      { numRuns: 100 }
    );
  });

  it('toggleSessionForm — always flips showNewSessionForm', () => {
    fc.assert(
      fc.property(fc.boolean(), (initial) => {
        component.showNewSessionForm = initial;
        component.toggleSessionForm();
        expect(component.showNewSessionForm).toBe(!initial);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // getSessionCount — pure function
  // -------------------------------------------------------------------------
  it('getSessionCount — returns correct count for any campaign+sessions combination', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        (sessions, campaignId) => {
          component.sessions = sessions;
          const expected = sessions.filter(s => (s.campaign as any)?.id === campaignId).length;
          expect(component.getSessionCount(campaignId)).toBe(expected);
          expect(component.getSessionCount(campaignId)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getSessionCount — is a pure function (same inputs yield same output)', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        (sessions, campaignId) => {
          component.sessions = sessions;
          const r1 = component.getSessionCount(campaignId);
          const r2 = component.getSessionCount(campaignId);
          expect(r1).toBe(r2);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Successful submit hides form and refreshes list
  // -------------------------------------------------------------------------
  it('submitCampaign success — hides form and re-fetches campaigns', () => {
    fc.assert(
      fc.property(nonEmptyNameArb, (name) => {
        apiSpy.getCampaigns.calls.reset();
        component.showNewCampaignForm = true;
        component.newCampaign = { name, description: '' };
        const callsBefore = apiSpy.getCampaigns.calls.count();
        component.submitCampaign();
        expect(component.showNewCampaignForm).toBeFalse();
        expect(apiSpy.getCampaigns.calls.count()).toBeGreaterThan(callsBefore);
      }),
      { numRuns: 100 }
    );
  });

  it('submitSession success — hides form and re-fetches sessions', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString()),
        fc.float({ min: 1, max: 200, noNaN: true }),
        fc.uuid(),
        (scheduledDate, price, campaignId) => {
          apiSpy.getSessions.calls.reset();
          component.showNewSessionForm = true;
          component.newSession = { scheduledDate, price: String(price), campaignId };
          const callsBefore = apiSpy.getSessions.calls.count();
          component.submitSession();
          expect(component.showNewSessionForm).toBeFalse();
          expect(apiSpy.getSessions.calls.count()).toBeGreaterThan(callsBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // formatDate — pure function
  // -------------------------------------------------------------------------
  it('formatDate — always returns DD/MM/YYYY HH:mm for any valid ISO date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (date) => {
          const result = component.formatDate(date.toISOString());
          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

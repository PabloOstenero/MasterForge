import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignsPage } from './campaigns.page';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { By } from '@angular/platform-browser';

const VALID_UUID = '00000000-0000-0000-0000-000000000001';

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

function buildAuthSpy(userId: string | null = VALID_UUID): jasmine.SpyObj<AuthService> {
  const spy = jasmine.createSpyObj<AuthService>('AuthService', ['getUserIdFromToken']);
  spy.getUserIdFromToken.and.returnValue(userId);
  return spy;
}

/** Returns a full newCampaign object with all required fields. */
function makeCampaign(name: string, description = '', maxPlayers = 1, joinPrice = 0, visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY' = 'PRIVATE') {
  return { name, description, maxPlayers, joinPrice, visibility };
}

// ---------------------------------------------------------------------------
// CampanyasPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('CampaignsPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<CampaignsPage>;
  let component: CampaignsPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();
    authSpy = buildAuthSpy();

    await TestBed.configureTestingModule({
      imports: [CampaignsPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
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
        component.newCampaign = makeCampaign(blankName);
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
        component.newCampaign = makeCampaign(name, description);
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
        component.newCampaign = makeCampaign(name);
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
        component.newCampaign = makeCampaign(name);
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

  // -------------------------------------------------------------------------
  // Property 1: ownerId always comes from the JWT
  // Feature: campaign-creation-form, Property 1: ownerId always comes from JWT
  // Validates: Requirements 1.1
  // -------------------------------------------------------------------------
  it('P1 — ownerId in createCampaign call always equals the value returned by getUserIdFromToken', () => {
    // Feature: campaign-creation-form, Property 1: ownerId always comes from JWT
    const fixedUuid = '11111111-2222-3333-4444-555555555555';
    authSpy.getUserIdFromToken.and.returnValue(fixedUuid);

    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          description: fc.string(),
          maxPlayers: fc.integer({ min: 1 }),
          joinPrice: fc.float({ min: 0, noNaN: true }),
          visibility: fc.constantFrom('PUBLIC' as const, 'PRIVATE' as const, 'INVITE_ONLY' as const),
        }),
        (formData) => {
          apiSpy.createCampaign.calls.reset();
          component.newCampaign = { ...formData };
          component.submitCampaign();

          expect(apiSpy.createCampaign).toHaveBeenCalledTimes(1);
          const callArgs = apiSpy.createCampaign.calls.mostRecent().args[0];
          expect(callArgs.ownerId).toBe(fixedUuid);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Whitespace-only titles are rejected on the frontend
  // Feature: campaign-creation-form, Property 2: whitespace-only title rejected on frontend
  // Validates: Requirements 2.2
  // -------------------------------------------------------------------------
  it('P2 — whitespace-only campaign name does not call API and sets validationErrorCampaign', () => {
    // Feature: campaign-creation-form, Property 2: whitespace-only title rejected on frontend
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (blankTitle) => {
          apiSpy.createCampaign.calls.reset();
          component.validationErrorCampaign = null;
          component.newCampaign = makeCampaign(blankTitle);
          component.submitCampaign();

          expect(apiSpy.createCampaign).not.toHaveBeenCalled();
          expect(component.validationErrorCampaign).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Valid titles are trimmed before sending
  // Feature: campaign-creation-form, Property 3: valid titles trimmed before sending
  // Validates: Requirements 2.3
  // -------------------------------------------------------------------------
  it('P3 — name in createCampaign payload equals the trimmed input title', () => {
    // Feature: campaign-creation-form, Property 3: valid titles trimmed before sending
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string({ maxLength: 10 }).filter(s => /^\s*$/.test(s)),  // leading whitespace
        fc.string({ maxLength: 10 }).filter(s => /^\s*$/.test(s)),  // trailing whitespace
        (core, leading, trailing) => {
          const rawName = leading + core + trailing;
          apiSpy.createCampaign.calls.reset();
          component.newCampaign = makeCampaign(rawName);
          component.submitCampaign();

          expect(apiSpy.createCampaign).toHaveBeenCalledTimes(1);
          const callArgs = apiSpy.createCampaign.calls.mostRecent().args[0];
          expect(callArgs.name).toBe(rawName.trim());
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: maxPlayers values less than 1 are rejected on the frontend
  // Feature: campaign-creation-form, Property 4: maxPlayers < 1 rejected on frontend
  // Validates: Requirements 4.2
  // -------------------------------------------------------------------------
  it('P4 — maxPlayers < 1 does not call API and sets validationErrorCampaign', () => {
    // Feature: campaign-creation-form, Property 4: maxPlayers < 1 rejected on frontend
    fc.assert(
      fc.property(
        fc.integer({ max: 0 }),
        (invalidMaxPlayers) => {
          apiSpy.createCampaign.calls.reset();
          component.validationErrorCampaign = null;
          component.newCampaign = makeCampaign('Valid Name', '', invalidMaxPlayers);
          component.submitCampaign();

          expect(apiSpy.createCampaign).not.toHaveBeenCalled();
          expect(component.validationErrorCampaign).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: Negative joinPrice values are rejected on the frontend
  // Feature: campaign-creation-form, Property 6: negative joinPrice rejected on frontend
  // Validates: Requirements 5.3
  // -------------------------------------------------------------------------
  it('P6 — negative joinPrice does not call API and sets validationErrorCampaign', () => {
    // Feature: campaign-creation-form, Property 6: negative joinPrice rejected on frontend
    fc.assert(
      fc.property(
        fc.float({ max: -Number.EPSILON, noNaN: true }),
        (negativePrice) => {
          apiSpy.createCampaign.calls.reset();
          component.validationErrorCampaign = null;
          component.newCampaign = makeCampaign('Valid Name', '', 1, negativePrice);
          component.submitCampaign();

          expect(apiSpy.createCampaign).not.toHaveBeenCalled();
          expect(component.validationErrorCampaign).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// CampaignsPage — Example / Unit Tests (Task 13)
// ---------------------------------------------------------------------------

describe('CampaignsPage — Example Tests', () => {

  let fixture: ComponentFixture<CampaignsPage>;
  let component: CampaignsPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();
    authSpy = buildAuthSpy(); // returns VALID_UUID by default

    await TestBed.configureTestingModule({
      imports: [CampaignsPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // 13.1 — New form inputs are rendered when showNewCampaignForm is true
  // Validates: Requirements 4.1, 5.1, 6.1
  // -------------------------------------------------------------------------
  it('13.1 — renders input-campaign-max-players, input-campaign-join-price, and select-campaign-visibility when showNewCampaignForm is true', async () => {
    component.showNewCampaignForm = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const maxPlayersInput = fixture.nativeElement.querySelector('[data-testid="input-campaign-max-players"]');
    const joinPriceInput  = fixture.nativeElement.querySelector('[data-testid="input-campaign-join-price"]');
    const visibilitySelect = fixture.nativeElement.querySelector('[data-testid="select-campaign-visibility"]');

    expect(maxPlayersInput).toBeTruthy();
    expect(joinPriceInput).toBeTruthy();
    expect(visibilitySelect).toBeTruthy();
  });

  it('13.1b — new form inputs are NOT rendered when showNewCampaignForm is false', () => {
    component.showNewCampaignForm = false;
    fixture.detectChanges();

    const maxPlayersInput  = fixture.nativeElement.querySelector('[data-testid="input-campaign-max-players"]');
    const joinPriceInput   = fixture.nativeElement.querySelector('[data-testid="input-campaign-join-price"]');
    const visibilitySelect = fixture.nativeElement.querySelector('[data-testid="select-campaign-visibility"]');

    expect(maxPlayersInput).toBeNull();
    expect(joinPriceInput).toBeNull();
    expect(visibilitySelect).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 13.2 — No ownerId input is rendered anywhere in the template
  // Validates: Requirement 1.3
  // -------------------------------------------------------------------------
  it('13.2 — no ownerId input is rendered anywhere in the template (form hidden)', () => {
    component.showNewCampaignForm = false;
    fixture.detectChanges();

    const ownerIdInput = fixture.nativeElement.querySelector('[data-testid="input-campaign-owner-id"]');
    expect(ownerIdInput).toBeNull();
  });

  it('13.2b — no ownerId input is rendered anywhere in the template (form visible)', async () => {
    component.showNewCampaignForm = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const ownerIdInput = fixture.nativeElement.querySelector('[data-testid="input-campaign-owner-id"]');
    expect(ownerIdInput).toBeNull();

    // Also verify by scanning all inputs for any ngModel or name binding related to ownerId
    const allInputs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('ion-input');
    allInputs.forEach((input) => {
      const testId = input.getAttribute('data-testid') ?? '';
      expect(testId.toLowerCase()).not.toContain('owner');
    });
  });

  // -------------------------------------------------------------------------
  // 13.3 — visibility defaults to 'PRIVATE' and joinPrice defaults to 0
  // Validates: Requirements 5.2, 6.2
  // -------------------------------------------------------------------------
  it('13.3 — visibility defaults to PRIVATE and joinPrice defaults to 0 on component init', () => {
    expect(component.newCampaign.visibility).toBe('PRIVATE');
    expect(component.newCampaign.joinPrice).toBe(0);
  });

  it('13.3b — maxPlayers defaults to 1 on component init', () => {
    expect(component.newCampaign.maxPlayers).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 13.4 — visibility select has exactly three options
  // Validates: Requirement 6.1
  // -------------------------------------------------------------------------
  it('13.4 — visibility select has exactly three options: PUBLIC, PRIVATE, INVITE_ONLY', async () => {
    component.showNewCampaignForm = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const options = fixture.nativeElement.querySelectorAll('[data-testid="select-campaign-visibility"] ion-select-option');
    expect(options.length).toBe(3);

    const values = Array.from(options).map((opt: any) => opt.getAttribute('value'));
    expect(values).toContain('PUBLIC');
    expect(values).toContain('PRIVATE');
    expect(values).toContain('INVITE_ONLY');
  });

  // -------------------------------------------------------------------------
  // 13.5 — Successful submission resets newCampaign to defaults
  // Validates: Requirement 8.1
  // -------------------------------------------------------------------------
  it('13.5 — successful submission resets newCampaign to defaults (maxPlayers: 1, joinPrice: 0, visibility: PRIVATE)', () => {
    component.newCampaign = {
      name: 'My Campaign',
      description: 'A great adventure',
      maxPlayers: 8,
      joinPrice: 9.99,
      visibility: 'PUBLIC',
    };

    component.submitCampaign();

    expect(component.newCampaign.name).toBe('');
    expect(component.newCampaign.description).toBe('');
    expect(component.newCampaign.maxPlayers).toBe(1);
    expect(component.newCampaign.joinPrice).toBe(0);
    expect(component.newCampaign.visibility).toBe('PRIVATE');
  });

  it('13.5b — successful submission hides the form', () => {
    component.showNewCampaignForm = true;
    component.newCampaign = makeCampaign('My Campaign', 'desc', 4, 5, 'PUBLIC');

    component.submitCampaign();

    expect(component.showNewCampaignForm).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // 13.6 — API error sets errorCampaigns without resetting form fields
  // Validates: Requirement 8.3
  // -------------------------------------------------------------------------
  it('13.6 — API error sets errorCampaigns without resetting form fields', () => {
    apiSpy.createCampaign.and.returnValue(throwError(() => new Error('Server error')));

    const originalCampaign = {
      name: 'Epic Quest',
      description: 'Long journey',
      maxPlayers: 6,
      joinPrice: 4.99,
      visibility: 'INVITE_ONLY' as const,
    };
    component.newCampaign = { ...originalCampaign };
    component.errorCampaigns = null;

    component.submitCampaign();

    // Error is set
    expect(component.errorCampaigns).toBeTruthy();

    // Form fields are NOT reset
    expect(component.newCampaign.name).toBe(originalCampaign.name);
    expect(component.newCampaign.description).toBe(originalCampaign.description);
    expect(component.newCampaign.maxPlayers).toBe(originalCampaign.maxPlayers);
    expect(component.newCampaign.joinPrice).toBe(originalCampaign.joinPrice);
    expect(component.newCampaign.visibility).toBe(originalCampaign.visibility);
  });

  it('13.6b — API error does not hide the form', () => {
    apiSpy.createCampaign.and.returnValue(throwError(() => new Error('Server error')));

    component.showNewCampaignForm = true;
    component.newCampaign = makeCampaign('Epic Quest', 'desc', 4, 2, 'PUBLIC');

    component.submitCampaign();

    expect(component.showNewCampaignForm).toBeTrue();
  });

  // -------------------------------------------------------------------------
  // 13.7 — getUserIdFromToken() returning null sets validationErrorCampaign
  //         and does not call createCampaign
  // Validates: Requirement 1.2
  // -------------------------------------------------------------------------
  it('13.7 — getUserIdFromToken() returning null sets validationErrorCampaign and does not call createCampaign', () => {
    authSpy.getUserIdFromToken.and.returnValue(null);

    component.validationErrorCampaign = null;
    component.newCampaign = makeCampaign('Valid Name', 'desc', 4, 0, 'PUBLIC');

    component.submitCampaign();

    expect(component.validationErrorCampaign).toBeTruthy();
    expect(apiSpy.createCampaign).not.toHaveBeenCalled();
  });

  it('13.7b — getUserIdFromToken() returning a valid UUID allows createCampaign to be called', () => {
    authSpy.getUserIdFromToken.and.returnValue(VALID_UUID);

    component.newCampaign = makeCampaign('Valid Name', 'desc', 4, 0, 'PUBLIC');
    apiSpy.createCampaign.calls.reset();

    component.submitCampaign();

    expect(apiSpy.createCampaign).toHaveBeenCalledTimes(1);
    expect(apiSpy.createCampaign).toHaveBeenCalledWith(
      jasmine.objectContaining({ ownerId: VALID_UUID })
    );
  });
});

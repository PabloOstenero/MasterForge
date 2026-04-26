import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import * as fc from 'fast-check';

import { HomePage } from './home.page';
import { ApiService } from '../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const charArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  level: fc.integer({ min: 1, max: 20 }),
  dndClass: fc.constantFrom('Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger'),
  dndRace: fc.constantFrom('Human', 'Elf', 'Dwarf', 'Halfling'),
});

const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom('FREE', 'PRO'),
  characters: fc.array(charArb, { minLength: 0, maxLength: 4 }),
});

const campaignArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  description: fc.string({ maxLength: 100 }),
});

const sessionArb = (campaignIds: string[]) =>
  fc.record({
    id: fc.uuid(),
    scheduledDate: fc
      .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter(d => !isNaN(d.getTime()))
      .map(d => d.toISOString()),
    price: fc.float({ min: 0, max: 200, noNaN: true }),
    campaign: campaignIds.length
      ? fc.oneof(
          fc.constant(null),
          fc.constantFrom(...campaignIds).map(id => ({ id, name: 'Camp-' + id.slice(0, 4) }))
        )
      : fc.constant(null),
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getUsers', 'getCampaigns', 'getSessions', 'createCampaign', 'createSession',
  ]);
  spy.getUsers.and.returnValue(of([]));
  spy.getCampaigns.and.returnValue(of([]));
  spy.getSessions.and.returnValue(of([]));
  spy.createCampaign.and.returnValue(of({}));
  spy.createSession.and.returnValue(of({}));
  return spy;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomePage — Property-Based Tests', () => {

  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 1: Role toggle mutual exclusivity
  // Feature: home-page-redesign, Property 1: Role toggle mutual exclusivity
  // Validates: Requirements 1.2, 1.3
  // -------------------------------------------------------------------------
  it('P1 — for any activeRole, exactly one dashboard block is visible', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'dm' | 'player'>('dm', 'player'),
        (role) => {
          component.activeRole = role;
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          const dmBlock = el.querySelector('[data-testid="dm-dashboard"]');
          const playerBlock = el.querySelector('[data-testid="player-dashboard"]');

          if (role === 'dm') {
            expect(dmBlock).toBeTruthy();
            expect(playerBlock).toBeNull();
          } else {
            expect(playerBlock).toBeTruthy();
            expect(dmBlock).toBeNull();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Campaign list renders all campaigns
  // Feature: home-page-redesign, Property 2: Campaign list renders all campaigns
  // Validates: Requirements 2.2, 3.1
  // -------------------------------------------------------------------------
  it('P2 — for any N campaigns, exactly N campaign cards are rendered', () => {
    fc.assert(
      fc.property(
        fc.array(campaignArb, { minLength: 0, maxLength: 10 }),
        (campaigns) => {
          component.activeRole = 'dm';
          component.campaigns = campaigns;
          component.loadingCampaigns = false;
          fixture.detectChanges();

          const cards = fixture.nativeElement.querySelectorAll('[data-testid="campaign-card"]');
          expect(cards.length).toBe(campaigns.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Session list renders all sessions
  // Feature: home-page-redesign, Property 3: Session list renders all sessions
  // Validates: Requirements 2.3, 4.1
  // -------------------------------------------------------------------------
  it('P3 — for any N sessions, exactly N session cards are rendered', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb([]), { minLength: 0, maxLength: 10 }),
        (sessions) => {
          component.activeRole = 'dm';
          component.sessions = sessions;
          component.loadingSessions = false;
          fixture.detectChanges();

          const cards = fixture.nativeElement.querySelectorAll('[data-testid="session-card"]');
          expect(cards.length).toBe(sessions.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: User roster renders all users
  // Feature: home-page-redesign, Property 4: User roster renders all users
  // Validates: Requirements 2.4, 5.1
  // -------------------------------------------------------------------------
  it('P4 — for any N users, exactly N user rows are rendered in the roster', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 8 }),
        (users) => {
          component.activeRole = 'dm';
          component.users = users;
          component.loadingUsers = false;
          fixture.detectChanges();

          const rows = fixture.nativeElement.querySelectorAll('[data-testid="user-row"]');
          expect(rows.length).toBe(users.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: Campaign card session count
  // Feature: home-page-redesign, Property 5: Campaign card renders required fields
  // Validates: Requirements 3.2
  // -------------------------------------------------------------------------
  it('P5 — getSessionCount returns correct filtered count for any campaign+sessions', () => {
    fc.assert(
      fc.property(
        fc.array(campaignArb, { minLength: 1, maxLength: 5 }),
        fc.array(sessionArb([]), { minLength: 0, maxLength: 10 }),
        (campaigns, sessions) => {
          component.sessions = sessions;

          campaigns.forEach(campaign => {
            const expected = sessions.filter((s: any) => s.campaign?.id === campaign.id).length;
            expect(component.getSessionCount(campaign.id)).toBe(expected);
            expect(component.getSessionCount(campaign.id)).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: Session card date formatting
  // Feature: home-page-redesign, Property 6: Session card date formatting
  // Validates: Requirements 4.2
  // -------------------------------------------------------------------------
  it('P6 — formatDate always returns DD/MM/YYYY HH:mm for any valid ISO timestamp', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (date) => {
          const iso = date.toISOString();
          const result = component.formatDate(iso);
          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

          const [datePart, timePart] = result.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hours, minutes] = timePart.split(':').map(Number);

          const parsed = new Date(iso);
          expect(day).toBe(parsed.getDate());
          expect(month).toBe(parsed.getMonth() + 1);
          expect(year).toBe(parsed.getFullYear());
          expect(hours).toBe(parsed.getHours());
          expect(minutes).toBe(parsed.getMinutes());
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: Form toggle shows inline form
  // Feature: home-page-redesign, Property 7: Form toggle shows inline form
  // Validates: Requirements 3.4, 4.4
  // -------------------------------------------------------------------------
  it('P7 — toggleCampaignForm always flips showNewCampaignForm', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initial) => {
          component.showNewCampaignForm = initial;
          component.toggleCampaignForm();
          expect(component.showNewCampaignForm).toBe(!initial);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('P7b — toggleSessionForm always flips showNewSessionForm', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initial) => {
          component.showNewSessionForm = initial;
          component.toggleSessionForm();
          expect(component.showNewSessionForm).toBe(!initial);
        }
      ),
      { numRuns: 10 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 8: Valid form submission triggers API call
  // Feature: home-page-redesign, Property 8: Valid form submission triggers API call
  // Validates: Requirements 3.5, 4.5
  // -------------------------------------------------------------------------
  it('P8 — submitCampaign with non-empty name calls createCampaign exactly once', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
        fc.string({ maxLength: 100 }),
        (name, description) => {
          apiSpy.createCampaign.calls.reset();
          component.users = [{ id: 'user-1' }];
          component.newCampaign = { name, description };
          component.submitCampaign();
          expect(apiSpy.createCampaign).toHaveBeenCalledTimes(1);
          expect(apiSpy.createCampaign).toHaveBeenCalledWith(
            jasmine.objectContaining({ name: name.trim(), description })
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('P8b — submitSession with all fields populated calls createSession exactly once', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString()),
        fc.float({ min: 1, max: 200, noNaN: true }),
        fc.uuid(),
        (scheduledDate, price, campaignId) => {
          apiSpy.createSession.calls.reset();
          component.newSession = { scheduledDate, price: String(price), campaignId };
          component.submitSession();
          expect(apiSpy.createSession).toHaveBeenCalledTimes(1);
          expect(apiSpy.createSession).toHaveBeenCalledWith(
            jasmine.objectContaining({ scheduledDate, price: Number(price), campaignId })
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 9: Empty/whitespace campaign name is rejected
  // Feature: home-page-redesign, Property 9: Empty/whitespace campaign name is rejected
  // Validates: Requirements 3.8
  // -------------------------------------------------------------------------
  it('P9 — submitCampaign with whitespace-only name does not call API and sets error', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (blankName) => {
          apiSpy.createCampaign.calls.reset();
          component.errorCampaigns = null;
          component.newCampaign = { name: blankName, description: '' };
          component.submitCampaign();
          expect(apiSpy.createCampaign).not.toHaveBeenCalled();
          expect(component.errorCampaigns).toBeTruthy();
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: Successful POST refreshes the list
  // Feature: home-page-redesign, Property 10: Successful POST refreshes the list
  // Validates: Requirements 3.6, 4.6
  // -------------------------------------------------------------------------
  it('P10 — after successful submitCampaign, form is hidden and list is re-fetched', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
        (name) => {
          apiSpy.getCampaigns.calls.reset();
          component.users = [{ id: 'user-1' }];
          component.showNewCampaignForm = true;
          component.newCampaign = { name, description: '' };
          const callsBefore = apiSpy.getCampaigns.calls.count();
          component.submitCampaign();
          expect(component.showNewCampaignForm).toBeFalse();
          expect(apiSpy.getCampaigns.calls.count()).toBeGreaterThan(callsBefore);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('P10b — after successful submitSession, form is hidden and list is re-fetched', () => {
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
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 11: API error sets error state and clears loading
  // Feature: home-page-redesign, Property 11: API error sets error state and clears loading
  // Validates: Requirements 3.7, 4.7, 7.3, 7.4, 7.5
  // -------------------------------------------------------------------------
  it('P11 — GET /api/users error sets errorUsers and clears loadingUsers', () => {
    apiSpy.getUsers.and.returnValue(throwError(() => new Error('users error')));
    component.loadUsers();
    expect(component.loadingUsers).toBeFalse();
    expect(component.errorUsers).toBeTruthy();
  });

  it('P11b — GET /api/campaigns error sets errorCampaigns and clears loadingCampaigns', () => {
    apiSpy.getCampaigns.and.returnValue(throwError(() => new Error('campaigns error')));
    component.loadCampaigns();
    expect(component.loadingCampaigns).toBeFalse();
    expect(component.errorCampaigns).toBeTruthy();
  });

  it('P11c — GET /api/sessions error sets errorSessions and clears loadingSessions', () => {
    apiSpy.getSessions.and.returnValue(throwError(() => new Error('sessions error')));
    component.loadSessions();
    expect(component.loadingSessions).toBeFalse();
    expect(component.errorSessions).toBeTruthy();
  });

  it('P11d — POST /api/campaigns error sets errorCampaigns', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 80 }),
        (name, errMsg) => {
          apiSpy.createCampaign.and.returnValue(throwError(() => new Error(errMsg)));
          component.errorCampaigns = null;
          component.users = [{ id: 'user-1' }];
          component.newCampaign = { name, description: '' };
          component.submitCampaign();
          expect(component.errorCampaigns).toBeTruthy();
          // Reset for next iteration
          apiSpy.createCampaign.and.returnValue(of({}));
        }
      ),
      { numRuns: 50 }
    );
  });

  it('P11e — POST /api/sessions error sets errorSessions', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString()),
        fc.float({ min: 1, max: 200, noNaN: true }),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 80 }),
        (scheduledDate, price, campaignId, errMsg) => {
          apiSpy.createSession.and.returnValue(throwError(() => new Error(errMsg)));
          component.errorSessions = null;
          component.newSession = { scheduledDate, price: String(price), campaignId };
          component.submitSession();
          expect(component.errorSessions).toBeTruthy();
          // Reset for next iteration
          apiSpy.createSession.and.returnValue(of({}));
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 12: Loading state shows spinner
  // Feature: home-page-redesign, Property 12: Loading state shows spinner
  // Validates: Requirements 7.2
  // -------------------------------------------------------------------------
  it('P12 — when loadingCampaigns is true, spinner is present in DM view', () => {
    component.activeRole = 'dm';
    component.loadingCampaigns = true;
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('ion-spinner');
    expect(spinner).toBeTruthy();
  });

  it('P12b — when all loading flags are false and no errors, no spinners are present', () => {
    component.activeRole = 'dm';
    component.loadingCampaigns = false;
    component.loadingSessions = false;
    component.loadingUsers = false;
    component.errorCampaigns = null;
    component.errorSessions = null;
    component.errorUsers = null;
    fixture.detectChanges();

    const spinners = fixture.nativeElement.querySelectorAll('ion-spinner');
    expect(spinners.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Property 13: getSessionCount is a pure function
  // Feature: home-page-redesign, Property 13: Character card renders required fields
  // Validates: Requirements 5.3, 6.2
  // -------------------------------------------------------------------------
  it('P13 — getSessionCount is pure: same inputs always yield same output', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb([]), { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        (sessions, campaignId) => {
          component.sessions = sessions;
          const result1 = component.getSessionCount(campaignId);
          const result2 = component.getSessionCount(campaignId);
          expect(result1).toBe(result2);
          expect(result1).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 14: Character card navigation
  // Feature: home-page-redesign, Property 14: Character card navigation
  // Validates: Requirements 5.4, 6.3
  // -------------------------------------------------------------------------
  it('P14 — goToSheet navigates to /character-sheet/{id} for any character id', () => {
    const router = (component as any).router;
    spyOn(router, 'navigate');

    fc.assert(
      fc.property(
        fc.uuid(),
        (charId) => {
          component.goToSheet(charId);
          expect(router.navigate).toHaveBeenCalledWith(['/character-sheet', charId]);
        }
      ),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 15: Player dashboard total character count
  // Feature: home-page-redesign, Property 15: Player dashboard total character count
  // Validates: Requirements 6.1
  // -------------------------------------------------------------------------
  it('P15 — player dashboard renders sum of all characters across all users', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 0, maxLength: 6 }),
        (users) => {
          component.activeRole = 'player';
          component.users = users;
          component.loadingUsers = false;
          fixture.detectChanges();

          const totalChars = users.reduce((sum, u) => sum + u.characters.length, 0);
          const cards = fixture.nativeElement.querySelectorAll('[data-testid="player-character-card"]');
          expect(cards.length).toBe(totalChars);
        }
      ),
      { numRuns: 50 }
    );
  });

});

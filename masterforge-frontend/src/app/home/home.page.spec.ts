import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import * as fc from 'fast-check';

import { HomePage } from './home.page';
import { ApiService, NextSessionDto, ActiveCampaignsDto, ActiveCharactersDto, PlayerCampaignSummary } from '../services/api';
import { RoleService } from '../services/role.service';
import { AuthService } from '../services/auth.service';

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
    'getUsers', 'getCampaigns', 'getDmCampaigns', 'getSessions', 'createCampaign', 'createSession', 'getPlayerCount',
    'getNextSession', 'getActiveCampaigns', 'getActiveCharacters', 'getPlayerCampaigns',
  ]);
  spy.getUsers.and.returnValue(of([]));
  spy.getCampaigns.and.returnValue(of([]));
  spy.getDmCampaigns.and.returnValue(of([]));
  spy.getSessions.and.returnValue(of([]));
  spy.createCampaign.and.returnValue(of({}));
  spy.createSession.and.returnValue(of({}));
  spy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));
  spy.getNextSession.and.returnValue(of({ nextSessionDate: null }));
  spy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 0 }));
  spy.getActiveCharacters.and.returnValue(of({ activeCharacters: 0 }));
  spy.getPlayerCampaigns.and.returnValue(of([]));
  return spy;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomePage — Property-Based Tests', () => {

  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let roleSubject: BehaviorSubject<'dm' | 'player'>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();
    roleSubject = new BehaviorSubject<'dm' | 'player'>('dm');

    const roleServiceMock = {
      activeRole$: roleSubject.asObservable(),
      menuItems$: of([]),
      toggleRole: () => roleSubject.next(roleSubject.value === 'dm' ? 'player' : 'dm'),
    };

    const authServiceMock = {
      getCurrentUser: () => ({ id: 'user-1', name: 'Test User' }),
      getUserIdFromToken: () => 'user-1',
      logout: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: RoleService, useValue: roleServiceMock },
        { provide: AuthService, useValue: authServiceMock },
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
          roleSubject.next(role);
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
          roleSubject.next('dm');
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
          component.newCampaign = { name, description, maxPlayers: 1, joinPrice: 0, visibility: 'PRIVATE' };
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
          component.newCampaign = { name: blankName, description: '', maxPlayers: 1, joinPrice: 0, visibility: 'PRIVATE' };
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
          apiSpy.getDmCampaigns.calls.reset();
          component.users = [{ id: 'user-1' }];
          component.showNewCampaignForm = true;
          component.newCampaign = { name, description: '', maxPlayers: 1, joinPrice: 0, visibility: 'PRIVATE' };
          const callsBefore = apiSpy.getDmCampaigns.calls.count();
          component.submitCampaign();
          expect(component.showNewCampaignForm).toBeFalse();
          expect(apiSpy.getDmCampaigns.calls.count()).toBeGreaterThan(callsBefore);
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

  it('P11b — GET /api/campaigns/my error sets errorCampaigns and clears loadingCampaigns', () => {
    apiSpy.getDmCampaigns.and.returnValue(throwError(() => new Error('campaigns error')));
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
          component.newCampaign = { name, description: '', maxPlayers: 1, joinPrice: 0, visibility: 'PRIVATE' };
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
    roleSubject.next('dm');
    component.loadingCampaigns = true;
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('[data-testid="dm-dashboard"] ion-spinner');
    expect(spinner).toBeTruthy();
  });

  it('P12b — when all loading flags are false and no errors, no spinners are present', () => {
    roleSubject.next('dm');
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
  // Property 15: Player dashboard campaign list count
  // Feature: home-page-redesign, Property 15: Player dashboard campaign list count
  // Validates: Requirements 6.1
  // -------------------------------------------------------------------------
  it('P15 — player dashboard renders the correct number of player campaign items', () => {
    const playerCampaignArb = fc.record({
      campaignId: fc.uuid(),
      campaignName: fc.string({ minLength: 1, maxLength: 40 }),
      dmName: fc.string({ minLength: 1, maxLength: 30 }),
      nextSessionDate: fc.oneof(
        fc.constant(null),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString())
      ),
    });

    fc.assert(
      fc.property(
        fc.array(playerCampaignArb, { minLength: 0, maxLength: 6 }),
        (campaigns) => {
          roleSubject.next('player');
          component.playerCampaigns = campaigns;
          component.loadingPlayerCampaigns = false;
          component.errorPlayerCampaigns = null;
          fixture.detectChanges();

          const items = fixture.nativeElement.querySelectorAll('[data-testid="player-campaign-item"]');
          expect(items.length).toBe(campaigns.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Player Summary Cards — Unit Tests (Task 6.1)
  // Feature: player-summary-cards
  // =========================================================================

  // -------------------------------------------------------------------------
  // Loading state: loadingPlayerSummary = true → each card value shows '...'
  // Validates: Requirements 3.2
  // -------------------------------------------------------------------------
  it('PSC-1 — loadingPlayerSummary=true sets loading flag before API resolves', () => {
    // Use a Subject so we control when the observable emits
    const subject = new Subject<any>();
    apiSpy.getNextSession.and.returnValue(subject.asObservable());
    apiSpy.getActiveCampaigns.and.returnValue(subject.asObservable());
    apiSpy.getActiveCharacters.and.returnValue(subject.asObservable());

    component.loadingPlayerSummary = false;
    component.loadPlayerSummary();

    expect(component.loadingPlayerSummary).toBeTrue();
  });

  // -------------------------------------------------------------------------
  // Error state: any API call errors → errorPlayerSummary set, view does not throw
  // Validates: Requirements 3.3
  // -------------------------------------------------------------------------
  it('PSC-2 — error in any forkJoin call sets errorPlayerSummary and clears loading', () => {
    apiSpy.getNextSession.and.returnValue(throwError(() => new Error('network error')));
    apiSpy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 2 }));
    apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: 1 }));

    component.loadPlayerSummary();

    expect(component.loadingPlayerSummary).toBeFalse();
    expect(component.errorPlayerSummary).toBeTruthy();
  });

  it('PSC-2b — error in getActiveCampaigns sets errorPlayerSummary', () => {
    apiSpy.getNextSession.and.returnValue(of({ nextSessionDate: null }));
    apiSpy.getActiveCampaigns.and.returnValue(throwError(() => new Error('campaigns error')));
    apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: 1 }));

    component.loadPlayerSummary();

    expect(component.loadingPlayerSummary).toBeFalse();
    expect(component.errorPlayerSummary).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Null date: nextSessionDate = null → getter returns 'Sin sesiones'
  // Validates: Requirements 3.4
  // -------------------------------------------------------------------------
  it('PSC-3 — nextPlayerSessionLabel returns "Sin sesiones" when nextSessionDate is null', () => {
    component.nextSession = { nextSessionDate: null };
    expect(component.nextPlayerSessionLabel).toBe('Sin sesiones');
  });

  it('PSC-3b — nextPlayerSessionLabel returns "Sin sesiones" when nextSession is null', () => {
    component.nextSession = null;
    expect(component.nextPlayerSessionLabel).toBe('Sin sesiones');
  });

  it('PSC-3c — nextPlayerSessionLabel returns "Sin sesiones" for invalid date string', () => {
    component.nextSession = { nextSessionDate: 'not-a-date' };
    expect(component.nextPlayerSessionLabel).toBe('Sin sesiones');
  });

  // -------------------------------------------------------------------------
  // Success: all three values populated correctly
  // Validates: Requirements 3.5
  // -------------------------------------------------------------------------
  it('PSC-4 — success populates all three state fields and clears loading/error', () => {
    const nextSessionDto: NextSessionDto = { nextSessionDate: '2025-09-15T18:00:00.000Z' };
    const activeCampaignsDto: ActiveCampaignsDto = { activeCampaigns: 3 };
    const activeCharactersDto: ActiveCharactersDto = { activeCharacters: 2 };

    apiSpy.getNextSession.and.returnValue(of(nextSessionDto));
    apiSpy.getActiveCampaigns.and.returnValue(of(activeCampaignsDto));
    apiSpy.getActiveCharacters.and.returnValue(of(activeCharactersDto));

    component.loadPlayerSummary();

    expect(component.loadingPlayerSummary).toBeFalse();
    expect(component.errorPlayerSummary).toBeNull();
    expect(component.nextSession).toEqual(nextSessionDto);
    expect(component.activeCampaigns).toEqual(activeCampaignsDto);
    expect(component.activeCharacters).toEqual(activeCharactersDto);
  });

  it('PSC-4b — nextPlayerSessionLabel formats a valid ISO date correctly', () => {
    component.nextSession = { nextSessionDate: '2025-09-15T18:00:00.000Z' };
    const label = component.nextPlayerSessionLabel;
    expect(label).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  // =========================================================================
  // Property 5: formatDate produces DD/MM/YYYY HH:mm for any valid ISO 8601 input
  // Feature: player-summary-cards, Property 5: formatDate produces DD/MM/YYYY HH:mm for any valid ISO 8601 input
  // Validates: Requirements 4.1, 4.2, 4.3
  // =========================================================================
  it('PSC-P5 — formatDate produces DD/MM/YYYY HH:mm for any valid ISO 8601 input', () => {
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

  it('PSC-P5b — nextPlayerSessionLabel returns "Sin sesiones" for invalid/unparseable strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-a-date'),
          fc.constant('2025-99-99T99:99:99Z'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => isNaN(new Date(s).getTime()))
        ),
        (invalidDate) => {
          component.nextSession = { nextSessionDate: invalidDate };
          expect(component.nextPlayerSessionLabel).toBe('Sin sesiones');
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Property 1: Player role renders exactly 3 structured summary cards
  // Feature: player-summary-cards, Property 1: player role renders exactly 3 structured summary cards
  // Validates: Requirements 1.1, 1.6, 1.7
  // =========================================================================
  it('PSC-P1 — player role renders exactly 3 structured summary cards', () => {
    const nextSessionArb = fc.oneof(
      fc.constant<NextSessionDto>({ nextSessionDate: null }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
        .filter(d => !isNaN(d.getTime()))
        .map(d => ({ nextSessionDate: d.toISOString() }))
    );
    const activeCampaignsArb = fc.integer({ min: 0, max: 20 })
      .map(n => ({ activeCampaigns: n }));
    const activeCharactersArb = fc.integer({ min: 0, max: 20 })
      .map(n => ({ activeCharacters: n }));

    fc.assert(
      fc.property(
        nextSessionArb,
        activeCampaignsArb,
        activeCharactersArb,
        (nextSession, activeCampaigns, activeCharacters) => {
          roleSubject.next('player');
          component.nextSession = nextSession;
          component.activeCampaigns = activeCampaigns;
          component.activeCharacters = activeCharacters;
          component.loadingPlayerSummary = false;
          component.errorPlayerSummary = null;
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          const playerDashboard = el.querySelector('[data-testid="player-dashboard"]');
          expect(playerDashboard).toBeTruthy();

          const summaryRow = playerDashboard!.querySelector('[data-testid="player-summary-row"]');
          expect(summaryRow).toBeTruthy();

          const cards = summaryRow!.querySelectorAll('.summary-card');
          expect(cards.length).toBe(3);

          cards.forEach(card => {
            expect(card.querySelector('.summary-label')).toBeTruthy();
            expect(card.querySelector('.summary-value')).toBeTruthy();
            expect(card.querySelector('.summary-link')).toBeTruthy();
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Property 2: DM role renders zero player summary cards
  // Feature: player-summary-cards, Property 2: DM role renders zero player summary cards
  // Validates: Requirements 1.2
  // =========================================================================
  it('PSC-P2 — DM role renders zero player summary cards', () => {
    const nextSessionArb = fc.oneof(
      fc.constant<NextSessionDto>({ nextSessionDate: null }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
        .filter(d => !isNaN(d.getTime()))
        .map(d => ({ nextSessionDate: d.toISOString() }))
    );
    const activeCampaignsArb = fc.integer({ min: 0, max: 20 })
      .map(n => ({ activeCampaigns: n }));
    const activeCharactersArb = fc.integer({ min: 0, max: 20 })
      .map(n => ({ activeCharacters: n }));

    fc.assert(
      fc.property(
        nextSessionArb,
        activeCampaignsArb,
        activeCharactersArb,
        (nextSession, activeCampaigns, activeCharacters) => {
          roleSubject.next('dm');
          component.nextSession = nextSession;
          component.activeCampaigns = activeCampaigns;
          component.activeCharacters = activeCharacters;
          component.loadingPlayerSummary = false;
          component.errorPlayerSummary = null;
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          const playerSummaryRow = el.querySelector('[data-testid="player-summary-row"]');
          expect(playerSummaryRow).toBeNull();

          const playerCards = el.querySelectorAll('[data-testid="player-summary-row"] .summary-card');
          expect(playerCards.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Property 3: Each card renders its label and value from fetched data
  // Feature: player-summary-cards, Property 3: each card renders its label and value from fetched data
  // Validates: Requirements 1.3, 1.4, 1.5, 3.4, 3.5
  // =========================================================================
  it('PSC-P3 — each card renders its label and value from fetched data', () => {
    const nextSessionArb = fc.oneof(
      fc.constant<NextSessionDto>({ nextSessionDate: null }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
        .filter(d => !isNaN(d.getTime()))
        .map(d => ({ nextSessionDate: d.toISOString() }))
    );
    const activeCampaignsArb = fc.integer({ min: 0, max: 100 })
      .map(n => ({ activeCampaigns: n }));
    const activeCharactersArb = fc.integer({ min: 0, max: 100 })
      .map(n => ({ activeCharacters: n }));

    fc.assert(
      fc.property(
        nextSessionArb,
        activeCampaignsArb,
        activeCharactersArb,
        (nextSession, activeCampaigns, activeCharacters) => {
          roleSubject.next('player');
          component.nextSession = nextSession;
          component.activeCampaigns = activeCampaigns;
          component.activeCharacters = activeCharacters;
          component.loadingPlayerSummary = false;
          component.errorPlayerSummary = null;
          fixture.detectChanges();

          const el: HTMLElement = fixture.nativeElement;
          const summaryRow = el.querySelector('[data-testid="player-summary-row"]');
          expect(summaryRow).toBeTruthy();

          const cards = summaryRow!.querySelectorAll('.summary-card');
          expect(cards.length).toBe(3);

          // Card 0: Próxima Sesión
          const card0Label = cards[0].querySelector('.summary-label')!.textContent?.trim();
          const card0Value = cards[0].querySelector('.summary-value')!.textContent?.trim();
          expect(card0Label).toBe('Próxima Sesión');
          if (nextSession.nextSessionDate === null) {
            expect(card0Value).toBe('Sin sesiones');
          } else {
            expect(card0Value).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
          }

          // Card 1: Campañas Activas
          const card1Label = cards[1].querySelector('.summary-label')!.textContent?.trim();
          const card1Value = cards[1].querySelector('.summary-value')!.textContent?.trim();
          expect(card1Label).toBe('Campañas Activas');
          expect(card1Value).toBe(String(activeCampaigns.activeCampaigns));

          // Card 2: Aventureros Activos
          const card2Label = cards[2].querySelector('.summary-label')!.textContent?.trim();
          const card2Value = cards[2].querySelector('.summary-value')!.textContent?.trim();
          expect(card2Label).toBe('Aventureros Activos');
          expect(card2Value).toBe(String(activeCharacters.activeCharacters));
        }
      ),
      { numRuns: 100 }
    );
  });

  // =========================================================================
  // Task 5 — loadPlayerCampaigns() state management (Req 4.1, 4.2, 4.3)
  // =========================================================================

  // -------------------------------------------------------------------------
  // Req 4.1: loadingPlayerCampaigns = true while API is in flight
  // -------------------------------------------------------------------------
  it('PCL-1 — loadPlayerCampaigns sets loadingPlayerCampaigns=true before API resolves', () => {
    const subject = new Subject<PlayerCampaignSummary[]>();
    apiSpy.getPlayerCampaigns.and.returnValue(subject.asObservable());

    component.loadingPlayerCampaigns = false;
    component.loadPlayerCampaigns();

    expect(component.loadingPlayerCampaigns).toBeTrue();
  });

  // -------------------------------------------------------------------------
  // Req 4.1: loadingPlayerCampaigns = false after API resolves successfully
  // -------------------------------------------------------------------------
  it('PCL-2 — loadPlayerCampaigns clears loadingPlayerCampaigns and populates playerCampaigns on success', () => {
    const campaigns: PlayerCampaignSummary[] = [
      { campaignId: 'c1', campaignName: 'Campaign One', dmName: 'DM Alice', nextSessionDate: '2025-10-01T18:00:00Z' },
      { campaignId: 'c2', campaignName: 'Campaign Two', dmName: 'DM Bob', nextSessionDate: null },
    ];
    apiSpy.getPlayerCampaigns.and.returnValue(of(campaigns));

    component.loadPlayerCampaigns();

    expect(component.loadingPlayerCampaigns).toBeFalse();
    expect(component.errorPlayerCampaigns).toBeNull();
    expect(component.playerCampaigns).toEqual(campaigns);
  });

  // -------------------------------------------------------------------------
  // Req 4.2: errorPlayerCampaigns is set and loading cleared on API error
  // -------------------------------------------------------------------------
  it('PCL-3 — loadPlayerCampaigns sets errorPlayerCampaigns and clears loading on error', () => {
    apiSpy.getPlayerCampaigns.and.returnValue(throwError(() => new Error('network error')));

    component.loadPlayerCampaigns();

    expect(component.loadingPlayerCampaigns).toBeFalse();
    expect(component.errorPlayerCampaigns).toBeTruthy();
    expect(component.playerCampaigns).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Req 4.3: error in loadPlayerCampaigns does NOT affect loadPlayerSummary state
  // -------------------------------------------------------------------------
  it('PCL-4 — error in loadPlayerCampaigns does not affect player summary state', () => {
    const nextSessionDto: NextSessionDto = { nextSessionDate: '2025-09-15T18:00:00.000Z' };
    const activeCampaignsDto: ActiveCampaignsDto = { activeCampaigns: 3 };
    const activeCharactersDto: ActiveCharactersDto = { activeCharacters: 2 };

    apiSpy.getNextSession.and.returnValue(of(nextSessionDto));
    apiSpy.getActiveCampaigns.and.returnValue(of(activeCampaignsDto));
    apiSpy.getActiveCharacters.and.returnValue(of(activeCharactersDto));
    apiSpy.getPlayerCampaigns.and.returnValue(throwError(() => new Error('campaigns error')));

    component.loadPlayerSummary();
    component.loadPlayerCampaigns();

    // Summary state is intact
    expect(component.loadingPlayerSummary).toBeFalse();
    expect(component.errorPlayerSummary).toBeNull();
    expect(component.nextSession).toEqual(nextSessionDto);
    expect(component.activeCampaigns).toEqual(activeCampaignsDto);
    expect(component.activeCharacters).toEqual(activeCharactersDto);

    // Campaign list state reflects the error
    expect(component.errorPlayerCampaigns).toBeTruthy();
    expect(component.loadingPlayerCampaigns).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // Req 4.3: error in loadPlayerSummary does NOT affect loadPlayerCampaigns state
  // -------------------------------------------------------------------------
  it('PCL-5 — error in loadPlayerSummary does not affect player campaign list state', () => {
    const campaigns: PlayerCampaignSummary[] = [
      { campaignId: 'c1', campaignName: 'Campaign One', dmName: 'DM Alice', nextSessionDate: null },
    ];

    apiSpy.getNextSession.and.returnValue(throwError(() => new Error('summary error')));
    apiSpy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 0 }));
    apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: 0 }));
    apiSpy.getPlayerCampaigns.and.returnValue(of(campaigns));

    component.loadPlayerSummary();
    component.loadPlayerCampaigns();

    // Summary state reflects the error
    expect(component.errorPlayerSummary).toBeTruthy();
    expect(component.loadingPlayerSummary).toBeFalse();

    // Campaign list state is intact
    expect(component.errorPlayerCampaigns).toBeNull();
    expect(component.loadingPlayerCampaigns).toBeFalse();
    expect(component.playerCampaigns).toEqual(campaigns);
  });

  // -------------------------------------------------------------------------
  // Req 4.3: ngOnInit calls both loaders independently
  // -------------------------------------------------------------------------
  it('PCL-6 — ngOnInit calls loadPlayerCampaigns independently from loadPlayerSummary', () => {
    // Both should have been called during beforeEach fixture.detectChanges() → ngOnInit
    expect(apiSpy.getPlayerCampaigns).toHaveBeenCalled();
    expect(apiSpy.getNextSession).toHaveBeenCalled();
    expect(apiSpy.getActiveCampaigns).toHaveBeenCalled();
    expect(apiSpy.getActiveCharacters).toHaveBeenCalled();
  });

  // =========================================================================
  // Task 6 — Campaign_List HTML rendering tests
  // =========================================================================

  // -------------------------------------------------------------------------
  // Property 1: El número de ítems renderizados coincide con la longitud de la lista de la API
  // Feature: player-campaign-list, Property 1: rendered item count equals API list length
  // Validates: Requirement 1.3
  // -------------------------------------------------------------------------
  it('PCL-P1 — for any N player campaigns, exactly N campaign items are rendered', () => {
    const playerCampaignArb = fc.record({
      campaignId: fc.uuid(),
      campaignName: fc.string({ minLength: 1, maxLength: 40 }),
      dmName: fc.string({ minLength: 1, maxLength: 30 }),
      nextSessionDate: fc.oneof(
        fc.constant(null),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString())
      ),
    });

    fc.assert(
      fc.property(
        fc.array(playerCampaignArb, { minLength: 1, maxLength: 10 }),
        (campaigns) => {
          roleSubject.next('player');
          component.playerCampaigns = campaigns;
          component.loadingPlayerCampaigns = false;
          component.errorPlayerCampaigns = null;
          fixture.detectChanges();

          const items = fixture.nativeElement.querySelectorAll('[data-testid="player-campaign-item"]');
          expect(items.length).toBe(campaigns.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Cada ítem renderizado contiene todos los campos y clases requeridos
  // Feature: player-campaign-list, Property 2: each item renders all required fields and CSS classes
  // Validates: Requirements 2.1, 2.2, 2.5, 2.6
  // -------------------------------------------------------------------------
  it('PCL-P2 — each rendered item contains all required fields and CSS classes', () => {
    const playerCampaignArb = fc.record({
      campaignId: fc.uuid(),
      campaignName: fc.string({ minLength: 1, maxLength: 40 }),
      dmName: fc.string({ minLength: 1, maxLength: 30 }),
      nextSessionDate: fc.oneof(
        fc.constant(null),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString())
      ),
    });

    fc.assert(
      fc.property(
        fc.array(playerCampaignArb, { minLength: 1, maxLength: 5 }),
        (campaigns) => {
          roleSubject.next('player');
          component.playerCampaigns = campaigns;
          component.loadingPlayerCampaigns = false;
          component.errorPlayerCampaigns = null;
          fixture.detectChanges();

          const items = fixture.nativeElement.querySelectorAll('[data-testid="player-campaign-item"]');
          expect(items.length).toBe(campaigns.length);

          items.forEach((item: Element, index: number) => {
            const campaign = campaigns[index];

            // Req 2.5: skill-item and list-item-interactive classes on container
            expect(item.classList.contains('skill-item')).toBeTrue();
            expect(item.classList.contains('list-item-interactive')).toBeTrue();

            // Req 2.1: campaignName with gold-title class
            const goldTitle = item.querySelector('.gold-title');
            expect(goldTitle).toBeTruthy();
            expect(goldTitle!.textContent?.trim()).toBe(campaign.campaignName.trim());

            // Req 2.2: dmName with text-muted class
            const dmLabel = item.querySelector('ion-label .text-muted');
            expect(dmLabel).toBeTruthy();
            expect(dmLabel!.textContent?.trim()).toBe(campaign.dmName.trim());

            // Req 2.6: [Ver] link with view-link class
            const viewLink = item.querySelector('.view-link');
            expect(viewLink).toBeTruthy();
            expect(viewLink!.textContent?.trim()).toBe('[Ver]');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: El formateador produce siempre el patrón DD/MM/YYYY HH:mm
  // Feature: player-campaign-list, Property 3: date formatter always produces DD/MM/YYYY HH:mm pattern
  // Validates: Requirement 2.3
  // -------------------------------------------------------------------------
  it('PCL-P3 — formatDate always produces DD/MM/YYYY HH:mm pattern for any valid ISO timestamp', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (date) => {
          const iso = date.toISOString();
          const result = component.formatDate(iso);

          // Must match DD/MM/YYYY HH:mm pattern
          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);

          // Verify each component matches the original date
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

  // =========================================================================
  // Task 6.5 — Unit tests for Campaign_List states
  // =========================================================================

  // -------------------------------------------------------------------------
  // Req 4.1: loadingPlayerCampaigns = true → ion-spinner visible
  // -------------------------------------------------------------------------
  it('PCL-U1 — loadingPlayerCampaigns=true shows ion-spinner in player view', () => {
    roleSubject.next('player');
    component.loadingPlayerCampaigns = true;
    component.errorPlayerCampaigns = null;
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('[data-testid="player-campaigns-spinner"]');
    expect(spinner).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Req 4.2: errorPlayerCampaigns set → error message visible
  // -------------------------------------------------------------------------
  it('PCL-U2 — errorPlayerCampaigns set shows error message with text-muted class', () => {
    roleSubject.next('player');
    component.loadingPlayerCampaigns = false;
    component.errorPlayerCampaigns = 'Error al cargar campañas';
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="player-campaigns-error"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl.classList.contains('text-muted')).toBeTrue();
    expect(errorEl.textContent?.trim()).toBe('Error al cargar campañas');
  });

  // -------------------------------------------------------------------------
  // Req 1.4: empty list → "No estás inscrito..." message visible
  // -------------------------------------------------------------------------
  it('PCL-U3 — empty playerCampaigns shows "No estás inscrito en ninguna campaña activa." with text-muted', () => {
    roleSubject.next('player');
    component.loadingPlayerCampaigns = false;
    component.errorPlayerCampaigns = null;
    component.playerCampaigns = [];
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="player-campaigns-empty"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.classList.contains('text-muted')).toBeTrue();
    expect(emptyEl.textContent?.trim()).toBe('No estás inscrito en ninguna campaña activa.');
  });

  // -------------------------------------------------------------------------
  // Req 4.3: error in getPlayerCampaigns() does not affect summary cards
  // -------------------------------------------------------------------------
  it('PCL-U4 — error in getPlayerCampaigns does not affect summary cards visibility', () => {
    const nextSessionDto: NextSessionDto = { nextSessionDate: '2025-09-15T18:00:00.000Z' };
    const activeCampaignsDto: ActiveCampaignsDto = { activeCampaigns: 3 };
    const activeCharactersDto: ActiveCharactersDto = { activeCharacters: 2 };

    apiSpy.getNextSession.and.returnValue(of(nextSessionDto));
    apiSpy.getActiveCampaigns.and.returnValue(of(activeCampaignsDto));
    apiSpy.getActiveCharacters.and.returnValue(of(activeCharactersDto));
    apiSpy.getPlayerCampaigns.and.returnValue(throwError(() => new Error('campaigns error')));

    component.loadPlayerSummary();
    component.loadPlayerCampaigns();

    roleSubject.next('player');
    component.loadingPlayerSummary = false;
    component.errorPlayerSummary = null;
    fixture.detectChanges();

    // Summary cards are still visible
    const summaryRow = fixture.nativeElement.querySelector('[data-testid="player-summary-row"]');
    expect(summaryRow).toBeTruthy();
    const cards = summaryRow.querySelectorAll('.summary-card');
    expect(cards.length).toBe(3);

    // Campaign list shows error
    const errorEl = fixture.nativeElement.querySelector('[data-testid="player-campaigns-error"]');
    expect(errorEl).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Req 2.4: nextSessionDate: null → shows "Sin sesiones" with text-muted
  // -------------------------------------------------------------------------
  it('PCL-U5 — nextSessionDate null renders "Sin sesiones" with text-muted class', () => {
    roleSubject.next('player');
    component.loadingPlayerCampaigns = false;
    component.errorPlayerCampaigns = null;
    component.playerCampaigns = [
      { campaignId: 'c1', campaignName: 'Test Campaign', dmName: 'DM Test', nextSessionDate: null },
    ];
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('[data-testid="player-campaign-item"]');
    expect(item).toBeTruthy();

    const sinSesiones = item.querySelector('.text-muted');
    // Find the "Sin sesiones" span specifically (not the dmName one)
    const allMuted = item.querySelectorAll('.text-muted');
    const sinSesionesEl = Array.from(allMuted).find(
      (el: any) => el.textContent?.trim() === 'Sin sesiones'
    );
    expect(sinSesionesEl).toBeTruthy();
  });

});

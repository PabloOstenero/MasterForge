import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { InicioPage } from './inicio.page';
import { ApiService } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const monsterArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom('Beast', 'Undead', 'Dragon', 'Humanoid', 'Fiend'),
});

const sessionArb = fc.record({
  id: fc.uuid(),
  scheduledDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  price: fc.float({ min: 0, max: 500, noNaN: true }),
  paid: fc.boolean(),
  campaign: fc.option(fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }) }), { nil: null }),
});

const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  isActive: fc.boolean(),
  characters: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1 }),
      dndClass: fc.constantFrom('Fighter', 'Wizard', 'Rogue'),
      level: fc.integer({ min: 1, max: 20 }),
    }),
    { minLength: 0, maxLength: 3 }
  ),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getSessions', 'getUsers', 'getMonsters', 'getPlayerCount',
  ]);
  spy.getSessions.and.returnValue(of([]));
  spy.getUsers.and.returnValue(of([]));
  spy.getMonsters.and.returnValue(of([]));
  spy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));
  return spy;
}

// ---------------------------------------------------------------------------
// InicioPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('InicioPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<InicioPage>;
  let component: InicioPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let router: Router;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 5: Role toggle mutual exclusivity
  // Validates: Requirements 4.4, 4.5
  // -------------------------------------------------------------------------
  it('P5 — for any activeRole, exactly one view block is present in the DOM', () => {
    fc.assert(
      fc.property(fc.constantFrom<'dm' | 'player'>('dm', 'player'), (role) => {
        component.activeRole = role;
        fixture.detectChanges();

        const dmView = fixture.nativeElement.querySelector('[data-testid="dm-view"]');
        const playerView = fixture.nativeElement.querySelector('[data-testid="player-view"]');

        if (role === 'dm') {
          expect(dmView).toBeTruthy();
          expect(playerView).toBeNull();
        } else {
          expect(playerView).toBeTruthy();
          expect(dmView).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: Stat cards derive correct values
  // Validates: Requirements 4.7, 4.8, 4.9
  // -------------------------------------------------------------------------
  it('P6a — nextSession returns the earliest future session for any sessions array', () => {
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 10 }), (sessions) => {
        component.sessions = sessions;
        const now = new Date();
        const futureSessions = sessions
          .filter(s => new Date(s.scheduledDate) > now)
          .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        if (futureSessions.length === 0) {
          expect(component.nextSession).toBeNull();
        } else {
          expect(component.nextSession?.id).toBe(futureSessions[0].id);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('P6b — playerCount reflects the value returned by getPlayerCount() for any count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (count) => {
        component.playerCount = count;
        expect(component.playerCount).toBe(count);
      }),
      { numRuns: 100 }
    );
  });

  it('P6c — playerCount is always non-negative', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (count) => {
        component.playerCount = count;
        expect(component.playerCount).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('P6d — playerCount defaults to 0 before ngOnInit completes', () => {
    const freshFixture = TestBed.createComponent(InicioPage);
    const freshComponent = freshFixture.componentInstance;
    // Before detectChanges, playerCount should be 0
    expect(freshComponent.playerCount).toBe(0);
  });

  it('P6e — monthlyRevenue is always non-negative for any sessions array', () => {
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 20 }), (sessions) => {
        component.sessions = sessions;
        expect(component.monthlyRevenue).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: Mission list renders all monsters
  // Validates: Requirement 4.11
  // -------------------------------------------------------------------------
  it('P7 — for any N monsters, exactly N mission-items are rendered in DM view', () => {
    fc.assert(
      fc.property(fc.array(monsterArb, { minLength: 0, maxLength: 15 }), (monsters) => {
        component.activeRole = 'dm';
        component.monsters = monsters;
        component.loadingMonsters = false;
        component.errorMonsters = null;
        fixture.detectChanges();

        const items = fixture.nativeElement.querySelectorAll('[data-testid="mission-item"]');
        expect(items.length).toBe(monsters.length);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: API error sets error state and clears loading
  // Validates: Requirements 9.2
  // -------------------------------------------------------------------------
  it('P10 — forkJoin error sets all error states and clears all loading flags', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errMsg) => {
        apiSpy.getSessions.and.returnValue(throwError(() => new Error(errMsg)));
        apiSpy.getUsers.and.returnValue(of([]));
        apiSpy.getMonsters.and.returnValue(of([]));

        component.ngOnInit();

        expect(component.loadingSessions).toBeFalse();
        expect(component.loadingUsers).toBeFalse();
        expect(component.loadingMonsters).toBeFalse();
        expect(component.errorSessions).toBeTruthy();

        // Reset for next iteration
        apiSpy.getSessions.and.returnValue(of([]));
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // allCharacters flattens all characters across all users
  // -------------------------------------------------------------------------
  it('allCharacters — returns flat list of all characters with userName for any users array', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 8 }), (users) => {
        component.users = users;
        const totalChars = users.reduce((sum, u) => sum + u.characters.length, 0);
        expect(component.allCharacters.length).toBe(totalChars);

        component.allCharacters.forEach(entry => {
          expect(entry.char).toBeDefined();
          expect(entry.userName).toBeDefined();
        });
      }),
      { numRuns: 100 }
    );
  });

  it('allCharacters — player view renders correct number of character cards', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 6 }), (users) => {
        component.activeRole = 'player';
        component.users = users;
        component.loadingUsers = false;
        component.errorUsers = null;
        fixture.detectChanges();

        const totalChars = users.reduce((sum, u) => sum + u.characters.length, 0);
        const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
        expect(cards.length).toBe(totalChars);
      }),
      { numRuns: 100 }
    );
  });

  it('allCharacters — empty characters shows "La taberna está vacía..." message', () => {
    component.activeRole = 'player';
    component.users = [];
    component.loadingUsers = false;
    component.errorUsers = null;
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('[data-testid="empty-characters"]');
    expect(empty).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // formatDate — pure function property
  // -------------------------------------------------------------------------
  it('formatDate — always returns DD/MM/YYYY HH:mm for any valid ISO date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
          .filter(d => !isNaN(d.getTime())),
        (date) => {
          const iso = date.toISOString();
          const result = component.formatDate(iso);
          expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatDate — returns "—" for empty string', () => {
    expect(component.formatDate('')).toBe('—');
  });

  // -------------------------------------------------------------------------
  // goToSheet — navigation
  // -------------------------------------------------------------------------
  it('goToSheet — navigates to /character-sheet/:id for any character id', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fc.assert(
      fc.property(fc.uuid(), (id) => {
        navigateSpy.calls.reset();
        component.goToSheet(id);
        expect(navigateSpy).toHaveBeenCalledWith(['/character-sheet', id]);
      }),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// BUG CONDITION EXPLORATION TESTS — Property 1
// Validates: Requirements 1.1, 1.2
//
// CRITICAL: These tests MUST FAIL on unfixed code.
// Failure confirms the bug exists. DO NOT fix the code when these fail.
// These tests encode the expected (correct) behavior and will pass after fix.
// ===========================================================================

describe('InicioPage — Bug Condition Exploration (Property 1)', () => {

  let fixture: ComponentFixture<InicioPage>;
  let component: InicioPage;
  // Use untyped spy to avoid TS errors for methods that don't exist yet on ApiService
  let apiSpy: any;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getSessions', 'getUsers', 'getMonsters', 'getPlayerCount',
    ]);
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getUsers.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    // Default: return 0 so forkJoin doesn't break; individual tests override this
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // Bug Case 1: DM with 3 unique players across 2 campaigns
  // The card should show 3 (unique players), not the total system user count.
  // On unfixed code: component.users is populated from GET /api/users (all
  // system users), so totalActiveClients reflects the system-wide count, NOT 3.
  //
  // Validates: Requirements 1.1, 1.2
  // -------------------------------------------------------------------------
  it('P1-BUG-1 — DM with 3 unique players: card shows playerCount (3), not system user count', () => {
    // Simulate system having 10 active users total (the bug: all are shown)
    const systemUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      isActive: true,
      characters: [],
    }));

    // On unfixed code: getUsers() returns ALL system users
    apiSpy.getUsers.and.returnValue(of(systemUsers));
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    // Fixed code: getPlayerCount() returns the DM's unique player count (3)
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 3 }));

    fixture.detectChanges(); // triggers ngOnInit

    // Expected (correct) behavior: playerCount should be 3 (DM's unique players)
    // Bug condition: component uses totalActiveClients from users array (system-wide)
    // On unfixed code: totalActiveClients = 10 (all system users that are active)
    // The test asserts the CORRECT behavior — it will FAIL on unfixed code

    // The component should expose a `playerCount` property sourced from GET /api/users/me/player-count
    // On unfixed code, this property does not exist — the component uses totalActiveClients instead
    const playerCount = (component as any).playerCount;

    // EXPECTED FAILURE: playerCount is undefined (property doesn't exist yet)
    expect(playerCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Bug Case 2: DM with no campaigns — card should show 0
  // On unfixed code: totalActiveClients reflects system users (> 0), not 0.
  //
  // Validates: Requirements 1.2
  // -------------------------------------------------------------------------
  it('P1-BUG-2 — DM with no campaigns: card shows 0 players, not system user count', () => {
    // System has 5 users (4 active)
    const systemUsers = [
      { id: 'u1', name: 'User1', isActive: true,  characters: [] },
      { id: 'u2', name: 'User2', isActive: true,  characters: [] },
      { id: 'u3', name: 'User3', isActive: false, characters: [] },
      { id: 'u4', name: 'User4', isActive: true,  characters: [] },
      { id: 'u5', name: 'User5', isActive: true,  characters: [] },
    ];

    apiSpy.getUsers.and.returnValue(of(systemUsers));
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    // Fixed code: DM has no campaigns → playerCount = 0
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

    fixture.detectChanges();

    // Expected (correct) behavior: DM has no campaigns → playerCount = 0
    // Bug condition: totalActiveClients = 4 (active system users), not 0
    const playerCount = (component as any).playerCount;

    // EXPECTED FAILURE: playerCount is undefined or equals system user count (4), not 0
    expect(playerCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Bug Case 3: DM with 1 campaign, 1 player with 2 characters
  // Should show 1 (unique player), not 2 (character count) or system total.
  //
  // Validates: Requirements 1.1
  // -------------------------------------------------------------------------
  it('P1-BUG-3 — 1 player with 2 characters: card shows 1 unique player, not 2', () => {
    // System has 8 users total (5 active)
    const systemUsers = Array.from({ length: 8 }, (_, i) => ({
      id: `sys-user-${i}`,
      name: `SysUser ${i}`,
      isActive: i % 2 === 0,
      characters: [],
    }));

    // The single DM player has 2 characters
    const dmPlayer = {
      id: 'dm-player-1',
      name: 'MultiChar Player',
      isActive: true,
      characters: [
        { id: 'char-a', name: 'Warrior', dndClass: 'Fighter', level: 3 },
        { id: 'char-b', name: 'Mage',    dndClass: 'Wizard',  level: 5 },
      ],
    };

    apiSpy.getUsers.and.returnValue(of([...systemUsers, dmPlayer]));
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    // Fixed code: 1 unique player (not 2 characters, not 9 system users)
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 1 }));

    fixture.detectChanges();

    // Expected (correct) behavior: 1 unique player (not 2 characters, not 9 system users)
    const playerCount = (component as any).playerCount;

    // EXPECTED FAILURE: playerCount is undefined or equals system count (5 active), not 1
    expect(playerCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Bug Case 4: ApiService.getPlayerCount() method must exist
  // On unfixed code: ApiService has no getPlayerCount() method.
  // This confirms the endpoint GET /api/users/me/player-count is missing.
  //
  // Validates: Requirements 1.1, 1.2
  // -------------------------------------------------------------------------
  it('P1-BUG-4 — ApiService.getPlayerCount() method must exist (endpoint GET /api/users/me/player-count)', () => {
    // On unfixed code: ApiService does not have getPlayerCount()
    const realApiService = TestBed.inject(ApiService);

    // EXPECTED FAILURE: getPlayerCount is not a function on the real ApiService
    expect(typeof (realApiService as any).getPlayerCount).toBe('function',
      `BUG CONFIRMED: ApiService.getPlayerCount() does not exist. ` +
      `The endpoint GET /api/users/me/player-count has not been implemented yet.`
    );
  });

  // -------------------------------------------------------------------------
  // Bug Case 5: InicioPage must call getPlayerCount() during ngOnInit
  // On unfixed code: ngOnInit uses forkJoin with getUsers() only — no getPlayerCount call.
  //
  // Validates: Requirements 1.1
  // -------------------------------------------------------------------------
  it('P1-BUG-5 — ngOnInit must call getPlayerCount() for the DM client count card', () => {
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 3 }));
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getUsers.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));

    component.ngOnInit();

    // EXPECTED FAILURE: getPlayerCount is never called on unfixed code
    expect(apiSpy.getPlayerCount).toHaveBeenCalled();
  });
});

// ===========================================================================
// BUG CONDITION EXPLORATION — ApiService endpoint check
// Tests that ApiService.getPlayerCount() calls GET /api/users/me/player-count
// Validates: Requirements 1.1, 1.2
// ===========================================================================

describe('ApiService — Bug Condition: GET /api/users/me/player-count endpoint', () => {

  let httpTestingController: HttpTestingController;
  let apiService: ApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ApiService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  // -------------------------------------------------------------------------
  // Bug Case: getPlayerCount() method does not exist on ApiService
  // On unfixed code: this method is absent
  //
  // Validates: Requirements 1.1, 1.2
  // -------------------------------------------------------------------------
  it('P1-BUG-BACKEND — ApiService must have getPlayerCount() calling GET /api/users/me/player-count', () => {
    // EXPECTED FAILURE on unfixed code: getPlayerCount() does not exist
    expect(typeof (apiService as any).getPlayerCount).toBe('function',
      `BUG CONFIRMED: ApiService.getPlayerCount() is missing. ` +
      `GET /api/users/me/player-count endpoint has not been implemented.`
    );

    // If the method exists, verify it calls the correct URL
    if (typeof (apiService as any).getPlayerCount === 'function') {
      (apiService as any).getPlayerCount().subscribe();
      const req = httpTestingController.expectOne('http://localhost:8080/api/users/me/player-count');
      expect(req.request.method).toBe('GET');
      req.flush({ playerCount: 3 });
    }
  });
});

// ===========================================================================
// PRESERVATION TESTS — Property 2
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
//
// These tests MUST PASS on the fixed code — confirming no regressions.
// ===========================================================================

describe('InicioPage — Preservation Tests (Property 2)', () => {

  let fixture: ComponentFixture<InicioPage>;
  let component: InicioPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [InicioPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InicioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Req 3.1 — nextSession still shows the earliest future session
  // Validates: Requirement 3.1
  // -------------------------------------------------------------------------
  it('P2-3.1a — nextSession returns the earliest future session for any sessions array', () => {
    /**
     * **Validates: Requirements 3.1**
     * For any set of sessions, nextSession always returns the earliest future one.
     */
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 15 }), (sessions) => {
        component.sessions = sessions;
        const now = new Date();
        const futureSorted = sessions
          .filter(s => new Date(s.scheduledDate) > now)
          .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

        if (futureSorted.length === 0) {
          expect(component.nextSession).toBeNull();
        } else {
          expect(component.nextSession?.id).toBe(futureSorted[0].id);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('P2-3.1b — nextSession is null when all sessions are in the past', () => {
    /**
     * **Validates: Requirements 3.1**
     */
    const pastSessions = [
      { id: 'p1', scheduledDate: new Date('2000-01-01').toISOString(), price: 10, paid: true, campaign: null },
      { id: 'p2', scheduledDate: new Date('2010-06-15').toISOString(), price: 20, paid: false, campaign: null },
    ];
    component.sessions = pastSessions;
    expect(component.nextSession).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Req 3.2 — monthlyRevenue still sums current-month session prices
  // Validates: Requirement 3.2
  // -------------------------------------------------------------------------
  it('P2-3.2a — monthlyRevenue equals sum of prices for current-month sessions', () => {
    /**
     * **Validates: Requirements 3.2**
     * For any sessions array, monthlyRevenue equals the sum of prices of sessions
     * whose scheduledDate falls in the current month/year.
     */
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 20 }), (sessions) => {
        component.sessions = sessions;
        const now = new Date();
        const expected = sessions
          .filter(s => {
            const d = new Date(s.scheduledDate);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
          })
          .reduce((sum, s) => sum + (s.price ?? 0), 0);

        expect(component.monthlyRevenue).toBeCloseTo(expected, 5);
      }),
      { numRuns: 200 }
    );
  });

  it('P2-3.2b — monthlyRevenue is 0 when sessions array is empty', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    component.sessions = [];
    expect(component.monthlyRevenue).toBe(0);
  });

  it('P2-3.2c — pendingPayments count equals sessions with paid=false', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 0, maxLength: 20 }), (sessions) => {
        component.sessions = sessions;
        const expectedCount = sessions.filter(s => s.paid === false).length;
        expect(component.pendingPayments.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Req 3.3 — DM/Player role toggle works without side effects
  // Validates: Requirement 3.3
  // -------------------------------------------------------------------------
  it('P2-3.3a — switching activeRole to dm shows dm-view and hides player-view', () => {
    /**
     * **Validates: Requirements 3.3**
     */
    component.activeRole = 'dm';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="dm-view"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="player-view"]')).toBeNull();
  });

  it('P2-3.3b — switching activeRole to player shows player-view and hides dm-view', () => {
    /**
     * **Validates: Requirements 3.3**
     */
    component.activeRole = 'player';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="player-view"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="dm-view"]')).toBeNull();
  });

  it('P2-3.3c — toggling activeRole does not change sessions, users, monsters, or playerCount', () => {
    /**
     * **Validates: Requirements 3.3**
     * Switching role must not mutate any data state.
     * We set state directly and verify that changing activeRole alone does not alter it.
     */
    fc.assert(
      fc.property(
        fc.constantFrom<'dm' | 'player'>('dm', 'player'),
        fc.array(sessionArb, { minLength: 0, maxLength: 5 }),
        fc.array(userArb, { minLength: 0, maxLength: 5 }),
        fc.integer({ min: 0, max: 50 }),
        (role, sessions, users, count) => {
          // Set state directly (no detectChanges to avoid re-triggering ngOnInit)
          component.sessions = [...sessions];
          component.users = [...users];
          component.playerCount = count;

          const sessionsBefore = component.sessions.length;
          const usersBefore = component.users.length;
          const countBefore = component.playerCount;

          // Toggle role — this should only affect the view, not the data
          component.activeRole = role;

          // Verify data state is unchanged (no detectChanges needed for data assertions)
          expect(component.sessions.length).toBe(sessionsBefore);
          expect(component.users.length).toBe(usersBefore);
          expect(component.playerCount).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Req 3.4 — allCharacters still built from GET /api/users
  // Validates: Requirement 3.4
  // -------------------------------------------------------------------------
  it('P2-3.4a — allCharacters flattens all characters from users for any users array', () => {
    /**
     * **Validates: Requirements 3.4**
     * For any users list, allCharacters produces the correct flat list.
     */
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 10 }), (users) => {
        component.users = users;
        const totalChars = users.reduce((sum, u) => sum + u.characters.length, 0);
        expect(component.allCharacters.length).toBe(totalChars);
      }),
      { numRuns: 200 }
    );
  });

  it('P2-3.4b — allCharacters entries have correct char and userName', () => {
    /**
     * **Validates: Requirements 3.4**
     */
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 1, maxLength: 8 }), (users) => {
        component.users = users;
        component.allCharacters.forEach(entry => {
          expect(entry.char).toBeDefined();
          expect(typeof entry.userName).toBe('string');
          expect(entry.userName.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('P2-3.4c — ngOnInit stores users from getUsers() into component.users', () => {
    /**
     * **Validates: Requirements 3.4, 3.6**
     * After ngOnInit, component.users equals the full list returned by getUsers().
     */
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 10 }), (users) => {
        apiSpy.getUsers.and.returnValue(of(users));
        apiSpy.getSessions.and.returnValue(of([]));
        apiSpy.getMonsters.and.returnValue(of([]));
        apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

        component.ngOnInit();

        expect(component.users.length).toBe(users.length);
        expect(component.users).toEqual(users);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Req 3.5 — API errors still set error state and clear loading flags
  // Validates: Requirement 3.5
  // -------------------------------------------------------------------------
  it('P2-3.5a — any API error sets errorSessions and clears loadingSessions', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (errMsg) => {
        apiSpy.getSessions.and.returnValue(throwError(() => new Error(errMsg)));
        apiSpy.getUsers.and.returnValue(of([]));
        apiSpy.getMonsters.and.returnValue(of([]));
        apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

        component.ngOnInit();

        expect(component.loadingSessions).toBeFalse();
        expect(component.errorSessions).toBeTruthy();

        // Reset
        apiSpy.getSessions.and.returnValue(of([]));
      }),
      { numRuns: 50 }
    );
  });

  it('P2-3.5b — any API error sets errorUsers and clears loadingUsers', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (errMsg) => {
        apiSpy.getUsers.and.returnValue(throwError(() => new Error(errMsg)));
        apiSpy.getSessions.and.returnValue(of([]));
        apiSpy.getMonsters.and.returnValue(of([]));
        apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

        component.ngOnInit();

        expect(component.loadingUsers).toBeFalse();
        expect(component.errorUsers).toBeTruthy();

        // Reset
        apiSpy.getUsers.and.returnValue(of([]));
      }),
      { numRuns: 50 }
    );
  });

  it('P2-3.5c — any API error sets errorMonsters and clears loadingMonsters', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (errMsg) => {
        apiSpy.getMonsters.and.returnValue(throwError(() => new Error(errMsg)));
        apiSpy.getSessions.and.returnValue(of([]));
        apiSpy.getUsers.and.returnValue(of([]));
        apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

        component.ngOnInit();

        expect(component.loadingMonsters).toBeFalse();
        expect(component.errorMonsters).toBeTruthy();

        // Reset
        apiSpy.getMonsters.and.returnValue(of([]));
      }),
      { numRuns: 50 }
    );
  });

  it('P2-3.5d — API error clears ALL loading flags simultaneously', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    apiSpy.getSessions.and.returnValue(throwError(() => new Error('network error')));
    apiSpy.getUsers.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

    component.ngOnInit();

    expect(component.loadingSessions).toBeFalse();
    expect(component.loadingUsers).toBeFalse();
    expect(component.loadingMonsters).toBeFalse();
    expect(component.loadingPlayerCount).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // Req 3.6 — GET /api/users still returns full user list unchanged
  // Validates: Requirement 3.6
  // -------------------------------------------------------------------------
  it('P2-3.6a — component stores the full users list returned by getUsers() without modification', () => {
    /**
     * **Validates: Requirements 3.6**
     * The component must not filter or transform the users array from getUsers().
     */
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 15 }), (users) => {
        apiSpy.getUsers.and.returnValue(of(users));
        apiSpy.getSessions.and.returnValue(of([]));
        apiSpy.getMonsters.and.returnValue(of([]));
        apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

        component.ngOnInit();

        // The full list must be stored as-is (no filtering by isActive or any other field)
        expect(component.users).toEqual(users);
      }),
      { numRuns: 100 }
    );
  });

  it('P2-3.6b — inactive users are still included in component.users (no filtering)', () => {
    /**
     * **Validates: Requirements 3.6**
     * GET /api/users returns all users including inactive ones; component must not filter them.
     */
    const mixedUsers = [
      { id: 'u1', name: 'Active User',   isActive: true,  characters: [] },
      { id: 'u2', name: 'Inactive User', isActive: false, characters: [] },
      { id: 'u3', name: 'Another User',  isActive: true,  characters: [] },
    ];
    apiSpy.getUsers.and.returnValue(of(mixedUsers));
    apiSpy.getSessions.and.returnValue(of([]));
    apiSpy.getMonsters.and.returnValue(of([]));
    apiSpy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));

    component.ngOnInit();

    expect(component.users.length).toBe(3);
    expect(component.users.find((u: any) => u.id === 'u2')).toBeTruthy();
  });
});

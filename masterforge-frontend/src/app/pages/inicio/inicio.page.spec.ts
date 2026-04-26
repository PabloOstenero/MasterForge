import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

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
    'getSessions', 'getUsers', 'getMonsters',
  ]);
  spy.getSessions.and.returnValue(of([]));
  spy.getUsers.and.returnValue(of([]));
  spy.getMonsters.and.returnValue(of([]));
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

  it('P6b — totalActiveClients equals users.filter(u => u.isActive).length for any users array', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), (users) => {
        component.users = users;
        const expected = users.filter(u => u.isActive).length;
        expect(component.totalActiveClients).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('P6c — totalPendingClients equals users.filter(u => !u.isActive).length for any users array', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), (users) => {
        component.users = users;
        const expected = users.filter(u => !u.isActive).length;
        expect(component.totalPendingClients).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it('P6d — totalActiveClients + totalPendingClients always equals users.length', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), (users) => {
        component.users = users;
        expect(component.totalActiveClients + component.totalPendingClients).toBe(users.length);
      }),
      { numRuns: 100 }
    );
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

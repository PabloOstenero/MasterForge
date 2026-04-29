import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { PlayersPage } from './players.page';
import { ApiService } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const characterArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  dndClass: fc.constantFrom('Fighter', 'Wizard', 'Rogue', 'Cleric'),
  level: fc.integer({ min: 1, max: 20 }),
});

const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom('FREE', 'PRO'),
  isActive: fc.boolean(),
  characters: fc.array(characterArb, { minLength: 0, maxLength: 4 }),
});

// ---------------------------------------------------------------------------
// JugadoresPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('PlayersPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<PlayersPage>;
  let component: PlayersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let router: Router;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['getUsers']);
    apiSpy.getUsers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PlayersPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 10: API error sets error state and clears loading
  // Validates: Requirement 9.6
  // -------------------------------------------------------------------------
  it('P10 — getUsers error sets error and clears loading flag', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errMsg) => {
        apiSpy.getUsers.and.returnValue(throwError(() => new Error(errMsg)));
        component.loadUsers();
        expect(component.loading).toBeFalse();
        expect(component.error).toBeTruthy();
        apiSpy.getUsers.and.returnValue(of([]));
      }),
      { numRuns: 100 }
    );
  });

  it('P10b — successful getUsers clears error and loading', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 10 }), (users) => {
        apiSpy.getUsers.and.returnValue(of(users));
        component.loadUsers();
        expect(component.loading).toBeFalse();
        expect(component.error).toBeNull();
        expect(component.users.length).toBe(users.length);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // goToSheet — navigation
  // Validates: Requirement 7.4
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

  // -------------------------------------------------------------------------
  // users array is always set from API response
  // -------------------------------------------------------------------------
  it('loadUsers — users array length matches API response for any N users', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), (users) => {
        apiSpy.getUsers.and.returnValue(of(users));
        component.loadUsers();
        expect(component.users.length).toBe(users.length);
      }),
      { numRuns: 100 }
    );
  });
});

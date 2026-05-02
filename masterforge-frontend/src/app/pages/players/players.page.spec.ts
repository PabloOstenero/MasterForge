import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { PlayersPage } from './players.page';
import { ApiService } from '../../services/api';
import { CampaignPlayerDto } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const characterArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  dndClass: fc.constantFrom('Fighter', 'Wizard', 'Rogue', 'Cleric'),
  dndRace: fc.string({ minLength: 1, maxLength: 20 }),
  level: fc.integer({ min: 1, max: 20 }),
});

const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom('FREE', 'PRO'),
  characters: fc.array(characterArb, { minLength: 0, maxLength: 4 }),
});

// ---------------------------------------------------------------------------
// PlayersPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('PlayersPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<PlayersPage>;
  let component: PlayersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let router: Router;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['getCampaignPlayers']);
    apiSpy.getCampaignPlayers.and.returnValue(of([]));

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
  // Validates: Requirement 2.5
  // -------------------------------------------------------------------------
  it('P10 — getCampaignPlayers error sets error and clears loading flag', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errMsg) => {
        apiSpy.getCampaignPlayers.and.returnValue(throwError(() => new Error(errMsg)));
        component.loadUsers();
        expect(component.loading).toBeFalse();
        expect(component.error).toBeTruthy();
        apiSpy.getCampaignPlayers.and.returnValue(of([]));
      }),
      { numRuns: 100 }
    );
  });

  it('P10b — successful getCampaignPlayers clears error and loading', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 10 }), (users) => {
        apiSpy.getCampaignPlayers.and.returnValue(of(users as CampaignPlayerDto[]));
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
        apiSpy.getCampaignPlayers.and.returnValue(of(users as CampaignPlayerDto[]));
        component.loadUsers();
        expect(component.users.length).toBe(users.length);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Feature: dm-players-campaign-filter, Property 5: players page renders all
  // returned users with their characters
  // Validates: Requirements 2.2
  // -------------------------------------------------------------------------
  it('P5 — renders exactly users.length user-rows and sum(characters) character-cards', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userArb, { minLength: 0, maxLength: 5 }),
        async (users) => {
          apiSpy.getCampaignPlayers.and.returnValue(of(users as CampaignPlayerDto[]));
          component.loadUsers();
          fixture.detectChanges();
          await fixture.whenStable();
          fixture.detectChanges();

          const nativeEl: HTMLElement = fixture.nativeElement;
          const userRows = nativeEl.querySelectorAll('[data-testid="user-row"]');
          const charCards = nativeEl.querySelectorAll('[data-testid="character-card"]');
          const totalChars = users.reduce((sum, u) => sum + u.characters.length, 0);

          expect(userRows.length).toBe(users.length);
          expect(charCards.length).toBe(totalChars);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// PlayersPage — Unit Tests
// ---------------------------------------------------------------------------

describe('PlayersPage — Unit Tests', () => {

  let fixture: ComponentFixture<PlayersPage>;
  let component: PlayersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', ['getCampaignPlayers']);
    apiSpy.getCampaignPlayers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [PlayersPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersPage);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // Requirement 2.1: ngOnInit calls getCampaignPlayers(), not getUsers()
  // -------------------------------------------------------------------------
  it('ngOnInit calls getCampaignPlayers() (Requirement 2.1)', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(apiSpy.getCampaignPlayers).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Requirement 2.3: Empty response renders "No hay jugadores todavía."
  // -------------------------------------------------------------------------
  it('empty response renders "No hay jugadores todavía." (Requirement 2.3)', async () => {
    apiSpy.getCampaignPlayers.and.returnValue(of([]));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeEl: HTMLElement = fixture.nativeElement;
    const emptyMsg = nativeEl.querySelector('[data-testid="empty-jugadores"]');
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg?.textContent?.trim()).toBe('No hay jugadores en tus campañas todavía.');
  });

  // -------------------------------------------------------------------------
  // Requirement 2.4: Loading state shows spinner while request is pending
  // -------------------------------------------------------------------------
  it('shows spinner while request is pending (Requirement 2.4)', () => {
    const subject = new Subject<CampaignPlayerDto[]>();
    apiSpy.getCampaignPlayers.and.returnValue(subject.asObservable());

    fixture.detectChanges(); // triggers ngOnInit → loadUsers()
    fixture.detectChanges();

    const nativeEl: HTMLElement = fixture.nativeElement;
    const spinner = nativeEl.querySelector('[data-testid="spinner-jugadores"]');
    expect(component.loading).toBeTrue();
    expect(spinner).toBeTruthy();

    subject.complete();
  });

  // -------------------------------------------------------------------------
  // Requirement 2.5: Failed request sets error state
  // -------------------------------------------------------------------------
  it('failed request sets error state (Requirement 2.5)', async () => {
    apiSpy.getCampaignPlayers.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeEl: HTMLElement = fixture.nativeElement;
    const errorEl = nativeEl.querySelector('[data-testid="error-jugadores"]');
    expect(component.error).toBeTruthy();
    expect(component.loading).toBeFalse();
    expect(errorEl).toBeTruthy();
  });
});

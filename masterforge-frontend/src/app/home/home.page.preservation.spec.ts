/**
 * Preservation Property Tests — Home Summary Cards Fix (Task 2)
 *
 * METHODOLOGY: Observation-first
 * These tests were written BEFORE the fix is implemented.
 * They observe and encode the CURRENT CORRECT behavior for non-buggy inputs
 * (cases where isBugCondition returns false).
 *
 * SCOPE (isBugCondition = false — what we test here):
 *   - All card value displays: counts, balance, dates, "Sin sesiones" fallbacks
 *   - Non-link interactions
 *
 * OUT OF SCOPE (isBugCondition = true — NOT tested here):
 *   - DM "Próxima Sesión" data source correctness (bug condition A)
 *   - Summary-link navigation (bug condition B)
 *   - Player navigating to next session campaign when campaignId is absent (bug condition C)
 *
 * BASELINE OBSERVATIONS (on unfixed code):
 *   - GET /api/users/me/player-count returns { playerCount: n } and the DM card displays n
 *   - authService.getCurrentUser()?.balance returns the correct balance value
 *   - GET /api/users/me/active-campaigns returns { activeCampaigns: n } and the Player card displays n
 *   - GET /api/users/me/active-characters returns { activeCharacters: n } and the Player card displays n
 *   - nextPlayerSessionLabel returns "Sin sesiones" when nextSession.nextSessionDate is null
 *   - DM "Próxima Sesión" card shows "Sin sesiones" when this.sessions is empty
 *
 * ALL TESTS MUST PASS on unfixed code (establishing the baseline to preserve).
 * They will continue to pass after the fix is applied (preservation guarantee).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import * as fc from 'fast-check';

import { HomePage } from './home.page';
import { ApiService, NextSessionDto, ActiveCampaignsDto, ActiveCharactersDto } from '../services/api';
import { RoleService } from '../services/role.service';
import { AuthService } from '../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getUsers', 'getCampaigns', 'getDmCampaigns', 'getSessions', 'createCampaign', 'createSession',
    'getPlayerCount', 'getNextSession', 'getActiveCampaigns', 'getActiveCharacters', 'getPlayerCampaigns', 'getDmNextSession',
  ]);
  spy.getUsers.and.returnValue(of([]));
  spy.getCampaigns.and.returnValue(of([]));
  spy.getDmCampaigns.and.returnValue(of([]));
  spy.getSessions.and.returnValue(of([]));
  spy.createCampaign.and.returnValue(of({}));
  spy.createSession.and.returnValue(of({}));
  spy.getPlayerCount.and.returnValue(of({ playerCount: 0 }));
  spy.getNextSession.and.returnValue(of({ nextSessionDate: null, campaignId: null }));
  spy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 0 }));
  spy.getActiveCharacters.and.returnValue(of({ activeCharacters: 0 }));
  spy.getPlayerCampaigns.and.returnValue(of([]));
  spy.getDmNextSession.and.returnValue(of({ nextSessionDate: null, campaignId: null }));
  return spy;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomePage — Preservation Property Tests (Task 2)', () => {

  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let roleSubject: BehaviorSubject<'dm' | 'player'>;
  let authServiceMock: { getCurrentUser: () => any; getUserIdFromToken: () => string; logout: () => void };

  beforeEach(async () => {
    apiSpy = buildApiSpy();
    roleSubject = new BehaviorSubject<'dm' | 'player'>('dm');

    const roleServiceMock = {
      activeRole$: roleSubject.asObservable(),
      menuItems$: of([]),
      toggleRole: () => roleSubject.next(roleSubject.value === 'dm' ? 'player' : 'dm'),
    };

    authServiceMock = {
      getCurrentUser: () => ({ id: 'user-1', name: 'Test User', balance: 0 }),
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

  // =========================================================================
  // Test P1 — DM Player Count Preservation
  //
  // OBSERVATION: GET /api/users/me/player-count returns { playerCount: n }
  // and the DM "Clientes Totales" card displays n.
  //
  // Property: for all DM users, playerCount displayed equals the value
  // returned by GET /api/users/me/player-count.
  //
  // Validates: Requirement 3.1
  // =========================================================================
  it('P1 — DM "Clientes Totales" card displays the playerCount from GET /api/users/me/player-count', () => {
    /**
     * **Validates: Requirements 3.1**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (n) => {
          // Arrange: mock the player count endpoint to return n
          apiSpy.getPlayerCount.and.returnValue(of({ playerCount: n }));

          // Act: render in DM role and load player count
          roleSubject.next('dm');
          component.loadPlayerCount();
          fixture.detectChanges();

          // Assert: the "Clientes Totales" card value shows n
          const dmDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dm-dashboard"]');
          expect(dmDashboard).withContext('DM dashboard must be visible').toBeTruthy();

          const summaryCards = dmDashboard.querySelectorAll('.summary-card');
          expect(summaryCards.length).withContext('DM dashboard must have 3 summary cards').toBe(3);

          // "Clientes Totales" is the second card (index 1)
          const clientesCard = summaryCards[1];
          const labelEl = clientesCard.querySelector('.summary-label');
          expect(labelEl?.textContent?.trim())
            .withContext('Second DM card must be "Clientes Totales"')
            .toBe('Clientes Totales');

          const valueEl = clientesCard.querySelector('.summary-value');
          expect(valueEl?.textContent?.trim())
            .withContext(`P1: "Clientes Totales" card must display "${n} jugadores" for playerCount=${n}`)
            .toBe(`${n} jugadores`);
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Test P2 — DM Balance Preservation
  //
  // OBSERVATION: authService.getCurrentUser()?.balance returns the correct
  // balance value and the DM "Saldo" card displays it formatted as "X.XXe".
  //
  // Property: for all DM users, balance displayed equals
  // authService.getCurrentUser()?.balance.
  //
  // Validates: Requirement 3.2
  // =========================================================================
  it('P2 — DM "Saldo" card displays the balance from authService.getCurrentUser()?.balance', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        // Generate arbitrary numbers with up to 2 decimal places to avoid floating-point display issues
        fc.integer({ min: -100000, max: 100000 }).map(n => n / 100),
        (b) => {
          // Arrange: mock authService to return a user with balance b
          authServiceMock.getCurrentUser = () => ({ id: 'user-1', name: 'Test User', balance: b });

          // Act: render in DM role
          roleSubject.next('dm');
          fixture.detectChanges();

          // Assert: the "Saldo" card value shows b.toFixed(2)€
          const dmDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dm-dashboard"]');
          expect(dmDashboard).withContext('DM dashboard must be visible').toBeTruthy();

          const summaryCards = dmDashboard.querySelectorAll('.summary-card');
          expect(summaryCards.length).withContext('DM dashboard must have 3 summary cards').toBe(3);

          // "Saldo" is the third card (index 2)
          const saldoCard = summaryCards[2];
          const labelEl = saldoCard.querySelector('.summary-label');
          expect(labelEl?.textContent?.trim())
            .withContext('Third DM card must be "Saldo"')
            .toBe('Saldo');

          const valueEl = saldoCard.querySelector('.summary-value');
          const expectedText = `${b.toFixed(2)}€`;
          expect(valueEl?.textContent?.trim())
            .withContext(`P2: "Saldo" card must display "${expectedText}" for balance=${b}`)
            .toBe(expectedText);
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Test P3 — Player Active Campaigns Preservation
  //
  // OBSERVATION: GET /api/users/me/active-campaigns returns { activeCampaigns: n }
  // and the Player "Campañas Activas" card displays n.
  //
  // Property: for all Player users, activeCampaigns displayed equals the value
  // from GET /api/users/me/active-campaigns.
  //
  // Validates: Requirement 3.4
  // =========================================================================
  it('P3 — Player "Campañas Activas" card displays the count from GET /api/users/me/active-campaigns', () => {
    /**
     * **Validates: Requirements 3.4**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (n) => {
          // Arrange: mock the active campaigns endpoint to return n
          apiSpy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: n }));
          apiSpy.getNextSession.and.returnValue(of({ nextSessionDate: null, campaignId: null }));
          apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: 0 }));

          // Act: render in Player role and load player summary
          roleSubject.next('player');
          component.loadPlayerSummary();
          fixture.detectChanges();

          // Assert: the "Campañas Activas" card value shows n
          const playerDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="player-dashboard"]');
          expect(playerDashboard).withContext('Player dashboard must be visible').toBeTruthy();

          const summaryRow = playerDashboard.querySelector('[data-testid="player-summary-row"]');
          expect(summaryRow).withContext('Player summary row must be present').toBeTruthy();

          const summaryCards = summaryRow!.querySelectorAll('.summary-card');
          expect(summaryCards.length).withContext('Player dashboard must have 3 summary cards').toBe(3);

          // "Campañas Activas" is the second card (index 1)
          const campanasCard = summaryCards[1];
          const labelEl = campanasCard.querySelector('.summary-label');
          expect(labelEl?.textContent?.trim())
            .withContext('Second player card must be "Campañas Activas"')
            .toBe('Campañas Activas');

          const valueEl = campanasCard.querySelector('.summary-value');
          expect(valueEl?.textContent?.trim())
            .withContext(`P3: "Campañas Activas" card must display "${n}" for activeCampaigns=${n}`)
            .toBe(String(n));
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Test P4 — Player Active Characters Preservation
  //
  // OBSERVATION: GET /api/users/me/active-characters returns { activeCharacters: n }
  // and the Player "Aventureros Activos" card displays n.
  //
  // Property: for all Player users, activeCharacters displayed equals the value
  // from GET /api/users/me/active-characters.
  //
  // Validates: Requirement 3.5
  // =========================================================================
  it('P4 — Player "Aventureros Activos" card displays the count from GET /api/users/me/active-characters', () => {
    /**
     * **Validates: Requirements 3.5**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (n) => {
          // Arrange: mock the active characters endpoint to return n
          apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: n }));
          apiSpy.getNextSession.and.returnValue(of({ nextSessionDate: null, campaignId: null }));
          apiSpy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 0 }));

          // Act: render in Player role and load player summary
          roleSubject.next('player');
          component.loadPlayerSummary();
          fixture.detectChanges();

          // Assert: the "Aventureros Activos" card value shows n
          const playerDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="player-dashboard"]');
          expect(playerDashboard).withContext('Player dashboard must be visible').toBeTruthy();

          const summaryRow = playerDashboard.querySelector('[data-testid="player-summary-row"]');
          expect(summaryRow).withContext('Player summary row must be present').toBeTruthy();

          const summaryCards = summaryRow!.querySelectorAll('.summary-card');
          expect(summaryCards.length).withContext('Player dashboard must have 3 summary cards').toBe(3);

          // "Aventureros Activos" is the third card (index 2)
          const aventurerosCard = summaryCards[2];
          const labelEl = aventurerosCard.querySelector('.summary-label');
          expect(labelEl?.textContent?.trim())
            .withContext('Third player card must be "Aventureros Activos"')
            .toBe('Aventureros Activos');

          const valueEl = aventurerosCard.querySelector('.summary-value');
          expect(valueEl?.textContent?.trim())
            .withContext(`P4: "Aventureros Activos" card must display "${n}" for activeCharacters=${n}`)
            .toBe(String(n));
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Test P5 — Sin Sesiones Fallback (Player)
  //
  // OBSERVATION: When GET /api/users/me/next-session returns { nextSessionDate: null },
  // nextPlayerSessionLabel returns "Sin sesiones" and the Player "Próxima Sesión"
  // card displays "Sin sesiones".
  //
  // Property: for any Player user with no upcoming sessions, the "Próxima Sesión"
  // card displays "Sin sesiones".
  //
  // Validates: Requirements 3.7, 3.8
  // =========================================================================
  it('P5 — Player "Próxima Sesión" card displays "Sin sesiones" when nextSessionDate is null', () => {
    /**
     * **Validates: Requirements 3.7, 3.8**
     */
    // Arrange: mock next session endpoint to return null date
    apiSpy.getNextSession.and.returnValue(of({ nextSessionDate: null, campaignId: null }));
    apiSpy.getActiveCampaigns.and.returnValue(of({ activeCampaigns: 0 }));
    apiSpy.getActiveCharacters.and.returnValue(of({ activeCharacters: 0 }));

    // Act: render in Player role and load player summary
    roleSubject.next('player');
    component.loadPlayerSummary();
    fixture.detectChanges();

    // Assert: the "Próxima Sesión" card value shows "Sin sesiones"
    const playerDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="player-dashboard"]');
    expect(playerDashboard).withContext('Player dashboard must be visible').toBeTruthy();

    const summaryRow = playerDashboard.querySelector('[data-testid="player-summary-row"]');
    expect(summaryRow).withContext('Player summary row must be present').toBeTruthy();

    const summaryCards = summaryRow!.querySelectorAll('.summary-card');
    expect(summaryCards.length).withContext('Player dashboard must have 3 summary cards').toBe(3);

    // "Próxima Sesión" is the first card (index 0)
    const proximaCard = summaryCards[0];
    const labelEl = proximaCard.querySelector('.summary-label');
    expect(labelEl?.textContent?.trim())
      .withContext('First player card must be "Próxima Sesión"')
      .toBe('Próxima Sesión');

    const valueEl = proximaCard.querySelector('.summary-value');
    expect(valueEl?.textContent?.trim())
      .withContext('P5: Player "Próxima Sesión" card must display "Sin sesiones" when nextSessionDate is null')
      .toBe('Sin sesiones');
  });

  // P5 property-based variant: any null/invalid date string produces "Sin sesiones"
  it('P5b — nextPlayerSessionLabel returns "Sin sesiones" for any null or invalid date (property)', () => {
    /**
     * **Validates: Requirements 3.7, 3.8**
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null as string | null),
          fc.constant(''),
          fc.constant('not-a-date'),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => isNaN(new Date(s).getTime()))
        ),
        (invalidDate) => {
          component.nextSession = { nextSessionDate: invalidDate, campaignId: null };
          expect(component.nextPlayerSessionLabel)
            .withContext(`P5b: nextPlayerSessionLabel must be "Sin sesiones" for date="${invalidDate}"`)
            .toBe('Sin sesiones');
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Test P6 — Sin Sesiones Fallback (DM)
  //
  // OBSERVATION: When dmNextSession.nextSessionDate is null (or dmNextSession is null),
  // the DM nextSessionDate getter returns "Sin sesiones" and the DM
  // "Próxima Sesión" card displays "Sin sesiones".
  //
  // Property: for any DM user with no upcoming sessions (dmNextSession is null or
  // nextSessionDate is null), the "Próxima Sesión" card displays "Sin sesiones".
  //
  // NOTE: After the fix, the DM card reads from dmNextSession (not this.sessions).
  // The "Sin sesiones" fallback must still work correctly.
  //
  // Validates: Requirement 3.6
  // =========================================================================
  it('P6 — DM "Próxima Sesión" card displays "Sin sesiones" when dmNextSession has no date', () => {
    /**
     * **Validates: Requirements 3.6**
     */
    // Arrange: dmNextSession is null (no DM-scoped session loaded)
    roleSubject.next('dm');
    component.dmNextSession = null;
    component.loadingDmNextSession = false;
    fixture.detectChanges();

    // Assert: the "Próxima Sesión" card value shows "Sin sesiones"
    const dmDashboard: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dm-dashboard"]');
    expect(dmDashboard).withContext('DM dashboard must be visible').toBeTruthy();

    const summaryCards = dmDashboard.querySelectorAll('.summary-card');
    expect(summaryCards.length).withContext('DM dashboard must have 3 summary cards').toBe(3);

    // "Próxima Sesión" is the first card (index 0)
    const proximaCard = summaryCards[0];
    const labelEl = proximaCard.querySelector('.summary-label');
    expect(labelEl?.textContent?.trim())
      .withContext('First DM card must be "Próxima Sesión"')
      .toBe('Próxima Sesión');

    const valueEl = proximaCard.querySelector('.summary-value');
    expect(valueEl?.textContent?.trim())
      .withContext('P6: DM "Próxima Sesión" card must display "Sin sesiones" when dmNextSession is null')
      .toBe('Sin sesiones');
  });

  // P6 property-based variant: nextSessionDate getter returns "Sin sesiones" when dmNextSession is null or has no date
  it('P6b — nextSessionDate getter returns "Sin sesiones" when dmNextSession is null or has null date (property)', () => {
    /**
     * **Validates: Requirements 3.6**
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null as { nextSessionDate: string | null; campaignId: string | null } | null),
          fc.constant({ nextSessionDate: null, campaignId: null }),
          fc.constant({ nextSessionDate: null, campaignId: 'some-id' })
        ),
        (dmNextSession) => {
          component.dmNextSession = dmNextSession;
          expect(component.nextSessionDate)
            .withContext('P6b: nextSessionDate must be "Sin sesiones" when dmNextSession has no date')
            .toBe('Sin sesiones');
        }
      ),
      { numRuns: 10 }
    );
  });

  // =========================================================================
  // Additional preservation: balance getter always reads from authService
  // =========================================================================
  it('P2b — balance getter always returns authService.getCurrentUser()?.balance (property)', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: 100000 }).map(n => n / 100),
        (b) => {
          authServiceMock.getCurrentUser = () => ({ id: 'user-1', name: 'Test User', balance: b });
          expect(component.balance)
            .withContext(`P2b: balance getter must return ${b} from authService`)
            .toBe(b);
        }
      ),
      { numRuns: 50 }
    );
  });

  // =========================================================================
  // Additional preservation: balance getter returns 0 when getCurrentUser returns null
  // =========================================================================
  it('P2c — balance getter returns 0 when getCurrentUser returns null', () => {
    /**
     * **Validates: Requirements 3.2**
     */
    authServiceMock.getCurrentUser = () => null;
    expect(component.balance)
      .withContext('P2c: balance getter must return 0 when getCurrentUser returns null')
      .toBe(0);
  });

  // =========================================================================
  // Additional preservation: Player "Próxima Sesión" card shows formatted date
  // when nextSessionDate is a valid ISO string (Req 3.3)
  // =========================================================================
  it('P3c — Player "Próxima Sesión" card shows formatted date for valid ISO nextSessionDate (property)', () => {
    /**
     * **Validates: Requirements 3.3**
     */
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
          .filter(d => !isNaN(d.getTime()))
          .map(d => d.toISOString()),
        (isoDate) => {
          component.nextSession = { nextSessionDate: isoDate, campaignId: null };
          const label = component.nextPlayerSessionLabel;
          expect(label)
            .withContext(`P3c: nextPlayerSessionLabel must be a formatted date for isoDate="${isoDate}"`)
            .toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        }
      ),
      { numRuns: 50 }
    );
  });

});

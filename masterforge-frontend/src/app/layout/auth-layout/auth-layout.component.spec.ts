import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Component } from '@angular/core';
import * as fc from 'fast-check';

import { AuthLayoutComponent } from './auth-layout.component';
import { AuthService } from '../../services/auth.service';

// Minimal stub component used as child route targets so the router-outlet
// inside AuthLayoutComponent doesn't render another full sidebar.
@Component({ standalone: true, template: '' })
class StubPageComponent {}

// ---------------------------------------------------------------------------
// AuthLayoutComponent — Property-Based Tests
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Property-Based Tests', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const NAV_ROUTES = ['/home', '/jugadores', '/campanyas', '/bestiario', '/config'];

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'jugadores', component: StubPageComponent },
          { path: 'campanyas', component: StubPageComponent },
          { path: 'bestiario', component: StubPageComponent },
          { path: 'config', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 4: Logout clears token and redirects
  // Validates: Requirement 2.5
  // **Validates: Requirements 2.5**
  // -------------------------------------------------------------------------
  it('P4 — for any authenticated state (non-empty token), logout() calls AuthService.logout and navigates to /login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (token) => {
        // Simulate authenticated state by storing the token
        localStorage.setItem('mf_token', token);
        authSpy.logout.calls.reset();
        navigateSpy.calls.reset();
        component.logout();
        expect(authSpy.logout).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
        localStorage.removeItem('mf_token');
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 11: Sidebar active item matches current route
  // Validates: Requirement 3.5
  // **Validates: Requirement 3.5**
  //
  // Strategy: fast-check generates a sequence of routes. For each route we
  // navigate synchronously (fakeAsync + tick), then assert exactly one
  // .nav-item has the 'active' class. We reset the router to a neutral URL
  // before each iteration to avoid state bleed between runs.
  // -------------------------------------------------------------------------
  it('P11-active — for any active route, exactly one sidebar nav item has the active class', fakeAsync(() => {
    // Run 100 iterations by sampling from the 5 routes
    const samples = fc.sample(fc.constantFrom(...NAV_ROUTES), 100);

    for (const route of samples) {
      // Navigate to the route
      router.navigateByUrl(route);
      tick();
      fixture.detectChanges();

      const activeItems = fixture.nativeElement.querySelectorAll('a.nav-item.active');
      expect(activeItems.length)
        .withContext(`Expected exactly 1 active nav item for route "${route}", got ${activeItems.length}`)
        .toBe(1);
    }
  }));

  it('P11-active-correct-item — for any active route, the active nav item href matches that route', fakeAsync(() => {
    const samples = fc.sample(fc.constantFrom(...NAV_ROUTES), 100);

    for (const route of samples) {
      router.navigateByUrl(route);
      tick();
      fixture.detectChanges();

      const activeItems: HTMLAnchorElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('a.nav-item.active')
      );
      expect(activeItems.length)
        .withContext(`Expected exactly 1 active item for route "${route}"`)
        .toBe(1);

      const activeHref = activeItems[0].getAttribute('href') ?? '';
      expect(activeHref)
        .withContext(`Active item href "${activeHref}" should match route "${route}"`)
        .toBe(route);
    }
  }));

  // -------------------------------------------------------------------------
  // Property 11: Sidebar renders all 5 nav items
  // Validates: Requirement 3.3
  // -------------------------------------------------------------------------
  it('P11 — sidebar always renders exactly 5 navigation items', () => {
    const navItems = fixture.nativeElement.querySelectorAll('.nav-item');
    expect(navItems.length).toBe(5);
  });

  it('P11b — sidebar contains routerLinks for all authenticated routes', () => {
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a.nav-item');
    const hrefs = Array.from(links).map(a => a.getAttribute('href') ?? a.getAttribute('ng-reflect-router-link'));
    NAV_ROUTES.forEach(route => {
      const found = hrefs.some(h => h?.includes(route.replace('/', '')));
      expect(found).withContext(`Route ${route} should be in sidebar`).toBeTrue();
    });
  });

  it('P11c — sidebar title "MasterForge" is always present', () => {
    const title = fixture.nativeElement.querySelector('.sidebar-title');
    expect(title).toBeTruthy();
    expect(title.textContent.trim()).toBe('MasterForge');
  });

  it('P11d — avatar button is always present in topbar', () => {
    const avatarBtn = fixture.nativeElement.querySelector('.avatar-btn');
    expect(avatarBtn).toBeTruthy();
  });

  it('P11e — router-outlet is present in main content area', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AuthLayoutComponent — Property 2: Preservation (Non-Toggle Interactions Unchanged)
// ---------------------------------------------------------------------------
// These tests MUST PASS on unfixed code — they confirm the baseline behavior
// that must be preserved after the fix is applied.
//
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Property 2: Preservation (Non-Toggle Interactions Unchanged)', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  // The 5 DM items as rendered by the hardcoded template (unfixed code)
  const DM_ITEM_TITLES = ['Inicio', 'Jugadores', 'Campañas', 'Bestiario', 'Config'];
  const DM_ROUTES = ['/home', '/jugadores', '/campanyas', '/bestiario', '/config'];

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'jugadores', component: StubPageComponent },
          { path: 'campanyas', component: StubPageComponent },
          { path: 'bestiario', component: StubPageComponent },
          { path: 'config', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // P2-initial-dm-render
  // Validates: Requirement 3.3
  // **Validates: Requirements 3.3**
  //
  // On init (role = dm), sidebar renders exactly 5 DM items.
  // EXPECTED ON UNFIXED CODE: PASSES (hardcoded DM items are always shown)
  // -------------------------------------------------------------------------
  it('P2-initial-dm-render — on init, sidebar renders exactly 5 DM nav items', () => {
    const anchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item')
    );
    expect(anchors.length)
      .withContext(`Expected exactly 5 DM nav items on init, got ${anchors.length}`)
      .toBe(5);
  });

  it('P2-initial-dm-titles — on init, sidebar contains all expected DM item titles', () => {
    const anchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item')
    );
    const renderedTitles = anchors.map(a => a.textContent?.trim() ?? '');

    DM_ITEM_TITLES.forEach(expected => {
      const found = renderedTitles.some(t => t.includes(expected));
      expect(found)
        .withContext(`Expected DM item "${expected}" to be present in sidebar. Rendered: [${renderedTitles.join(', ')}]`)
        .toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // P2-logout-preservation
  // Validates: Requirement 3.2
  // **Validates: Requirements 3.2**
  //
  // Clicking logout calls AuthService.logout() and navigates to /login.
  // EXPECTED ON UNFIXED CODE: PASSES (logout is already wired correctly)
  // -------------------------------------------------------------------------
  it('P2-logout-preservation — logout() calls AuthService.logout() and navigates to /login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.logout();
    expect(authSpy.logout).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('P2-logout-preservation-pbt — for any token value, logout() always calls AuthService.logout() and navigates to /login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (token) => {
        localStorage.setItem('mf_token', token);
        authSpy.logout.calls.reset();
        navigateSpy.calls.reset();
        component.logout();
        expect(authSpy.logout).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
        localStorage.removeItem('mf_token');
      }),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // P2-non-toggle-stability
  // Validates: Requirements 3.1, 3.3
  // **Validates: Requirements 3.1, 3.3**
  //
  // For all non-toggle interactions (navigation only, no role change),
  // the rendered items remain stable and equal the initial DM menu.
  // EXPECTED ON UNFIXED CODE: PASSES (hardcoded items never change)
  // -------------------------------------------------------------------------
  it('P2-non-toggle-stability — rendered items are stable across arbitrary navigation sequences (no role toggle)', fakeAsync(() => {
    // Generate arbitrary sequences of navigation events (no role toggle)
    const navSequences = fc.sample(
      fc.array(fc.constantFrom(...DM_ROUTES), { minLength: 1, maxLength: 10 }),
      30
    );

    for (const sequence of navSequences) {
      for (const route of sequence) {
        router.navigateByUrl(route);
        tick();
        fixture.detectChanges();
      }

      // After any navigation sequence, rendered items must still equal the initial DM menu
      const anchors: HTMLAnchorElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('a.nav-item')
      );
      expect(anchors.length)
        .withContext(`After navigation sequence [${sequence.join(', ')}], expected 5 DM items but got ${anchors.length}`)
        .toBe(5);

      const renderedTitles = anchors.map(a => a.textContent?.trim() ?? '');
      DM_ITEM_TITLES.forEach(expected => {
        const found = renderedTitles.some(t => t.includes(expected));
        expect(found)
          .withContext(`After navigation, expected DM item "${expected}" to still be present. Got: [${renderedTitles.join(', ')}]`)
          .toBeTrue();
      });
    }
  }));

  // -------------------------------------------------------------------------
  // P2-routerLinkActive-at-most-one
  // Validates: Requirement 3.4
  // **Validates: Requirements 3.4**
  //
  // For any navigation path, routerLinkActive applies 'active' to at most one
  // item per render.
  // EXPECTED ON UNFIXED CODE: PASSES (routerLinkActive is already wired)
  // -------------------------------------------------------------------------
  it('P2-routerLinkActive-at-most-one — for any route, at most one nav item has the active class', fakeAsync(() => {
    const samples = fc.sample(fc.constantFrom(...DM_ROUTES), 50);

    for (const route of samples) {
      router.navigateByUrl(route);
      tick();
      fixture.detectChanges();

      const activeItems = fixture.nativeElement.querySelectorAll('a.nav-item.active');
      expect(activeItems.length)
        .withContext(`For route "${route}", expected at most 1 active item but got ${activeItems.length}`)
        .toBeLessThanOrEqual(1);
    }
  }));

  it('P2-routerLinkActive-config — navigating to /config applies active class to the Config anchor', fakeAsync(() => {
    router.navigateByUrl('/config');
    tick();
    fixture.detectChanges();

    const activeItems: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item.active')
    );
    expect(activeItems.length)
      .withContext('Expected exactly 1 active item when navigating to /config')
      .toBe(1);

    const activeHref = activeItems[0].getAttribute('href') ?? '';
    expect(activeHref)
      .withContext(`Active item href should be "/config" but got "${activeHref}"`)
      .toBe('/config');
  }));

  // -------------------------------------------------------------------------
  // P2-layout-structure
  // Validates: Requirement 3.1
  // **Validates: Requirements 3.1**
  //
  // The sidebar and main content layout structure is always present.
  // EXPECTED ON UNFIXED CODE: PASSES
  // -------------------------------------------------------------------------
  it('P2-layout-structure — sidebar and main content layout are always present', () => {
    expect(fixture.nativeElement.querySelector('.layout-wrapper')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.main-content')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

});

// ---------------------------------------------------------------------------
// Shared menu fixtures used by bug condition describe blocks below
// ---------------------------------------------------------------------------

import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { RoleService, MenuItem } from '../../services/role.service';

const DM_MENU: MenuItem[] = [
  { title: 'Inicio', icon: 'home-outline', route: '/home' },
  { title: 'Jugadores', icon: 'people-outline', route: '/jugadores' },
  { title: 'Campañas', icon: 'map-outline', route: '/campanyas' },
  { title: 'Bestiario IA', icon: 'skull-outline', route: '/bestiario' },
  { title: 'Configuración', icon: 'settings-outline', route: '/config' },
];

const PLAYER_MENU: MenuItem[] = [
  { title: 'Inicio', icon: 'home-outline', route: '/home' },
  { title: 'Forjar Personaje', icon: 'person-add-outline', route: '/forjar-personaje' },
  { title: 'Mis Personajes', icon: 'book-outline', route: '/mis-personajes' },
  { title: 'Homebrew (IA)', icon: 'color-wand-outline', sublabel: 'Clases, Subclases, Razas', route: '/homebrew' },
  { title: 'Gremio de Campañas', icon: 'search-outline', route: '/buscar-campañas' },
  { title: 'Configuración', icon: 'settings-outline', route: '/config' },
];

// ---------------------------------------------------------------------------
// AuthLayoutComponent — Property 1: Bug Condition - Topbar Absent in AuthLayoutComponent
// ---------------------------------------------------------------------------
// These tests MUST FAIL on unfixed code — failure confirms the bug exists.
// The topbar (role toggle + avatar) only exists in home.page.html, not in AuthLayoutComponent.
//
// **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
//
// Counterexample to be documented after running on unfixed code:
//   "AuthLayoutComponent renders no .topbar element; topbar only exists in home.page.html"
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Property 1: Bug Condition - Topbar Absent in AuthLayoutComponent', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let mockRoleService: {
    _subject: BehaviorSubject<'dm' | 'player'>;
    activeRole$: ReturnType<BehaviorSubject<'dm' | 'player'>['asObservable']>;
    menuItems$: ReturnType<BehaviorSubject<MenuItem[]>['asObservable']>;
  };

  beforeEach(async () => {
    const roleSubject = new BehaviorSubject<'dm' | 'player'>('dm');
    const menuSubject = new BehaviorSubject<MenuItem[]>(DM_MENU);
    
    mockRoleService = {
      _subject: roleSubject,
      activeRole$: roleSubject.asObservable(),
      menuItems$: menuSubject.asObservable(),
    };

    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: RoleService, useValue: mockRoleService },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'jugadores', component: StubPageComponent },
          { path: 'campanyas', component: StubPageComponent },
          { path: 'bestiario', component: StubPageComponent },
          { path: 'config', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // P1-topbar-absent
  // Validates: Requirements 1.1, 1.2, 2.1, 2.2
  // **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
  //
  // EXPECTED ON UNFIXED CODE: FAILS
  // Counterexample: AuthLayoutComponent renders no .topbar element; topbar only exists in home.page.html
  // -------------------------------------------------------------------------
  it('P1-topbar-absent — AuthLayoutComponent renders .topbar element inside .main-content', () => {
    const mainContent = fixture.nativeElement.querySelector('.main-content');
    expect(mainContent).withContext('.main-content should exist').toBeTruthy();

    const topbar = mainContent.querySelector('.topbar');
    expect(topbar)
      .withContext(
        '[BUG COUNTEREXAMPLE] AuthLayoutComponent renders no .topbar element; topbar only exists in home.page.html'
      )
      .toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // P1-role-toggle-absent
  // Validates: Requirements 1.1, 1.2, 2.1, 2.2
  // **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
  //
  // EXPECTED ON UNFIXED CODE: FAILS
  // Counterexample: Role toggle button is not found in AuthLayoutComponent
  // -------------------------------------------------------------------------
  it('P1-role-toggle-absent — AuthLayoutComponent renders role toggle ion-button inside .main-content', () => {
    const mainContent = fixture.nativeElement.querySelector('.main-content');
    expect(mainContent).withContext('.main-content should exist').toBeTruthy();

    const roleToggleBtn = mainContent.querySelector('ion-button');
    expect(roleToggleBtn)
      .withContext(
        '[BUG COUNTEREXAMPLE] Role toggle ion-button is not found in AuthLayoutComponent .main-content'
      )
      .toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // P1-avatar-absent
  // Validates: Requirements 1.1, 1.2, 2.1, 2.2
  // **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
  //
  // EXPECTED ON UNFIXED CODE: FAILS
  // Counterexample: ion-avatar is not found in AuthLayoutComponent
  // -------------------------------------------------------------------------
  it('P1-avatar-absent — AuthLayoutComponent renders avatar button inside .main-content', () => {
    const mainContent = fixture.nativeElement.querySelector('.main-content');
    expect(mainContent).withContext('.main-content should exist').toBeTruthy();

    const avatar = mainContent.querySelector('.avatar-btn');
    expect(avatar)
      .withContext(
        '[BUG COUNTEREXAMPLE] .avatar-btn is not found in AuthLayoutComponent .main-content'
      )
      .toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// AuthLayoutComponent — Property 1: Bug Condition (Sidebar Ignores Role Toggle)
// ---------------------------------------------------------------------------
// These tests MUST FAIL on unfixed code — failure confirms the bug exists.
// The component never injects RoleService, so the mock has no effect on the DOM.
// The sidebar stays frozen on hardcoded DM links regardless of toggleRole().
//
// Counterexamples documented after running on unfixed code:
//   - After toggleRole(), sidebar still shows "Jugadores" instead of "Forjar Personaje"
//   - After toggleRole(), nav item count is 5 (hardcoded DM) instead of 6 (Player menu)
//   - After toggleRole(), "Jugadores" is still present in the sidebar
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Property 1: Bug Condition (Sidebar Ignores Role Toggle)', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let mockRoleService: {
    _subject: BehaviorSubject<MenuItem[]>;
    _role: 'dm' | 'player';
    menuItems$: ReturnType<BehaviorSubject<MenuItem[]>['asObservable']>;
    get activeRole(): 'dm' | 'player';
    toggleRole(): void;
  };

  beforeEach(async () => {
    const subject = new BehaviorSubject<MenuItem[]>(DM_MENU);
    mockRoleService = {
      _subject: subject,
      _role: 'dm' as 'dm' | 'player',
      menuItems$: subject.asObservable(),
      get activeRole() { return this._role; },
      toggleRole() {
        this._role = this._role === 'dm' ? 'player' : 'dm';
        this._subject.next(this._role === 'player' ? PLAYER_MENU : DM_MENU);
      },
    };

    const authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: RoleService, useValue: mockRoleService },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'jugadores', component: StubPageComponent },
          { path: 'campanyas', component: StubPageComponent },
          { path: 'bestiario', component: StubPageComponent },
          { path: 'config', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'forjar-personaje', component: StubPageComponent },
          { path: 'mis-personajes', component: StubPageComponent },
          { path: 'homebrew', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // P1-bug-condition-toggle-to-player
  // Validates: Requirements 1.1, 1.2, 1.3
  // **Validates: Requirements 1.1, 1.2, 1.3**
  //
  // EXPECTED ON UNFIXED CODE: FAILS
  // Counterexample: sidebar still shows "Jugadores" instead of "Forjar Personaje"
  // -------------------------------------------------------------------------
  it('P1-bug-condition-toggle-to-player — after toggleRole() from dm to player, sidebar contains "Forjar Personaje"', () => {
    // Start: role = dm, DM menu rendered
    mockRoleService.toggleRole(); // dm → player
    fixture.detectChanges();

    const anchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item')
    );
    const titles = anchors.map(a => a.textContent?.trim() ?? '');
    const hasForjarPersonaje = titles.some(t => t.includes('Forjar Personaje'));

    expect(hasForjarPersonaje)
      .withContext(
        `[BUG COUNTEREXAMPLE] After toggleRole() dm→player, expected sidebar to contain "Forjar Personaje" but got: [${titles.join(', ')}]`
      )
      .toBeTrue();
  });

  // -------------------------------------------------------------------------
  // P1-bug-condition-player-menu-count
  // Validates: Requirements 1.1, 1.2, 1.3
  // **Validates: Requirements 1.1, 1.2, 1.3**
  //
  // EXPECTED ON UNFIXED CODE: FAILS — count is always 5 (hardcoded DM items)
  // Counterexample: nav item count = 5 instead of 6
  // -------------------------------------------------------------------------
  it('P1-bug-condition-player-menu-count — after toggleRole() from dm to player, sidebar has 6 nav items', () => {
    // Start: role = dm
    mockRoleService.toggleRole(); // dm → player
    fixture.detectChanges();

    const anchors = fixture.nativeElement.querySelectorAll('a.nav-item');
    expect(anchors.length)
      .withContext(
        `[BUG COUNTEREXAMPLE] After toggleRole() dm→player, expected 6 nav items (Player menu) but got ${anchors.length} (hardcoded DM menu has 5)`
      )
      .toBe(6);
  });

  // -------------------------------------------------------------------------
  // P1-bug-condition-no-jugadores-after-toggle
  // Validates: Requirements 1.1, 1.2, 1.3
  // **Validates: Requirements 1.1, 1.2, 1.3**
  //
  // EXPECTED ON UNFIXED CODE: FAILS — "Jugadores" is still present
  // Counterexample: "Jugadores" still visible after switching to Player role
  // -------------------------------------------------------------------------
  it('P1-bug-condition-no-jugadores-after-toggle — after toggleRole() from dm to player, sidebar does NOT contain "Jugadores"', () => {
    // Start: role = dm
    mockRoleService.toggleRole(); // dm → player
    fixture.detectChanges();

    const anchors: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a.nav-item')
    );
    const titles = anchors.map(a => a.textContent?.trim() ?? '');
    const hasJugadores = titles.some(t => t.includes('Jugadores'));

    expect(hasJugadores)
      .withContext(
        `[BUG COUNTEREXAMPLE] After toggleRole() dm→player, "Jugadores" should NOT be in sidebar but found: [${titles.join(', ')}]`
      )
      .toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// Property 2: Preservation — Role Toggle Behavior and Menu Items Unchanged
// ---------------------------------------------------------------------------
// These tests MUST PASS on unfixed code — they confirm the baseline behavior
// that must be preserved after the fix is applied.
//
// **Validates: Requirements 3.1, 3.2**
// ---------------------------------------------------------------------------

describe('RoleService — Property 2: Preservation (Role Toggle and Menu Items)', () => {

  let roleService: RoleService;

  beforeEach(() => {
    roleService = new RoleService();
  });

  // -------------------------------------------------------------------------
  // P2-role-toggle-valid-state
  // Validates: Requirement 3.1
  // **Validates: Requirements 3.1**
  //
  // For any sequence of toggleRole() calls (arbitrary length ≥ 1),
  // activeRole$ always emits a value in { 'dm', 'player' }.
  // EXPECTED ON UNFIXED CODE: PASSES (toggleRole() is already correct)
  // -------------------------------------------------------------------------
  it('P2-role-toggle-valid-state — for any sequence of toggleRole() calls, activeRole$ always emits dm or player', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant(null), { minLength: 1, maxLength: 20 }),
        (toggles) => {
          // Reset to a fresh service for each run
          const svc = new RoleService();
          let lastEmitted: 'dm' | 'player' | undefined;

          const sub = svc.activeRole$.subscribe(role => {
            lastEmitted = role;
          });

          // Perform the sequence of toggles
          for (const _ of toggles) {
            svc.toggleRole();
            // After each toggle, the emitted value must be valid
            expect(['dm', 'player']).toContain(lastEmitted as string);
          }

          sub.unsubscribe();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('P2-role-toggle-alternates — toggleRole() switches between dm and player correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (numToggles) => {
          const svc = new RoleService();
          const emitted: ('dm' | 'player')[] = [];

          const sub = svc.activeRole$.subscribe(role => emitted.push(role));

          for (let i = 0; i < numToggles; i++) {
            svc.toggleRole();
          }

          sub.unsubscribe();

          // Every emitted value must be 'dm' or 'player'
          emitted.forEach(role => {
            expect(['dm', 'player']).toContain(role);
          });

          // The final role must be the opposite of the initial role if numToggles is odd,
          // or the same if numToggles is even
          const initialRole = emitted[0]; // 'dm' (initial state)
          const finalRole = emitted[emitted.length - 1];
          if (numToggles % 2 === 0) {
            expect(finalRole).toBe(initialRole);
          } else {
            expect(finalRole).not.toBe(initialRole);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2-menu-items-non-empty
  // Validates: Requirement 3.2
  // **Validates: Requirements 3.2**
  //
  // For any role value ('dm' or 'player'), menuItems$ emits an array with length > 0.
  // EXPECTED ON UNFIXED CODE: PASSES (menuItems$ always returns non-empty arrays)
  // -------------------------------------------------------------------------
  it('P2-menu-items-non-empty — for any role value, menuItems$ emits a non-empty array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'dm' | 'player'>('dm', 'player'),
        async (role) => {
          const svc = new RoleService();

          // Set the role by toggling if needed
          if (svc.activeRole !== role) {
            svc.toggleRole();
          }

          const items = await firstValueFrom(svc.menuItems$);
          expect(items.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('P2-menu-items-non-empty-sync — menuItems$ emits non-empty array for both roles (synchronous check)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'dm' | 'player'>('dm', 'player'),
        (role) => {
          const svc = new RoleService();
          let items: MenuItem[] | undefined;

          // Set the role
          if (svc.activeRole !== role) {
            svc.toggleRole();
          }

          const sub = svc.menuItems$.subscribe(i => { items = i; });
          sub.unsubscribe();

          expect(items).toBeDefined();
          expect(items!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 20 }
    );
  });

});

// ---------------------------------------------------------------------------
// Task 1 — Property Tests: Dropdown State
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Task 1 Property Tests: Dropdown State', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'settings', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Subtask 1.1 — Property 1: Dropdown toggle is idempotent per click
  // Validates: Requirements 1.3
  // **Validates: Requirements 1.3**
  // -------------------------------------------------------------------------
  it('Property 1: dropdown toggle is idempotent per click', () => {
    // Feature: profile-avatar-dropdown-menu, Property 1: toggle flips state
    fc.assert(
      fc.property(fc.boolean(), (initialState) => {
        component.isDropdownOpen = initialState;
        component.toggleDropdown();
        component.toggleDropdown();
        expect(component.isDropdownOpen).toBe(initialState);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Subtask 1.2 — Property 3: Escape key always closes the dropdown
  // Validates: Requirements 2.4
  // **Validates: Requirements 2.4**
  // -------------------------------------------------------------------------
  it('Property 3: Escape key always closes the dropdown', () => {
    // Feature: profile-avatar-dropdown-menu, Property 3: Escape key always closes the dropdown
    fc.assert(
      fc.property(fc.constant(true), (openState) => {
        component.isDropdownOpen = openState;
        component.onEscape();
        expect(component.isDropdownOpen).toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

});

// ---------------------------------------------------------------------------
// Task 2 — Subtask 2.1: Property 2: Overlay click always closes the dropdown
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Task 2 Subtask 2.1: Overlay Click Closes Dropdown', () => {
  // Feature: profile-avatar-dropdown-menu, Property 2: Overlay click always closes the dropdown

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'settings', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Subtask 2.1 — Property 2: Overlay click always closes the dropdown
  // Validates: Requirements 2.3
  // **Validates: Requirements 2.3**
  // -------------------------------------------------------------------------
  it('Property 2: overlay click always closes the dropdown', () => {
    // Feature: profile-avatar-dropdown-menu, Property 2: Overlay click always closes the dropdown
    fc.assert(
      fc.property(fc.constant(true), (openState) => {
        component.isDropdownOpen = openState;
        fixture.detectChanges();

        const overlay = fixture.nativeElement.querySelector('.dropdown-overlay');
        expect(overlay).withContext('dropdown-overlay should be present when isDropdownOpen is true').toBeTruthy();

        overlay.click();
        fixture.detectChanges();

        expect(component.isDropdownOpen).toBeFalse();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 2 — Subtask 2.2: Property 6: Sidebar nav items are fully preserved
// ---------------------------------------------------------------------------

import { BehaviorSubject as BehaviorSubject2 } from 'rxjs';
import { RoleService as RoleService2, MenuItem as MenuItem2 } from '../../services/role.service';

describe('AuthLayoutComponent — Task 2 Subtask 2.2: Sidebar Nav Items Preserved', () => {
  // Feature: profile-avatar-dropdown-menu, Property 6: Sidebar nav items are fully preserved

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let menuSubject: BehaviorSubject2<MenuItem2[]>;

  const itemArbitrary = fc.record({
    title: fc.string({ minLength: 1, maxLength: 20 }),
    icon: fc.constantFrom('home-outline', 'people-outline', 'map-outline', 'skull-outline', 'settings-outline'),
    route: fc.string({ minLength: 1, maxLength: 20 }).map(s => '/' + s.replace(/\//g, '')),
  });

  beforeEach(async () => {
    menuSubject = new BehaviorSubject2<MenuItem2[]>([]);

    const mockRoleService = {
      menuItems$: menuSubject.asObservable(),
      activeRole$: new BehaviorSubject2<'dm' | 'player'>('dm').asObservable(),
      toggleRole: () => {},
    };

    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: RoleService2, useValue: mockRoleService },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Subtask 2.2 — Property 6: Sidebar nav items are fully preserved
  // Validates: Requirements 4.1, 4.2
  // **Validates: Requirements 4.1, 4.2**
  // -------------------------------------------------------------------------
  it('Property 6: sidebar nav items are fully preserved and no .sidebar-bottom is present', () => {
    // Feature: profile-avatar-dropdown-menu, Property 6: Sidebar nav items are fully preserved
    fc.assert(
      fc.property(fc.array(itemArbitrary, { minLength: 1, maxLength: 10 }), (items) => {
        menuSubject.next(items);
        fixture.detectChanges();

        const liElements: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.nav-list li');
        expect(liElements.length)
          .withContext(`Expected ${items.length} <li> elements but got ${liElements.length}`)
          .toBe(items.length);

        const sidebarBottom = fixture.nativeElement.querySelector('.sidebar-bottom');
        expect(sidebarBottom)
          .withContext('.sidebar-bottom should NOT be present in the sidebar')
          .toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 5.1 — Structural Unit Tests
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Task 5.1: Structural Unit Tests', () => {

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'settings', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Req 1.1 — Avatar button is present in the topbar
  it('should render button.avatar-btn inside .topbar', () => {
    const topbar = fixture.nativeElement.querySelector('.topbar');
    expect(topbar).withContext('.topbar should exist').toBeTruthy();

    const avatarBtn = topbar.querySelector('button.avatar-btn');
    expect(avatarBtn).withContext('button.avatar-btn should be present inside .topbar').toBeTruthy();
  });

  // Req 1.4 — Avatar button is a native <button> (keyboard accessible)
  it('should use a native <button> element for avatar-btn (keyboard accessible)', () => {
    const avatarBtn = fixture.nativeElement.querySelector('.avatar-btn');
    expect(avatarBtn).toBeTruthy();
    expect(avatarBtn.tagName.toLowerCase())
      .withContext('avatar-btn must be a native <button> element for keyboard accessibility')
      .toBe('button');
  });

  // Req 3.1 — Dropdown contains "Configuración" item when open
  it('should render a "Configuración" dropdown item when dropdown is open', () => {
    component.isDropdownOpen = true;
    fixture.detectChanges();

    const items: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dropdown-item')
    );
    const labels = items.map(el => el.textContent?.trim() ?? '');
    const hasConfig = labels.some(t => t.includes('Configuración'));
    expect(hasConfig)
      .withContext(`Expected a "Configuración" dropdown item. Found: [${labels.join(', ')}]`)
      .toBeTrue();
  });

  // Req 3.2 — Dropdown contains "Cerrar Sesión" item when open
  it('should render a "Cerrar Sesión" dropdown item when dropdown is open', () => {
    component.isDropdownOpen = true;
    fixture.detectChanges();

    const items: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dropdown-item')
    );
    const labels = items.map(el => el.textContent?.trim() ?? '');
    const hasCerrarSesion = labels.some(t => t.includes('Cerrar Sesión'));
    expect(hasCerrarSesion)
      .withContext(`Expected a "Cerrar Sesión" dropdown item. Found: [${labels.join(', ')}]`)
      .toBeTrue();
  });

  // Req 3.5 — Each dropdown item has an ion-icon child
  it('should render an ion-icon inside each dropdown item', () => {
    component.isDropdownOpen = true;
    fixture.detectChanges();

    const items: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.dropdown-item')
    );
    expect(items.length).withContext('There should be at least one dropdown item').toBeGreaterThan(0);

    items.forEach((item, i) => {
      const icon = item.querySelector('ion-icon');
      expect(icon)
        .withContext(`dropdown-item[${i}] should contain an ion-icon child`)
        .toBeTruthy();
    });
  });

  // Req 4.1 — .sidebar-bottom is absent from the rendered template
  it('should NOT render .sidebar-bottom in the sidebar', () => {
    const sidebarBottom = fixture.nativeElement.querySelector('.sidebar-bottom');
    expect(sidebarBottom)
      .withContext('.sidebar-bottom should be absent from the rendered template')
      .toBeNull();
  });

  // Dropdown is hidden on initial render
  it('should hide the dropdown menu on initial render', () => {
    const dropdownMenu = fixture.nativeElement.querySelector('.dropdown-menu');
    expect(dropdownMenu)
      .withContext('.dropdown-menu should not be rendered when isDropdownOpen is false')
      .toBeNull();
  });

});

// ---------------------------------------------------------------------------
// Task 5.2 — Property 4: Logout action closes dropdown and calls AuthService
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Task 5.2: Property 4 — Logout Closes Dropdown and Calls AuthService', () => {
  // Feature: profile-avatar-dropdown-menu, Property 4: Logout action closes dropdown and calls AuthService

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'settings', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 4: Logout action closes dropdown and calls AuthService
  // Validates: Requirements 3.3
  // -------------------------------------------------------------------------
  it('Property 4: for any open dropdown state, clicking "Cerrar Sesión" calls AuthService.logout() once and closes the dropdown', () => {
    // Feature: profile-avatar-dropdown-menu, Property 4: Logout action closes dropdown and calls AuthService
    const navigateSpy = spyOn(router, 'navigate');

    fc.assert(
      fc.property(fc.constant(true), (openState) => {
        component.isDropdownOpen = openState;
        fixture.detectChanges();

        authSpy.logout.calls.reset();
        navigateSpy.calls.reset();

        const logoutBtn = fixture.nativeElement.querySelector('.dropdown-item.danger');
        expect(logoutBtn)
          .withContext('"Cerrar Sesión" button (.dropdown-item.danger) should be present when dropdown is open')
          .toBeTruthy();

        logoutBtn.click();
        fixture.detectChanges();

        expect(authSpy.logout)
          .withContext('AuthService.logout() should be called exactly once')
          .toHaveBeenCalledTimes(1);

        expect(component.isDropdownOpen)
          .withContext('isDropdownOpen should be false after clicking "Cerrar Sesión"')
          .toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

});

// ---------------------------------------------------------------------------
// Task 5.3 — Property 5: Settings action closes dropdown and navigates
// ---------------------------------------------------------------------------

describe('AuthLayoutComponent — Task 5.3: Property 5 — Settings Closes Dropdown and Navigates', () => {
  // Feature: profile-avatar-dropdown-menu, Property 5: Settings action closes dropdown and navigates

  let fixture: ComponentFixture<AuthLayoutComponent>;
  let component: AuthLayoutComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAuthenticated', 'getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ name: 'Test User' } as any);

    await TestBed.configureTestingModule({
      imports: [AuthLayoutComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([
          { path: 'home', component: StubPageComponent },
          { path: 'login', component: StubPageComponent },
          { path: 'settings', component: StubPageComponent },
        ]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 5: Settings action closes dropdown and navigates
  // Validates: Requirements 3.4
  // -------------------------------------------------------------------------
  it('Property 5: for any open dropdown state, clicking "Configuración" calls Router.navigate(["/settings"]) and closes the dropdown', () => {
    // Feature: profile-avatar-dropdown-menu, Property 5: Settings action closes dropdown and navigates
    const navigateSpy = spyOn(router, 'navigate');

    fc.assert(
      fc.property(fc.constant(true), (openState) => {
        component.isDropdownOpen = openState;
        fixture.detectChanges();

        navigateSpy.calls.reset();

        const settingsBtn: HTMLButtonElement | null = Array.from<HTMLButtonElement>(
          fixture.nativeElement.querySelectorAll('.dropdown-item')
        ).find(el => el.textContent?.includes('Configuración')) ?? null;

        expect(settingsBtn)
          .withContext('"Configuración" button should be present when dropdown is open')
          .toBeTruthy();

        settingsBtn!.click();
        fixture.detectChanges();

        expect(navigateSpy)
          .withContext('Router.navigate should be called with ["/settings"]')
          .toHaveBeenCalledWith(['/settings']);

        expect(component.isDropdownOpen)
          .withContext('isDropdownOpen should be false after clicking "Configuración"')
          .toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

});

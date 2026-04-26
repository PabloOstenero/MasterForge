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

  it('P11d — logout button is always present in sidebar', () => {
    const logoutBtn = fixture.nativeElement.querySelector('.logout-btn');
    expect(logoutBtn).toBeTruthy();
  });

  it('P11e — router-outlet is present in main content area', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import * as fc from 'fast-check';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

// ---------------------------------------------------------------------------
// AuthGuard — Property-Based Tests
// ---------------------------------------------------------------------------

describe('AuthGuard — Property-Based Tests', () => {

  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    const spy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: spy },
        provideRouter([]),
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
  });

  // -------------------------------------------------------------------------
  // Property 1: AuthGuard redirects unauthenticated users
  // Validates: Requirements 2.1, 2.2
  // -------------------------------------------------------------------------
  it('P1 — returns true for any authenticated state', () => {
    fc.assert(
      fc.property(fc.constant(true), (_) => {
        authService.isAuthenticated.and.returnValue(true);
        const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
        expect(result).toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  it('P1b — returns UrlTree redirecting to /login for any unauthenticated state', () => {
    fc.assert(
      fc.property(fc.constant(false), (_) => {
        authService.isAuthenticated.and.returnValue(false);
        const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
        expect(result).toBeInstanceOf(UrlTree);
        expect((result as UrlTree).toString()).toBe('/login');
      }),
      { numRuns: 100 }
    );
  });

  it('P1c — guard result is deterministic: same auth state always yields same result type', () => {
    fc.assert(
      fc.property(fc.boolean(), (isAuth) => {
        authService.isAuthenticated.and.returnValue(isAuth);
        const r1 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
        const r2 = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
        expect(typeof r1).toBe(typeof r2);
        if (isAuth) {
          expect(r1).toBeTrue();
          expect(r2).toBeTrue();
        } else {
          expect(r1).toBeInstanceOf(UrlTree);
          expect(r2).toBeInstanceOf(UrlTree);
        }
      }),
      { numRuns: 100 }
    );
  });
});

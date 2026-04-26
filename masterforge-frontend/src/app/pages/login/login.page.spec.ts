import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { LoginPage } from './login.page';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const tokenArb = fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0);
const blankStringArb = fc.stringMatching(/^\s*$/);

// ---------------------------------------------------------------------------
// LoginPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('LoginPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'storeToken', 'isAuthenticated']);
    authSpy.login.and.returnValue(of({ token: 'test-token' }));

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 1 (login validation): Empty fields prevent API call
  // Validates: Requirement 1.7
  // -------------------------------------------------------------------------
  it('P1 — empty email prevents API call and sets error', () => {
    fc.assert(
      fc.property(blankStringArb, nonEmptyStringArb, (email, password) => {
        authSpy.login.calls.reset();
        component.email = email;
        component.password = password;
        component.errorMessage = null;
        component.onSubmit();
        expect(authSpy.login).not.toHaveBeenCalled();
        expect(component.errorMessage).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('P1b — empty password prevents API call and sets error', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, blankStringArb, (email, password) => {
        authSpy.login.calls.reset();
        component.email = email;
        component.password = password;
        component.errorMessage = null;
        component.onSubmit();
        expect(authSpy.login).not.toHaveBeenCalled();
        expect(component.errorMessage).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('P1c — both fields empty prevents API call and sets error', () => {
    fc.assert(
      fc.property(blankStringArb, blankStringArb, (email, password) => {
        authSpy.login.calls.reset();
        component.email = email;
        component.password = password;
        component.errorMessage = null;
        component.onSubmit();
        expect(authSpy.login).not.toHaveBeenCalled();
        expect(component.errorMessage).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Successful login stores token and navigates to /home
  // Validates: Requirements 1.4, 1.5
  // -------------------------------------------------------------------------
  it('P2 — successful login stores token for any valid token string', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, nonEmptyStringArb, tokenArb, (email, password, token) => {
        authSpy.login.and.returnValue(of({ token }));
        authSpy.storeToken.calls.reset();
        component.email = email;
        component.password = password;
        component.onSubmit();
        expect(authSpy.storeToken).toHaveBeenCalledWith(token);
      }),
      { numRuns: 100 }
    );
  });

  it('P2b — successful login navigates to /home', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fc.assert(
      fc.property(nonEmptyStringArb, nonEmptyStringArb, tokenArb, (email, password, token) => {
        authSpy.login.and.returnValue(of({ token }));
        navigateSpy.calls.reset();
        component.email = email;
        component.password = password;
        component.onSubmit();
        expect(navigateSpy).toHaveBeenCalledWith(['/home']);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property: Login error shows error message and stays on page
  // Validates: Requirement 1.6
  // -------------------------------------------------------------------------
  it('P — API error sets errorMessage and does not navigate', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fc.assert(
      fc.property(nonEmptyStringArb, nonEmptyStringArb, fc.string({ minLength: 1 }), (email, password, errMsg) => {
        authSpy.login.and.returnValue(throwError(() => ({ error: { message: errMsg } })));
        navigateSpy.calls.reset();
        component.email = email;
        component.password = password;
        component.errorMessage = null;
        component.onSubmit();
        expect(component.errorMessage).toBeTruthy();
        expect(navigateSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});

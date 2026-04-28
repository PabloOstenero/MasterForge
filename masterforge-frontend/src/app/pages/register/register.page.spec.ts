import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import * as fc from 'fast-check';

import { RegisterPage } from './register.page';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const blankStringArb = fc.stringMatching(/^\s*$/);

// ---------------------------------------------------------------------------
// RegisterPage — Render Unit Tests
// ---------------------------------------------------------------------------

describe('RegisterPage — Render', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'register', 'storeToken', 'isAuthenticated']);
    authSpy.register.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();
  });

  it('renders all four input fields and the submit button', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="name-input"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="email-input"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="password-input"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="confirm-password-input"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="submit-button"]')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// RegisterPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('RegisterPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<RegisterPage>;
  let component: RegisterPage;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'register', 'storeToken', 'isAuthenticated']);
    authSpy.register.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 1: Empty fields are always rejected
  // Feature: register-page-styling, Property 1: Empty fields are always rejected
  // Validates: Requirements 3.1, 3.4
  // -------------------------------------------------------------------------
  it('P1 — empty fields are always rejected', () => {
    // Feature: register-page-styling, Property 1: Empty fields are always rejected
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.string(), fc.string(), fc.string()).filter(
          ([n, e, p, c]) =>
            n.trim() === '' || e.trim() === '' || p.trim() === '' || c.trim() === ''
        ),
        ([name, email, password, confirmPassword]) => {
          authSpy.register.calls.reset();
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = confirmPassword;
          component.errorMessage = null;
          component.onSubmit();
          expect(component.errorMessage as string | null).toBe('Todos los campos son obligatorios.');
          expect(authSpy.register).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Password mismatch is rejected
  // Feature: register-page-styling, Property 2: Password mismatch is rejected
  // Validates: Requirements 3.2, 3.4
  // -------------------------------------------------------------------------
  it('P2 — password mismatch is rejected', () => {
    // Feature: register-page-styling, Property 2: Password mismatch is rejected
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (name, email, password, confirmPassword) => {
          fc.pre(password !== confirmPassword);
          authSpy.register.calls.reset();
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = confirmPassword;
          component.errorMessage = null;
          component.onSubmit();
          expect(component.errorMessage as string | null).toBe('Las contraseñas no coinciden.');
          expect(authSpy.register).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Valid input reaches the API
  // Feature: register-page-styling, Property 3: Valid input reaches the API
  // Validates: Requirements 4.1
  // -------------------------------------------------------------------------
  it('P3 — valid input reaches the API', () => {
    // Feature: register-page-styling, Property 3: Valid input reaches the API
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (name, email, password) => {
          authSpy.register.and.returnValue(of({}));
          authSpy.register.calls.reset();
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = password;
          component.errorMessage = null;
          component.onSubmit();
          expect(authSpy.register).toHaveBeenCalledOnceWith(name, email, password);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Successful registration navigates to /login
  // Feature: register-page-styling, Property 4: Successful registration navigates to /login
  // Validates: Requirements 4.2
  // -------------------------------------------------------------------------
  it('P4 — successful registration navigates to /login', async () => {
    // Feature: register-page-styling, Property 4: Successful registration navigates to /login
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (name, email, password) => {
          authSpy.register.and.returnValue(of({}));
          navigateSpy.calls.reset();
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = password;
          component.isLoading = false;
          component.onSubmit();
          expect(navigateSpy).toHaveBeenCalledWith(['/login']);
          expect(component.isLoading).toBeFalse();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: API error surfaces to the user
  // Feature: register-page-styling, Property 5: API error surfaces to the user
  // Validates: Requirements 4.3, 4.4
  // -------------------------------------------------------------------------
  it('P5 — API error with message surfaces the message', () => {
    // Feature: register-page-styling, Property 5: API error surfaces to the user
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.string({ minLength: 1 }),
        (name, email, password, errMsg) => {
          authSpy.register.and.returnValue(throwError(() => ({ error: { message: errMsg } })));
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = password;
          component.errorMessage = null;
          component.isLoading = false;
          component.onSubmit();
          expect(component.errorMessage as string | null).toBe(errMsg);
          expect(component.isLoading).toBeFalse();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('P5b — API error without message uses fallback', () => {
    // Feature: register-page-styling, Property 5: API error surfaces to the user
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (name, email, password) => {
          authSpy.register.and.returnValue(throwError(() => ({})));
          component.name = name;
          component.email = email;
          component.password = password;
          component.confirmPassword = password;
          component.errorMessage = null;
          component.isLoading = false;
          component.onSubmit();
          expect(component.errorMessage as string | null).toBe('Error al registrar. Inténtalo de nuevo.');
          expect(component.isLoading).toBeFalse();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: Loading state disables the form
  // Feature: register-page-styling, Property 6: Loading state disables the form
  // Validates: Requirements 2.6
  // -------------------------------------------------------------------------
  it('P6 — isLoading is true immediately after submit while observable is pending', () => {
    // Feature: register-page-styling, Property 6: Loading state disables the form
    const subject = new Subject<any>();
    authSpy.register.and.returnValue(subject.asObservable());

    component.name = 'TestUser';
    component.email = 'test@example.com';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.isLoading = false;

    component.onSubmit();

    // Before the subject emits, isLoading should be true
    expect(component.isLoading).toBeTrue();

    // Clean up
    subject.complete();
  });
});

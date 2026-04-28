import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpRequest } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import * as fc from 'fast-check';

import { AuthService, authInterceptor } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tokenArb = fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length > 0);

// ---------------------------------------------------------------------------
// AuthService — Property-Based Tests
// ---------------------------------------------------------------------------

describe('AuthService — Property-Based Tests', () => {

  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // Property 2: Login stores token and redirects on success
  // Validates: Requirements 1.4
  // -------------------------------------------------------------------------
  it('P2 — storeToken persists any token string in localStorage under mf_token', () => {
    fc.assert(
      fc.property(tokenArb, (token) => {
        service.storeToken(token);
        expect(localStorage.getItem('mf_token')).toBe(token);
      }),
      { numRuns: 100 }
    );
  });

  it('P2b — getToken returns exactly what was stored by storeToken', () => {
    fc.assert(
      fc.property(tokenArb, (token) => {
        service.storeToken(token);
        expect(service.getToken()).toBe(token);
      }),
      { numRuns: 100 }
    );
  });

  it('P2c — isAuthenticated returns true for any stored token', () => {
    fc.assert(
      fc.property(tokenArb, (token) => {
        service.storeToken(token);
        expect(service.isAuthenticated()).toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Logout clears token
  // Validates: Requirement 2.5
  // -------------------------------------------------------------------------
  it('P4 — logout removes any previously stored token', () => {
    fc.assert(
      fc.property(tokenArb, (token) => {
        service.storeToken(token);
        expect(service.isAuthenticated()).toBeTrue();
        service.logout();
        expect(service.getToken()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

  it('P4b — isAuthenticated returns false when no token is present', () => {
    localStorage.clear();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getToken()).toBeNull();
  });

  it('P4c — logout is idempotent: calling it multiple times leaves token absent', () => {
    fc.assert(
      fc.property(tokenArb, fc.integer({ min: 1, max: 5 }), (token, times) => {
        service.storeToken(token);
        for (let i = 0; i < times; i++) {
          service.logout();
        }
        expect(service.isAuthenticated()).toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4 (explicit): For any non-empty token string, logout clears it
  // Validates: Requirement 2.5
  // **Validates: Requirements 2.5**
  // -------------------------------------------------------------------------
  it('P4-explicit — for any non-empty token string, logout removes it from localStorage and isAuthenticated returns false', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (token) => {
        localStorage.setItem('mf_token', token);
        expect(service.isAuthenticated()).toBeTrue();
        service.logout();
        expect(localStorage.getItem('mf_token')).toBeNull();
        expect(service.getToken()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: HTTP interceptor attaches token
  // Validates: Requirement 2.4
  // -------------------------------------------------------------------------
  it('P3 — authInterceptor attaches Authorization header when token is present', () => {
    fc.assert(
      fc.property(tokenArb, (token) => {
        localStorage.setItem('mf_token', token);

        let capturedReq: HttpRequest<unknown> | null = null;
        const mockNext = (req: HttpRequest<unknown>) => {
          capturedReq = req;
          return { subscribe: () => {} } as any;
        };

        const mockReq = new HttpRequest('GET', 'http://localhost:8080/api/sessions');
        authInterceptor(mockReq, mockNext as any);

        expect(capturedReq).not.toBeNull();
        expect((capturedReq as any).headers.get('Authorization')).toBe(`Bearer ${token}`);
        localStorage.removeItem('mf_token');
      }),
      { numRuns: 100 }
    );
  });

  it('P3b — authInterceptor does NOT attach Authorization header when no token', () => {
    localStorage.removeItem('mf_token');

    let capturedReq: HttpRequest<unknown> | null = null;
    const mockNext = (req: HttpRequest<unknown>) => {
      capturedReq = req;
      return { subscribe: () => {} } as any;
    };

    const mockReq = new HttpRequest('GET', 'http://localhost:8080/api/sessions');
    authInterceptor(mockReq, mockNext as any);

    expect(capturedReq).not.toBeNull();
    expect((capturedReq as any).headers.get('Authorization')).toBeNull();
  });

  it('P3c — authInterceptor passes original request unchanged when no token', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
        fc.webUrl(),
        (method, url) => {
          localStorage.removeItem('mf_token');
          let capturedReq: HttpRequest<unknown> | null = null;
          const mockNext = (req: HttpRequest<unknown>) => {
            capturedReq = req;
            return { subscribe: () => {} } as any;
          };
          const mockReq = new HttpRequest(method as any, url);
          authInterceptor(mockReq, mockNext as any);
          // Without a token the interceptor passes the original request through unchanged
          expect(capturedReq).not.toBeNull();
          expect((capturedReq as unknown as HttpRequest<unknown>).url).toBe(url);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// AuthService.register() — Unit Test
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

describe('AuthService.register()', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should POST to /api/users with the correct body shape', () => {
    service.register('TestName', 'test@example.com', 'password123').subscribe();

    const req = httpMock.expectOne(r => r.url.endsWith('/api/users'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'TestName',
      email: 'test@example.com',
      passwordHash: 'password123',
      subscriptionTier: 'FREE',
      balance: 0,
      isActive: true
    });

    req.flush({ id: '1', name: 'TestName' });
  });
});

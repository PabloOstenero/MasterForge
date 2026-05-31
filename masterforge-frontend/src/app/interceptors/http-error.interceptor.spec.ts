/**
 * Unit tests for httpErrorInterceptor.
 *
 * Tests cover:
 * - Successful requests pass through unchanged
 * - ErrorHandlerService.logError() is called on HTTP errors
 * - Timeout is applied to requests (delayed response triggers timeout)
 *
 * Validates: Requirements 7.1, 7.2, 7.5
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
} from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { httpErrorInterceptor } from './http-error.interceptor';
import { ErrorHandlerService } from '../services/error-handler.service';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('httpErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let errorHandlerService: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    errorHandlerService = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // Successful requests
  // -------------------------------------------------------------------------

  it('should pass through successful requests unchanged', () => {
    const mockData = { id: 1, name: 'Test' };
    let received: unknown = null;

    httpClient.get('/api/test').subscribe((data) => {
      received = data;
    });

    const req = httpMock.expectOne('/api/test');
    req.flush(mockData);

    expect(received).toEqual(mockData);
  });

  // -------------------------------------------------------------------------
  // Error logging
  // -------------------------------------------------------------------------

  it('should call ErrorHandlerService.logError() on HTTP errors', () => {
    spyOn(errorHandlerService, 'logError');
    let errorReceived = false;

    httpClient.get('/api/test').subscribe({
      error: () => { errorReceived = true; },
    });

    const req = httpMock.expectOne('/api/test');
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(errorHandlerService.logError).toHaveBeenCalled();
    expect(errorReceived).toBeTrue();
  });

  it('should call ErrorHandlerService.logError() with "HttpInterceptor" context', () => {
    spyOn(errorHandlerService, 'logError');

    httpClient.get('/api/test').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(errorHandlerService.logError).toHaveBeenCalledWith(
      'HttpInterceptor',
      jasmine.anything(),
    );
  });

  // -------------------------------------------------------------------------
  // Timeout handling
  // -------------------------------------------------------------------------

  it('should trigger timeout error when response is delayed beyond 10 seconds', fakeAsync(() => {
    spyOn(errorHandlerService, 'logError');
    let errorReceived: unknown = null;

    httpClient.get('/api/slow').subscribe({
      error: (err) => { errorReceived = err; },
    });

    // Expect the request but do NOT flush it — simulating a delayed response
    httpMock.expectOne('/api/slow');

    // Advance time past the 10-second timeout
    tick(10_001);

    expect(errorReceived).toBeTruthy();
    // The error should be a TimeoutError from rxjs
    expect((errorReceived as Error).name).toBe('TimeoutError');
    expect(errorHandlerService.logError).toHaveBeenCalledWith('HttpInterceptor', errorReceived);
  }));
});

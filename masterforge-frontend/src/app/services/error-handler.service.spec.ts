/**
 * Unit tests for ErrorHandlerService.
 *
 * Tests cover:
 * - HTTP error mapping for all handled status codes
 * - Timeout error handling
 * - Validation error message mapping (Spanish UI text)
 * - Error logging
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { ErrorHandlerService } from './error-handler.service';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlerService],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  // -------------------------------------------------------------------------
  // handleHttpError()
  // -------------------------------------------------------------------------

  describe('handleHttpError()', () => {
    function makeHttpError(status: number, body: unknown = {}): HttpErrorResponse {
      return new HttpErrorResponse({ status, error: body, url: '/test' });
    }

    it('should return "temporarily unavailable" message for status 0', (done) => {
      service.handleHttpError(makeHttpError(0)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('temporarily unavailable');
          done();
        },
      });
    });

    it('should return "Authentication required" message for status 401', (done) => {
      service.handleHttpError(makeHttpError(401)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Authentication required');
          done();
        },
      });
    });

    it('should return "permission" message for status 403', (done) => {
      service.handleHttpError(makeHttpError(403)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('permission');
          done();
        },
      });
    });

    it('should return "not found" message for status 404', (done) => {
      service.handleHttpError(makeHttpError(404)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('not found');
          done();
        },
      });
    });

    it('should use error.error.message for status 409 when present', (done) => {
      const body = { message: 'Already enrolled in this campaign' };
      service.handleHttpError(makeHttpError(409, body)).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Already enrolled in this campaign');
          done();
        },
      });
    });

    it('should return fallback message for status 409 when no error.error.message', (done) => {
      service.handleHttpError(makeHttpError(409, {})).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Conflict');
          done();
        },
      });
    });

    it('should return "Server error" message for status 500', (done) => {
      service.handleHttpError(makeHttpError(500)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Server error');
          done();
        },
      });
    });

    it('should include the status code in the message for unknown status codes', (done) => {
      service.handleHttpError(makeHttpError(418)).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('418');
          done();
        },
      });
    });

    it('should use error.error.message for unknown status when present', (done) => {
      const body = { message: 'Custom backend error' };
      service.handleHttpError(makeHttpError(422, body)).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Custom backend error');
          done();
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // handleTimeoutError()
  // -------------------------------------------------------------------------

  describe('handleTimeoutError()', () => {
    it('should return an error containing "timed out"', (done) => {
      service.handleTimeoutError().subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('timed out');
          done();
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // handleNetworkError()
  // -------------------------------------------------------------------------

  describe('handleNetworkError()', () => {
    it('should re-throw the provided error', (done) => {
      const originalError = new Error('Network failure');
      service.handleNetworkError(originalError).subscribe({
        error: (err: Error) => {
          expect(err).toBe(originalError);
          done();
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // logError()
  // -------------------------------------------------------------------------

  describe('logError()', () => {
    it('should call console.error with the context and error', () => {
      spyOn(console, 'error');
      const error = new Error('test error');
      service.logError('TestContext', error);
      expect(console.error).toHaveBeenCalledWith('[TestContext]', error);
    });

    it('should call console.error with non-Error objects', () => {
      spyOn(console, 'error');
      service.logError('TestContext', 'string error');
      expect(console.error).toHaveBeenCalledWith('[TestContext]', 'string error');
    });
  });

  // -------------------------------------------------------------------------
  // getValidationErrorMessage()
  // -------------------------------------------------------------------------

  describe('getValidationErrorMessage()', () => {
    it('should return empty string when errors is null', () => {
      const result = service.getValidationErrorMessage('field', null);
      expect(result).toBe('');
    });

    it('should return "obligatorio" message for required error', () => {
      const result = service.getValidationErrorMessage('field', { required: true });
      expect(result).toContain('obligatorio');
    });

    it('should return "Mínimo" message with required length for minlength error', () => {
      const result = service.getValidationErrorMessage('field', {
        minlength: { requiredLength: 3, actualLength: 1 },
      });
      expect(result).toContain('Mínimo');
      expect(result).toContain('3');
    });

    it('should return "Formato inválido" for pattern error', () => {
      const result = service.getValidationErrorMessage('field', { pattern: { requiredPattern: '\\d+', actualValue: 'abc' } });
      expect(result).toContain('Formato inválido');
    });

    it('should return "tarjeta" message for invalidCardNumber error', () => {
      const result = service.getValidationErrorMessage('cardNumber', { invalidCardNumber: true });
      expect(result).toContain('tarjeta');
    });

    it('should return "MM/AA" message for invalidExpiry error', () => {
      const result = service.getValidationErrorMessage('expiryDate', { invalidExpiry: true });
      expect(result).toContain('MM/AA');
    });

    it('should return "expirado" message for expiredCard error', () => {
      const result = service.getValidationErrorMessage('expiryDate', { expiredCard: true });
      expect(result).toContain('expirado');
    });

    it('should prioritise required over other errors when multiple errors present', () => {
      const result = service.getValidationErrorMessage('field', {
        required: true,
        minlength: { requiredLength: 3, actualLength: 0 },
      });
      expect(result).toContain('obligatorio');
    });
  });
});

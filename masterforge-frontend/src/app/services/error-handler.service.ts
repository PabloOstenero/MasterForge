/**
 * ErrorHandlerService — centralised error handling utility for the Search Campaigns feature.
 *
 * Provides:
 * - HTTP error mapping to user-friendly messages
 * - Timeout error handling
 * - Generic network error handling
 * - Error logging
 * - Form validation error message mapping (Spanish UI text)
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {

  // -------------------------------------------------------------------------
  // HTTP error handling
  // -------------------------------------------------------------------------

  /**
   * Maps an HttpErrorResponse to a user-friendly error Observable.
   *
   * Validates: Requirements 7.1, 7.2, 7.5
   */
  handleHttpError(error: HttpErrorResponse): Observable<never> {
    let message: string;

    switch (error.status) {
      case 0:
        message = 'Service temporarily unavailable. Please check your connection.';
        break;
      case 401:
        message = 'Authentication required. Please log in again.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'Resource not found.';
        break;
      case 409:
        message = error.error?.message ?? 'Conflict error.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = error.error?.message ?? `Unexpected error (${error.status}).`;
    }

    return throwError(() => new Error(message));
  }

  /**
   * Returns a timeout error Observable with a user-friendly message.
   *
   * Validates: Requirement 7.5
   */
  handleTimeoutError(): Observable<never> {
    return throwError(
      () => new Error('Request timed out after 10 seconds. Please try again.'),
    );
  }

  /**
   * Generic fallback for non-HTTP errors.
   *
   * Validates: Requirement 7.2
   */
  handleNetworkError(error: Error): Observable<never> {
    return throwError(() => error);
  }

  // -------------------------------------------------------------------------
  // Logging
  // -------------------------------------------------------------------------

  /**
   * Logs an error to the console with a context prefix.
   *
   * Validates: Requirement 7.2
   */
  logError(context: string, error: unknown): void {
    console.error(`[${context}]`, error);
  }

  // -------------------------------------------------------------------------
  // Form validation messages
  // -------------------------------------------------------------------------

  /**
   * Maps Angular ValidationErrors to a user-friendly Spanish message.
   * Returns the message for the first error found, or an empty string if
   * there are no errors.
   *
   * Validates: Requirements 7.3, 7.4
   */
  getValidationErrorMessage(field: string, errors: ValidationErrors | null): string {
    if (!errors) return '';

    if (errors['required']) {
      return 'Este campo es obligatorio';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength as number;
      return `Mínimo ${requiredLength} caracteres`;
    }

    if (errors['pattern']) {
      return 'Formato inválido';
    }

    if (errors['invalidCardNumber']) {
      return 'Número de tarjeta inválido (16 dígitos)';
    }

    if (errors['invalidExpiry']) {
      return 'Fecha de expiración inválida (MM/AA)';
    }

    if (errors['expiredCard']) {
      return 'La tarjeta ha expirado';
    }

    // Fallback for unknown error keys
    const firstKey = Object.keys(errors)[0];
    return firstKey ? `Error de validación: ${firstKey}` : '';
  }
}

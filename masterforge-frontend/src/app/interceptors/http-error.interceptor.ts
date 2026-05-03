/**
 * httpErrorInterceptor — Angular HTTP interceptor for centralised error logging
 * and request timeout enforcement.
 *
 * Responsibilities:
 * - Adds a 10-second timeout to every outgoing HTTP request
 * - Logs all HTTP errors via ErrorHandlerService
 * - Re-throws errors so individual services can handle user-facing messages
 *
 * NOTE: Retry logic intentionally stays in individual services (CampaignSearchService,
 * PaymentService) to allow per-service retry policies (e.g. no retries for payments).
 *
 * Validates: Requirements 7.1, 7.2, 7.5
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { ErrorHandlerService } from '../services/error-handler.service';
import { environment } from '../../environments/environment';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlerService);

  return next(req).pipe(
    timeout(environment.requestTimeoutMs),
    catchError((error: unknown) => {
      errorHandler.logError('HttpInterceptor', error);

      if (error instanceof HttpErrorResponse) {
        // Re-throw as-is; individual services map to user-friendly messages
        return throwError(() => error);
      }

      // Timeout or other errors — re-throw unchanged
      return throwError(() => error);
    }),
  );
};

/**
 * PaymentService — mock payment processing for academic demonstration.
 *
 * ⚠️  ACADEMIC DISCLAIMER ⚠️
 * This service simulates payment processing for demonstration purposes only.
 * No real financial transactions are performed. All payment data is mock/fake
 * and is used solely to demonstrate the complete campaign enrollment workflow
 * as part of an academic project (TFG).
 *
 * Validates: Requirements 5.2, 5.7, 5.8
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';

import {
  PaymentData,
  PaymentResult,
  PaymentScenario,
  PaymentTransaction,
} from '../shared/models/payment.models';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = 'http://localhost:8080/api';

/** HTTP request timeout in milliseconds (10 seconds). */
const REQUEST_TIMEOUT_MS = 10_000;

/** Maximum retry attempts for non-payment-critical requests. */
const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Request / response shapes expected by the backend
// ---------------------------------------------------------------------------

/**
 * Payload sent to POST /api/payments/process.
 *
 * ⚠️  ACADEMIC DISCLAIMER: All card data is mock/simulated.
 */
interface ProcessPaymentRequest {
  campaignId: string;
  amount: number;
  mockCardData: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
  /** Optional scenario override for testing purposes. */
  simulationScenario?: PaymentScenario;
}

/**
 * Payload sent to POST /api/payments/simulate.
 *
 * ⚠️  ACADEMIC DISCLAIMER: Simulation only — no real payment is processed.
 */
interface SimulatePaymentRequest {
  scenario: PaymentScenario;
  campaignId?: string;
  amount?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Processes a mock payment for joining a paid campaign.
   *
   * ⚠️  ACADEMIC DISCLAIMER: This is a simulated payment — no real money
   * is charged. The payment gateway is mocked for academic demonstration.
   *
   * Validates: Requirements 5.2, 5.7
   */
  processPayment(paymentData: PaymentData): Observable<PaymentResult> {
    const requestBody: ProcessPaymentRequest = {
      campaignId: paymentData.campaignId,
      amount: paymentData.amount,
      mockCardData: {
        cardNumber: paymentData.cardData.cardNumber,
        expiryDate: paymentData.cardData.expiryDate,
        cvv: paymentData.cardData.cvv,
        cardholderName: paymentData.cardData.cardholderName,
      },
      simulationScenario: paymentData.simulationScenario,
    };

    return this.http
      .post<PaymentResult>(`${API_URL}/payments/process`, requestBody)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Simulates a specific payment scenario for testing and demonstration.
   *
   * Supported scenarios:
   * - SUCCESS            : Payment succeeds and enrollment is confirmed
   * - INSUFFICIENT_FUNDS : Payment fails with "insufficient funds" error
   * - CARD_DECLINED      : Payment fails with "card declined" error
   * - NETWORK_ERROR      : Payment fails due to a simulated network error
   * - TIMEOUT            : Payment fails due to a simulated timeout
   *
   * ⚠️  ACADEMIC DISCLAIMER: All scenarios are simulated — no real payment
   * gateway is involved. This feature exists for academic demonstration only.
   *
   * Validates: Requirements 5.8
   */
  simulatePaymentScenario(scenario: PaymentScenario): Observable<PaymentResult> {
    const requestBody: SimulatePaymentRequest = { scenario };

    return this.http
      .post<PaymentResult>(`${API_URL}/payments/simulate`, requestBody)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        catchError((err) => this.handleError(err)),
      );
  }

  /**
   * Retrieves the mock payment transaction history for the authenticated user.
   *
   * ⚠️  ACADEMIC DISCLAIMER: These are simulated transaction records stored
   * for audit and demonstration purposes only.
   *
   * Validates: Requirements 5.6, 5.7
   */
  getPaymentHistory(): Observable<PaymentTransaction[]> {
    return this.http
      .get<PaymentTransaction[]>(`${API_URL}/payments/history`)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        retry({ count: MAX_RETRIES, delay: (_err, count) => {
          const delayMs = Math.pow(2, count - 1) * 1000;
          return new Observable(observer => {
            setTimeout(() => { observer.next(0); observer.complete(); }, delayMs);
          });
        }}),
        catchError((err) => this.handleError(err)),
      );
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Centralised error handler for payment-related HTTP errors.
   */
  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      let message: string;

      switch (error.status) {
        case 0:
          message = 'Payment service temporarily unavailable. Please try again.';
          break;
        case 400:
          message = error.error?.message ?? 'Invalid payment data. Please check your card details.';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          break;
        case 402:
          // Simulated payment failure
          message = error.error?.message ?? 'Payment failed: insufficient funds.';
          break;
        case 422:
          message = error.error?.message ?? 'Payment declined. Please try a different card.';
          break;
        case 500:
          message = 'Payment processing error. Please try again later.';
          break;
        default:
          message = error.error?.message ?? `Payment error (${error.status}).`;
      }

      return throwError(() => new Error(message));
    }

    if (error instanceof Error && error.name === 'TimeoutError') {
      return throwError(
        () => new Error('Payment request timed out. Please try again.'),
      );
    }

    return throwError(() => error);
  }
}

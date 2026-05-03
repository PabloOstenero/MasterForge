/**
 * Unit tests for PaymentService.
 *
 * ⚠️  ACADEMIC DISCLAIMER: All tests use mock/simulated payment data.
 * No real financial transactions are performed.
 *
 * Tests cover:
 * - processPayment() HTTP method, URL, and request body
 * - simulatePaymentScenario() for all PaymentScenario values
 * - getPaymentHistory() HTTP method and URL
 * - Error handling for common HTTP status codes
 *
 * Validates: Requirements 5.2, 5.7, 5.8
 */

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';

import { PaymentService } from './payment.service';
import {
  PaymentData,
  PaymentResult,
  PaymentScenario,
  PaymentTransaction,
  PaymentStatus,
  CampaignVisibility,
} from '../pages/search-campaigns/models/campaign.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080/api';

function makePaymentData(overrides: Partial<PaymentData> = {}): PaymentData {
  return {
    campaignId: 'camp-1',
    amount: 9.99,
    cardData: {
      cardNumber: '4111111111111111',
      expiryDate: '12/26',
      cvv: '123',
      cardholderName: 'Test User',
    },
    ...overrides,
  };
}

function makePaymentResult(success = true): PaymentResult {
  return {
    success,
    transactionId: success ? 'txn-abc-123' : undefined,
    errorMessage: success ? undefined : 'Card declined',
    enrollmentConfirmed: success,
  };
}

function makePaymentTransaction(): PaymentTransaction {
  return {
    id: 'txn-1',
    userId: 'user-1',
    campaignId: 'camp-1',
    amount: 9.99,
    status: PaymentStatus.COMPLETED,
    processedAt: new Date(),
    mockCardLastFour: '1111',
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // processPayment()
  // -------------------------------------------------------------------------

  describe('processPayment()', () => {
    it('should POST to /api/payments/process', () => {
      const paymentData = makePaymentData();
      const mockResult = makePaymentResult(true);

      service.processPayment(paymentData).subscribe((result) => {
        expect(result).toEqual(mockResult);
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResult);
    });

    it('should send campaignId, amount, and mockCardData in the request body', () => {
      const paymentData = makePaymentData();

      service.processPayment(paymentData).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      const body = req.request.body;

      expect(body.campaignId).toBe('camp-1');
      expect(body.amount).toBe(9.99);
      expect(body.mockCardData).toBeDefined();
      expect(body.mockCardData.cardNumber).toBe('4111111111111111');
      expect(body.mockCardData.expiryDate).toBe('12/26');
      expect(body.mockCardData.cvv).toBe('123');
      expect(body.mockCardData.cardholderName).toBe('Test User');

      req.flush(makePaymentResult(true));
    });

    it('should include simulationScenario in the request body when provided', () => {
      const paymentData = makePaymentData({
        simulationScenario: PaymentScenario.SUCCESS,
      });

      service.processPayment(paymentData).subscribe();

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      expect(req.request.body.simulationScenario).toBe(PaymentScenario.SUCCESS);
      req.flush(makePaymentResult(true));
    });

    it('should NOT retry payment requests (to avoid duplicate mock charges)', () => {
      const paymentData = makePaymentData();
      let errorCalled = false;

      service.processPayment(paymentData).subscribe({ error: () => { errorCalled = true; } });

      // Only ONE request should be made
      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      req.flush({}, { status: 500, statusText: 'Server Error' });

      // No further requests expected
      httpMock.expectNone(`${BASE_URL}/payments/process`);
      expect(errorCalled).toBeTrue();
    });

    it('should emit user-friendly error for HTTP 402 (insufficient funds)', () => {
      let errorMessage = '';

      service.processPayment(makePaymentData()).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      req.flush(
        { message: 'Insufficient funds' },
        { status: 402, statusText: 'Payment Required' },
      );

      expect(errorMessage.toLowerCase()).toContain('insufficient funds');
    });

    it('should emit user-friendly error for HTTP 422 (card declined)', () => {
      let errorMessage = '';

      service.processPayment(makePaymentData()).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      req.flush(
        { message: 'Card declined' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(errorMessage).toContain('declined');
    });

    it('should emit user-friendly error for HTTP 0 (network failure)', () => {
      let errorMessage = '';

      service.processPayment(makePaymentData()).subscribe({
        error: (err: Error) => {
          errorMessage = err.message;
        },
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/process`);
      req.error(new ProgressEvent('error'), { status: 0 });

      expect(errorMessage).toContain('temporarily unavailable');
    });
  });

  // -------------------------------------------------------------------------
  // simulatePaymentScenario()
  // -------------------------------------------------------------------------

  describe('simulatePaymentScenario()', () => {
    const scenarios = [
      PaymentScenario.SUCCESS,
      PaymentScenario.INSUFFICIENT_FUNDS,
      PaymentScenario.CARD_DECLINED,
      PaymentScenario.NETWORK_ERROR,
      PaymentScenario.TIMEOUT,
    ];

    scenarios.forEach((scenario) => {
      it(`should POST to /api/payments/simulate with scenario=${scenario}`, () => {
        const mockResult = makePaymentResult(scenario === PaymentScenario.SUCCESS);

        service.simulatePaymentScenario(scenario).subscribe((result) => {
          expect(result).toEqual(mockResult);
        });

        const req = httpMock.expectOne(`${BASE_URL}/payments/simulate`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.scenario).toBe(scenario);
        req.flush(mockResult);
      });
    });

    it('should return a PaymentResult with success=true for SUCCESS scenario', () => {
      let result: PaymentResult | null = null;

      service.simulatePaymentScenario(PaymentScenario.SUCCESS).subscribe((r) => {
        result = r;
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/simulate`);
      req.flush(makePaymentResult(true));

      expect(result).not.toBeNull();
      expect(result!.success).toBeTrue();
    });

    it('should return a PaymentResult with success=false for CARD_DECLINED scenario', () => {
      let result: PaymentResult | null = null;

      service.simulatePaymentScenario(PaymentScenario.CARD_DECLINED).subscribe((r) => {
        result = r;
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/simulate`);
      req.flush(makePaymentResult(false));

      expect(result).not.toBeNull();
      expect(result!.success).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // getPaymentHistory()
  // -------------------------------------------------------------------------

  describe('getPaymentHistory()', () => {
    it('should call GET /api/payments/history', () => {
      const mockHistory = [makePaymentTransaction()];

      service.getPaymentHistory().subscribe((history) => {
        expect(history).toEqual(mockHistory);
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHistory);
    });

    it('should return an empty array when no payment history exists', () => {
      service.getPaymentHistory().subscribe((history) => {
        expect(history).toEqual([]);
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/history`);
      req.flush([]);
    });

    it('should return multiple transactions in order', () => {
      const mockHistory = [
        makePaymentTransaction(),
        { ...makePaymentTransaction(), id: 'txn-2', status: PaymentStatus.FAILED },
      ];

      service.getPaymentHistory().subscribe((history) => {
        expect(history.length).toBe(2);
        expect(history[0].id).toBe('txn-1');
        expect(history[1].id).toBe('txn-2');
      });

      const req = httpMock.expectOne(`${BASE_URL}/payments/history`);
      req.flush(mockHistory);
    });
  });
});

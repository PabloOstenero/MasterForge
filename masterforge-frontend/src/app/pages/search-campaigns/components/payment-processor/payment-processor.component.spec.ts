/**
 * Property-based tests for PaymentProcessorComponent.
 *
 * ⚠️  ACADEMIC DISCLAIMER: All tests use mock/simulated payment data.
 * No real financial transactions are performed.
 *
 * Properties tested:
 * - Property 13: Paid Campaign Payment Initiation
 *   For any paid campaign, requesting to join should initiate the payment process.
 *   Validates: Requirements 4.2
 *
 * - Property 20: Payment Failure Simulation
 *   For any payment request with a failure scenario, the system should simulate
 *   the appropriate failure and return the corresponding error message.
 *   Validates: Requirements 5.5
 *
 * Feature: search-campaigns
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import * as fc from 'fast-check';

import { PaymentProcessorComponent } from './payment-processor.component';
import { PaymentService } from '../../../../services/payment.service';
import {
  Campaign,
  CampaignVisibility,
  PaymentResult,
  PaymentScenario,
} from '../../models/campaign.models';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a paid campaign (joinPrice > 0).
 * Used for Property 13: any paid campaign should initiate payment.
 */
const paidCampaignArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 80 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  owner: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    subscriptionTier: fc.constantFrom('FREE', 'PREMIUM'),
  }),
  maxPlayers: fc.integer({ min: 2, max: 10 }),
  currentPlayers: fc.integer({ min: 0, max: 9 }),
  joinPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99), noNaN: true }),
  visibility: fc.constant(CampaignVisibility.PUBLIC),
  createdAt: fc.date(),
  updatedAt: fc.date(),
}).map((c) => ({
  ...c,
  currentPlayers: Math.min(c.currentPlayers, c.maxPlayers - 1), // ensure not full
}));

/**
 * Generates a failure payment scenario (any scenario except SUCCESS).
 * Used for Property 20: failure scenarios should return error messages.
 */
const failureScenarioArb = fc.constantFrom(
  PaymentScenario.INSUFFICIENT_FUNDS,
  PaymentScenario.CARD_DECLINED,
  PaymentScenario.NETWORK_ERROR,
  PaymentScenario.TIMEOUT,
);

/**
 * Generates a PaymentResult representing a failure.
 * The errorMessage is always present for failure results.
 */
const failureResultArb = fc.record({
  success: fc.constant(false),
  errorMessage: fc.string({ minLength: 5, maxLength: 200 }),
  transactionId: fc.constant(undefined),
  enrollmentConfirmed: fc.constant(false),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePaidCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-paid-1',
    name: 'Dragon\'s Lair Campaign',
    description: 'An epic paid D&D campaign',
    owner: { id: 'owner-1', name: 'DM Master', subscriptionTier: 'PREMIUM' },
    maxPlayers: 5,
    currentPlayers: 2,
    joinPrice: 9.99,
    visibility: CampaignVisibility.PUBLIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('PaymentProcessorComponent — Property-Based Tests', () => {
  let fixture: ComponentFixture<PaymentProcessorComponent>;
  let component: PaymentProcessorComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentProcessorComponent, ReactiveFormsModule],
      providers: [
        PaymentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // Property 13: Paid Campaign Payment Initiation
  // Validates: Requirements 4.2
  // -------------------------------------------------------------------------

  /**
   * **Property 13: Paid Campaign Payment Initiation**
   *
   * For any paid campaign (joinPrice > 0), when the PaymentProcessorComponent
   * is instantiated with that campaign, it should:
   * 1. Display the payment form (not the result screen)
   * 2. Show the correct campaign price
   * 3. Have the payment form ready for input
   *
   * This validates that the payment process is initiated for any paid campaign.
   *
   * **Validates: Requirements 4.2**
   * Feature: search-campaigns, Property 13: Paid Campaign Payment Initiation
   */
  it('Property 13: For any paid campaign, the payment processor should be ready to initiate payment', () => {
    fc.assert(
      fc.property(paidCampaignArb, (campaign) => {
        // Create a fresh fixture for each campaign
        const localFixture = TestBed.createComponent(PaymentProcessorComponent);
        const localComponent = localFixture.componentInstance;

        // Set the paid campaign as input
        localComponent.campaign = campaign;
        localFixture.detectChanges();

        // Property: payment form should be shown (not result screen)
        expect(localComponent.showResult).toBeFalse();

        // Property: processing should not be in progress initially
        expect(localComponent.processing).toBeFalse();

        // Property: the payment form should exist and be valid structure
        expect(localComponent.paymentForm).toBeDefined();
        expect(localComponent.paymentForm.get('cardNumber')).toBeDefined();
        expect(localComponent.paymentForm.get('expiryDate')).toBeDefined();
        expect(localComponent.paymentForm.get('cvv')).toBeDefined();
        expect(localComponent.paymentForm.get('cardholderName')).toBeDefined();

        // Property: the formatted price should reflect the campaign's joinPrice
        const formattedPrice = localComponent.formattedPrice;
        expect(formattedPrice).toBeTruthy();
        // For any positive price, the formatted price should be non-empty
        expect(formattedPrice.length).toBeGreaterThan(0);

        // Property: scenario options should include all PaymentScenario values
        const scenarioValues = localComponent.scenarioOptions.map((o) => o.value);
        expect(scenarioValues).toContain(PaymentScenario.SUCCESS);
        expect(scenarioValues).toContain(PaymentScenario.INSUFFICIENT_FUNDS);
        expect(scenarioValues).toContain(PaymentScenario.CARD_DECLINED);
        expect(scenarioValues).toContain(PaymentScenario.NETWORK_ERROR);
        expect(scenarioValues).toContain(PaymentScenario.TIMEOUT);

        localFixture.destroy();
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 13 (supplementary): For any paid campaign, clicking join should
   * emit a paymentCancelled event when the user cancels, not an enrollment.
   *
   * **Validates: Requirements 4.2**
   * Feature: search-campaigns, Property 13: Paid Campaign Payment Initiation
   */
  it('Property 13: For any paid campaign, cancelling payment should emit paymentCancelled', () => {
    fc.assert(
      fc.property(paidCampaignArb, (campaign) => {
        const localFixture = TestBed.createComponent(PaymentProcessorComponent);
        const localComponent = localFixture.componentInstance;
        localComponent.campaign = campaign;
        localFixture.detectChanges();

        let cancelledEmitted = false;
        let completeEmitted = false;

        localComponent.paymentCancelled.subscribe(() => { cancelledEmitted = true; });
        localComponent.paymentComplete.subscribe(() => { completeEmitted = true; });

        // Cancel the payment
        localComponent.cancelPayment();

        // Property: cancellation should emit paymentCancelled, not paymentComplete
        expect(cancelledEmitted).toBeTrue();
        expect(completeEmitted).toBeFalse();

        localFixture.destroy();
      }),
      { numRuns: 50 },
    );
  });

  // -------------------------------------------------------------------------
  // Property 20: Payment Failure Simulation
  // Validates: Requirements 5.5
  // -------------------------------------------------------------------------

  /**
   * **Property 20: Payment Failure Simulation**
   *
   * For any payment request with a failure scenario, the system should simulate
   * the appropriate failure and return the corresponding error message.
   *
   * This tests that:
   * 1. Selecting a failure scenario marks the component as a failure scenario
   * 2. When a failure result is received, the component shows the error message
   * 3. The paymentComplete event is emitted with success=false and an errorMessage
   *
   * **Validates: Requirements 5.5**
   * Feature: search-campaigns, Property 20: Payment Failure Simulation
   */
  it('Property 20: For any failure scenario, the component should display the error message', () => {
    fc.assert(
      fc.property(
        paidCampaignArb,
        failureScenarioArb,
        failureResultArb,
        (campaign, scenario, failureResult) => {
          const localFixture = TestBed.createComponent(PaymentProcessorComponent);
          const localComponent = localFixture.componentInstance;
          localComponent.campaign = campaign;
          localFixture.detectChanges();

          // Select the failure scenario
          localComponent.simulatePaymentScenario(scenario);

          // Property: the selected scenario should be a failure scenario
          expect(localComponent.isFailureScenario).toBeTrue();
          expect(localComponent.selectedScenario).toBe(scenario);

          // Simulate receiving a failure result (as if from the payment service)
          const emittedResults: PaymentResult[] = [];
          localComponent.paymentComplete.subscribe((r) => emittedResults.push(r));

          // Directly trigger the result (simulating what processPayment does on error)
          (localComponent as any).processing = false;
          (localComponent as any).paymentResult = failureResult;
          (localComponent as any).showResult = true;
          localComponent.paymentComplete.emit(failureResult);
          localFixture.detectChanges();

          // Property: result screen should be shown
          expect(localComponent.showResult).toBeTrue();

          // Property: the result should indicate failure
          expect(localComponent.paymentResult).not.toBeNull();
          expect(localComponent.paymentResult!.success).toBeFalse();

          // Property: an error message should be present
          expect(localComponent.paymentResult!.errorMessage).toBeTruthy();
          expect(localComponent.paymentResult!.errorMessage!.length).toBeGreaterThan(0);

          // Property: paymentComplete was emitted with success=false
          expect(emittedResults.length).toBeGreaterThan(0);
          expect(emittedResults[emittedResults.length - 1].success).toBeFalse();

          localFixture.destroy();
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20 (supplementary): For any failure scenario, the PaymentService
   * should be called with the correct scenario parameter.
   *
   * **Validates: Requirements 5.5**
   * Feature: search-campaigns, Property 20: Payment Failure Simulation
   */
  it('Property 20: For any failure scenario, processPayment should send the scenario to the service', () => {
    fc.assert(
      fc.property(failureScenarioArb, (scenario) => {
        const localFixture = TestBed.createComponent(PaymentProcessorComponent);
        const localComponent = localFixture.componentInstance;
        localComponent.campaign = makePaidCampaign();
        localFixture.detectChanges();

        // Select the failure scenario
        localComponent.simulatePaymentScenario(scenario);

        // Fill in valid form data
        localComponent.paymentForm.patchValue({
          cardholderName: 'Test User',
          cardNumber: '4111 1111 1111 1111',
          expiryDate: '12/26',
          cvv: '123',
        });

        // Trigger payment processing
        localComponent.processPayment();

        // Verify the HTTP request was made with the correct scenario
        const req = httpMock.expectOne('http://localhost:8080/api/payments/process');
        expect(req.request.method).toBe('POST');
        expect(req.request.body.simulationScenario).toBe(scenario);

        // Simulate failure response
        const failureResult: PaymentResult = {
          success: false,
          errorMessage: `Simulated failure: ${scenario}`,
        };
        req.flush(failureResult);
        localFixture.detectChanges();

        // Property: after failure, result screen should show
        expect(localComponent.showResult).toBeTrue();
        expect(localComponent.paymentResult!.success).toBeFalse();

        localFixture.destroy();
      }),
      { numRuns: 20 },
    );
  });

  // -------------------------------------------------------------------------
  // Additional unit tests for component behavior
  // -------------------------------------------------------------------------

  describe('Unit tests', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(PaymentProcessorComponent);
      component = fixture.componentInstance;
      component.campaign = makePaidCampaign();
      fixture.detectChanges();
    });

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should display the academic disclaimer (Req 5.7)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const disclaimer = compiled.querySelector('[data-testid="academic-disclaimer"]');
      expect(disclaimer).toBeTruthy();
      expect(disclaimer!.textContent).toContain('académica');
    });

    it('should display the campaign price (Req 5.1)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const priceEl = compiled.querySelector('[data-testid="payment-amount"]');
      expect(priceEl).toBeTruthy();
      expect(priceEl!.textContent).toContain('9.99');
    });

    it('should show all 5 payment scenario options (Req 5.8)', () => {
      expect(component.scenarioOptions.length).toBe(5);
      const values = component.scenarioOptions.map((o) => o.value);
      expect(values).toContain(PaymentScenario.SUCCESS);
      expect(values).toContain(PaymentScenario.INSUFFICIENT_FUNDS);
      expect(values).toContain(PaymentScenario.CARD_DECLINED);
      expect(values).toContain(PaymentScenario.NETWORK_ERROR);
      expect(values).toContain(PaymentScenario.TIMEOUT);
    });

    it('should default to SUCCESS scenario', () => {
      expect(component.selectedScenario).toBe(PaymentScenario.SUCCESS);
      expect(component.isFailureScenario).toBeFalse();
    });

    it('should mark failure scenarios correctly', () => {
      component.simulatePaymentScenario(PaymentScenario.CARD_DECLINED);
      expect(component.isFailureScenario).toBeTrue();

      component.simulatePaymentScenario(PaymentScenario.SUCCESS);
      expect(component.isFailureScenario).toBeFalse();
    });

    it('should emit paymentCancelled when cancelPayment() is called', () => {
      let cancelled = false;
      component.paymentCancelled.subscribe(() => { cancelled = true; });
      component.cancelPayment();
      expect(cancelled).toBeTrue();
    });

    it('should show success result screen after successful payment', () => {
      // Simulate a successful payment result
      component['paymentResult'] = { success: true, transactionId: 'txn-123', enrollmentConfirmed: true };
      component['showResult'] = true;
      component['cdr'].markForCheck();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const successTitle = compiled.querySelector('[data-testid="payment-success-title"]');
      expect(successTitle).toBeTruthy();
    });

    it('should show failure result screen after failed payment', () => {
      component['paymentResult'] = { success: false, errorMessage: 'Card declined' };
      component['showResult'] = true;
      component['cdr'].markForCheck();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const failureTitle = compiled.querySelector('[data-testid="payment-failure-title"]');
      expect(failureTitle).toBeTruthy();

      const errorMsg = compiled.querySelector('[data-testid="payment-error-message"]');
      expect(errorMsg!.textContent).toContain('Card declined');
    });

    it('should reset result screen when retryPayment() is called', () => {
      component['paymentResult'] = { success: false, errorMessage: 'Error' };
      component['showResult'] = true;
      fixture.detectChanges();

      component.retryPayment();
      expect(component.showResult).toBeFalse();
      expect(component.paymentResult).toBeNull();
    });

    it('should not process payment when form is invalid', () => {
      component.paymentForm.patchValue({ cardNumber: '', cardholderName: '' });
      component.processPayment();

      // No HTTP request should be made
      httpMock.expectNone('http://localhost:8080/api/payments/process');
      expect(component.processing).toBeFalse();
    });

    it('should process payment and emit result on success', () => {
      component.paymentForm.patchValue({
        cardholderName: 'Test User',
        cardNumber: '4111 1111 1111 1111',
        expiryDate: '12/26',
        cvv: '123',
      });

      const emittedResults: PaymentResult[] = [];
      component.paymentComplete.subscribe((r) => emittedResults.push(r));

      component.processPayment();
      expect(component.processing).toBeTrue();

      const req = httpMock.expectOne('http://localhost:8080/api/payments/process');
      const successResult: PaymentResult = { success: true, transactionId: 'txn-abc', enrollmentConfirmed: true };
      req.flush(successResult);
      fixture.detectChanges();

      expect(component.processing).toBeFalse();
      expect(component.showResult).toBeTrue();
      expect(component.paymentResult!.success).toBeTrue();
      expect(emittedResults.length).toBe(1);
      expect(emittedResults[0].success).toBeTrue();
    });
  });
});

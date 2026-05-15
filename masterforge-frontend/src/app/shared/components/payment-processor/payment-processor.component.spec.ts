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
import { ReactiveFormsModule } from '@angular/forms';
import * as fc from 'fast-check';

import { PaymentProcessorComponent } from './payment-processor.component';
import {
  PaymentResult,
  PaymentScenario,
} from '../../../../shared/models/payment.models';
import { Campaign, CampaignVisibility } from '../../models/campaign.models';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Generates a paid campaign (joinPrice > 0).
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
  currentPlayers: Math.min(c.currentPlayers, c.maxPlayers - 1),
}));

/**
 * Generates a failure payment scenario (any scenario except SUCCESS).
 */
const failureScenarioArb = fc.constantFrom(
  PaymentScenario.INSUFFICIENT_FUNDS,
  PaymentScenario.CARD_DECLINED,
  PaymentScenario.NETWORK_ERROR,
  PaymentScenario.TIMEOUT,
);

/**
 * Generates a PaymentResult representing a failure.
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentProcessorComponent, ReactiveFormsModule],
    }).compileComponents();
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
   * **Validates: Requirements 4.2**
   * Feature: search-campaigns, Property 13: Paid Campaign Payment Initiation
   */
  it('Property 13: For any paid campaign, the payment processor should be ready to initiate payment', () => {
    fc.assert(
      fc.property(paidCampaignArb, (campaign) => {
        const localFixture = TestBed.createComponent(PaymentProcessorComponent);
        const localComponent = localFixture.componentInstance;

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
   * Property 13 (supplementary): For any paid campaign, cancelling payment
   * should emit paymentCancelled, not paymentSubmit.
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
        let submitEmitted = false;

        localComponent.paymentCancelled.subscribe(() => { cancelledEmitted = true; });
        localComponent.paymentSubmit.subscribe(() => { submitEmitted = true; });

        localComponent.cancelPayment();

        // Property: cancellation should emit paymentCancelled, not paymentSubmit
        expect(cancelledEmitted).toBeTrue();
        expect(submitEmitted).toBeFalse();

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
   * For any failure scenario, selecting it should mark the component as a
   * failure scenario, and calling notifyResult() with a failure result should
   * display the error message.
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

          // Simulate the parent calling notifyResult() after the API responds
          localComponent.notifyResult(failureResult);
          localFixture.detectChanges();

          // Property: result screen should be shown
          expect(localComponent.showResult).toBeTrue();

          // Property: the result should indicate failure
          expect(localComponent.paymentResult).not.toBeNull();
          expect(localComponent.paymentResult!.success).toBeFalse();

          // Property: an error message should be present
          expect(localComponent.paymentResult!.errorMessage).toBeTruthy();
          expect(localComponent.paymentResult!.errorMessage!.length).toBeGreaterThan(0);

          localFixture.destroy();
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20 (supplementary): For any failure scenario, processPayment()
   * should emit paymentSubmit with the correct scenario in the payload.
   *
   * **Validates: Requirements 5.5**
   * Feature: search-campaigns, Property 20: Payment Failure Simulation
   */
  it('Property 20: For any failure scenario, processPayment should emit paymentSubmit with that scenario', () => {
    fc.assert(
      fc.property(failureScenarioArb, (scenario) => {
        const localFixture = TestBed.createComponent(PaymentProcessorComponent);
        const localComponent = localFixture.componentInstance;
        localComponent.campaign = makePaidCampaign();
        localFixture.detectChanges();

        localComponent.simulatePaymentScenario(scenario);

        localComponent.paymentForm.patchValue({
          cardholderName: 'Test User',
          cardNumber: '4111 1111 1111 1111',
          expiryDate: '12/26',
          cvv: '123',
        });

        const submittedData: any[] = [];
        localComponent.paymentSubmit.subscribe((d) => submittedData.push(d));

        localComponent.processPayment();

        // Property: paymentSubmit should be emitted with the selected scenario
        expect(submittedData.length).toBe(1);
        expect(submittedData[0].simulationScenario).toBe(scenario);

        // Property: component should be in processing state (waiting for parent)
        expect(localComponent.processing).toBeTrue();

        localFixture.destroy();
      }),
      { numRuns: 20 },
    );
  });

  // -------------------------------------------------------------------------
  // Unit tests
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

    it('should emit paymentSubmit with correct data when form is valid', () => {
      component.paymentForm.patchValue({
        cardholderName: 'Test User',
        cardNumber: '4111 1111 1111 1111',
        expiryDate: '12/26',
        cvv: '123',
      });

      const submitted: any[] = [];
      component.paymentSubmit.subscribe((d) => submitted.push(d));

      component.processPayment();

      expect(submitted.length).toBe(1);
      expect(submitted[0].campaignId).toBe('camp-paid-1');
      expect(submitted[0].amount).toBe(9.99);
      expect(component.processing).toBeTrue();
    });

    it('should not emit paymentSubmit when form is invalid', () => {
      component.paymentForm.patchValue({ cardNumber: '', cardholderName: '' });

      const submitted: any[] = [];
      component.paymentSubmit.subscribe((d) => submitted.push(d));

      component.processPayment();

      expect(submitted.length).toBe(0);
      expect(component.processing).toBeFalse();
    });

    it('should show success result screen after notifyResult() with success', () => {
      component.notifyResult({ success: true, transactionId: 'txn-123', enrollmentConfirmed: true });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const successTitle = compiled.querySelector('[data-testid="payment-success-title"]');
      expect(successTitle).toBeTruthy();
      expect(component.processing).toBeFalse();
    });

    it('should show failure result screen after notifyResult() with failure', () => {
      component.notifyResult({ success: false, errorMessage: 'Card declined' });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const failureTitle = compiled.querySelector('[data-testid="payment-failure-title"]');
      expect(failureTitle).toBeTruthy();

      const errorMsg = compiled.querySelector('[data-testid="payment-error-message"]');
      expect(errorMsg!.textContent).toContain('Card declined');
    });

    it('should reset result screen when retryPayment() is called', () => {
      component.notifyResult({ success: false, errorMessage: 'Error' });
      fixture.detectChanges();

      component.retryPayment();
      expect(component.showResult).toBeFalse();
      expect(component.paymentResult).toBeNull();
    });
  });
});

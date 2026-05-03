/**
 * PaymentProcessorComponent — mock payment processing UI for academic demonstration.
 *
 * ⚠️  ACADEMIC DISCLAIMER ⚠️
 * This component simulates a payment form for demonstration purposes only.
 * No real financial transactions are performed. All card data is mock/fake
 * and is used solely to demonstrate the complete campaign enrollment workflow
 * as part of an academic project (TFG).
 *
 * Provides:
 * - Mock credit card form with card number, expiry, CVV, and cardholder name
 * - Clear academic disclaimer about simulation nature
 * - Payment scenario selection for testing different outcomes
 * - Payment processing animation and feedback
 * - Success confirmation and error handling
 *
 * Validates: Requirements 5.1, 5.2, 5.7, 5.8
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  lockClosedOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  informationCircleOutline,
  cashOutline,
  refreshOutline,
} from 'ionicons/icons';
import {
  PaymentData,
  PaymentResult,
  PaymentScenario,
} from '../../../../shared/models/payment.models';
import { Campaign } from '../../models/campaign.models';
import { CampaignFormatter } from '../../models/campaign.formatter';
import { ValidationErrorComponent } from '../validation-error/validation-error.component';
import { HelpTooltipComponent } from '../help-tooltip/help-tooltip.component';

// ---------------------------------------------------------------------------
// Scenario option type
// ---------------------------------------------------------------------------

export interface PaymentScenarioOption {
  label: string;
  value: PaymentScenario;
  description: string;
  isFailure: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-payment-processor',
  templateUrl: './payment-processor.component.html',
  styleUrls: ['./payment-processor.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonIcon,
    IonSpinner,
    ValidationErrorComponent,
    HelpTooltipComponent,
  ],
})
export class PaymentProcessorComponent implements OnInit, OnDestroy {
  /**
   * The paid campaign the user is attempting to join.
   * Req 5.1: Display the exact join price before simulated payment.
   */
  @Input() campaign!: Campaign;

  /**
   * Emits the PaymentData when the user submits the form.
   * The parent is responsible for calling the enrollment API and then
   * calling notifyResult() to show the success/failure screen.
   */
  @Output() paymentSubmit = new EventEmitter<PaymentData>();

  /**
   * Emits when the user cancels the payment flow.
   */
  @Output() paymentCancelled = new EventEmitter<void>();

  // ── State ──────────────────────────────────────────────────────────────────

  /** Whether a payment request is in progress. */
  processing = false;

  /** The result of the last payment attempt (null if not yet attempted). */
  paymentResult: PaymentResult | null = null;

  /** Whether to show the result screen (success or failure). */
  showResult = false;

  /** The currently selected payment scenario for testing. */
  selectedScenario: PaymentScenario = PaymentScenario.SUCCESS;

  // ── Forms ──────────────────────────────────────────────────────────────────

  paymentForm: FormGroup;

  // ── Scenario options ───────────────────────────────────────────────────────

  /**
   * Req 5.8: Options to simulate different payment scenarios for testing.
   */
  readonly scenarioOptions: PaymentScenarioOption[] = [
    {
      label: 'Pago exitoso',
      value: PaymentScenario.SUCCESS,
      description: 'Simula un pago aprobado correctamente',
      isFailure: false,
    },
    {
      label: 'Fondos insuficientes',
      value: PaymentScenario.INSUFFICIENT_FUNDS,
      description: 'Simula rechazo por saldo insuficiente',
      isFailure: true,
    },
    {
      label: 'Tarjeta rechazada',
      value: PaymentScenario.CARD_DECLINED,
      description: 'Simula rechazo de la tarjeta por el banco',
      isFailure: true,
    },
    {
      label: 'Error de red',
      value: PaymentScenario.NETWORK_ERROR,
      description: 'Simula un fallo de conectividad',
      isFailure: true,
    },
    {
      label: 'Tiempo de espera agotado',
      value: PaymentScenario.TIMEOUT,
      description: 'Simula un timeout en el procesador de pagos',
      isFailure: true,
    },
  ];

  // ── Internal ───────────────────────────────────────────────────────────────

  // ── Constructor ────────────────────────────────────────────────────────────

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      cardOutline,
      lockClosedOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      informationCircleOutline,
      cashOutline,
      refreshOutline,
    });

    this.paymentForm = this.fb.group({
      cardholderName: ['', [Validators.required, Validators.minLength(2)]],
      cardNumber: ['', [Validators.required, cardNumberValidator]],
      expiryDate: ['', [Validators.required, expiryDateValidator]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Pre-fill with mock data for easy testing
    this.paymentForm.patchValue({
      cardholderName: 'Usuario Demo',
      cardNumber: '4111 1111 1111 1111',
      expiryDate: '12/26',
      cvv: '123',
    });
  }

  ngOnDestroy(): void {
    // Nothing to clean up — no subscriptions in this component.
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  /**
   * Req 5.1: Returns the formatted join price for display.
   */
  get formattedPrice(): string {
    return this.campaign ? CampaignFormatter.formatPrice(this.campaign.joinPrice) : '';
  }

  /**
   * Req 5.2: Builds the PaymentData from the form and emits it to the parent.
   * The parent is responsible for calling the enrollment API.
   */
  processPayment(): void {
    if (this.paymentForm.invalid || this.processing) return;

    this.processing = true;
    this.paymentResult = null;
    this.showResult = false;
    this.cdr.markForCheck();

    const formValue = this.paymentForm.value;
    const paymentData: PaymentData = {
      campaignId: this.campaign.id,
      amount: this.campaign.joinPrice,
      cardData: {
        cardNumber: formValue.cardNumber.replace(/\s/g, ''),
        expiryDate: formValue.expiryDate,
        cvv: formValue.cvv,
        cardholderName: formValue.cardholderName,
      },
      simulationScenario: this.selectedScenario,
    };

    this.paymentSubmit.emit(paymentData);
  }

  /**
   * Called by the parent after the enrollment API responds.
   * Shows the success or failure result screen.
   */
  notifyResult(result: PaymentResult): void {
    this.processing = false;
    this.paymentResult = result;
    this.showResult = true;
    this.cdr.markForCheck();
  }

  /**
   * Req 5.8: Selects a payment scenario for simulation.
   */
  simulatePaymentScenario(scenario: PaymentScenario): void {
    this.selectedScenario = scenario;
  }

  /**
   * Cancels the payment flow and notifies the parent.
   */
  cancelPayment(): void {
    this.paymentCancelled.emit();
  }

  /**
   * Resets the result screen to allow retrying.
   */
  retryPayment(): void {
    this.paymentResult = null;
    this.showResult = false;
    this.cdr.markForCheck();
  }

  /**
   * Formats the card number input with spaces every 4 digits.
   */
  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '').substring(0, 16);
    value = value.replace(/(.{4})/g, '$1 ').trim();
    this.paymentForm.get('cardNumber')!.setValue(value, { emitEvent: false });
    input.value = value;
  }

  /**
   * Formats the expiry date input as MM/YY.
   */
  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '').substring(0, 4);
    if (value.length >= 3) {
      value = value.substring(0, 2) + '/' + value.substring(2);
    }
    this.paymentForm.get('expiryDate')!.setValue(value, { emitEvent: false });
    input.value = value;
  }

  /**
   * Returns the label for the currently selected scenario.
   */
  get selectedScenarioLabel(): string {
    return this.scenarioOptions.find((o) => o.value === this.selectedScenario)?.label ?? '';
  }

  /**
   * Returns true if the selected scenario is a failure scenario.
   */
  get isFailureScenario(): boolean {
    return this.scenarioOptions.find((o) => o.value === this.selectedScenario)?.isFailure ?? false;
  }
}

// ---------------------------------------------------------------------------
// Custom validators
// ---------------------------------------------------------------------------

/**
 * Validates a mock credit card number (16 digits, spaces allowed).
 */
function cardNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').replace(/\s/g, '');
  if (!value) return null; // Required validator handles empty
  return /^\d{16}$/.test(value) ? null : { invalidCardNumber: true };
}

/**
 * Validates an expiry date in MM/YY format.
 */
function expiryDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value ?? '';
  if (!value) return null; // Required validator handles empty
  if (!/^\d{2}\/\d{2}$/.test(value)) return { invalidExpiry: true };
  const [month, year] = value.split('/').map(Number);
  if (month < 1 || month > 12) return { invalidExpiry: true };
  const now = new Date();
  const expiry = new Date(2000 + year, month - 1);
  return expiry >= now ? null : { expiredCard: true };
}

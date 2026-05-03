/**
 * Shared payment models used across features (campaign enrollment, homebrew, etc.).
 *
 * Keeping these types in a shared location means any feature that needs payment
 * processing can import from here without depending on a page-specific module.
 *
 * ⚠️  ACADEMIC DISCLAIMER ⚠️
 * All payment types here represent a mock/simulated payment system for academic
 * demonstration purposes only. No real financial transactions are performed.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Scenarios that can be simulated by the mock payment processor.
 * Used for academic demonstration of different payment outcomes.
 */
export enum PaymentScenario {
  SUCCESS = 'SUCCESS',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_DECLINED = 'CARD_DECLINED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Lifecycle status of a mock payment transaction.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Mock credit-card data used by the simulated payment processor.
 * No real payment gateway is involved — this is for academic demonstration only.
 */
export interface MockCardData {
  /** 16-digit mock card number. */
  cardNumber: string;
  /** Card expiry date in MM/YY format. */
  expiryDate: string;
  /** 3- or 4-digit card verification value. */
  cvv: string;
  /** Name of the cardholder as it appears on the card. */
  cardholderName: string;
}

/**
 * Payload sent to the mock payment processor.
 * The itemId field is generic so this can be reused for campaigns, homebrew, etc.
 */
export interface PaymentData {
  /** ID of the item being purchased (campaign ID, homebrew ID, etc.). */
  campaignId: string;
  /** Amount to charge, in USD. */
  amount: number;
  /** Mock card details provided by the user. */
  cardData: MockCardData;
  /** Optional scenario to simulate a specific payment outcome. */
  simulationScenario?: PaymentScenario;
}

/**
 * Result returned by the mock payment processor after attempting a transaction.
 */
export interface PaymentResult {
  /** Whether the simulated payment succeeded. */
  success: boolean;
  /** Transaction ID assigned to a successful payment. */
  transactionId?: string;
  /** Human-readable error message when the payment fails. */
  errorMessage?: string;
  /** Whether the item enrollment/purchase was confirmed after a successful payment. */
  enrollmentConfirmed?: boolean;
}

/**
 * Persisted record of a mock payment transaction for audit and demonstration purposes.
 */
export interface PaymentTransaction {
  /** Unique identifier of the transaction. */
  id: string;
  /** ID of the user who initiated the payment. */
  userId: string;
  /** ID of the item the payment was for. */
  campaignId: string;
  /** Amount charged, in USD. */
  amount: number;
  /** Current lifecycle status of the transaction. */
  status: PaymentStatus;
  /** Timestamp when the transaction was processed. */
  processedAt: Date;
  /** Last four digits of the mock card used (for display purposes). */
  mockCardLastFour?: string;
  /** Name of the simulation scenario used, if any. */
  simulationScenario?: string;
}

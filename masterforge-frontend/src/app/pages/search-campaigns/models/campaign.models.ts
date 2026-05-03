/**
 * TypeScript interfaces and enums for the Search Campaigns feature.
 * Defines all data models used across campaign discovery, filtering,
 * enrollment, and mock payment processing.
 *
 * Validates: Requirements 9.1, 9.4
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/**
 * Visibility level of a campaign, controlling who can discover and join it.
 */
export enum CampaignVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  INVITE_ONLY = 'INVITE_ONLY',
}

/**
 * Preset price-range options available in the filter UI.
 * CUSTOM allows the user to specify an arbitrary min/max range.
 */
export enum PriceRangePreset {
  FREE = 'FREE',
  UNDER_10 = 'UNDER_10',
  UNDER_25 = 'UNDER_25',
  UNDER_50 = 'UNDER_50',
  CUSTOM = 'CUSTOM',
}

/**
 * Capacity bucket used to filter campaigns by total player slots.
 * - SMALL  : 1–4 players
 * - MEDIUM : 5–6 players
 * - LARGE  : 7+ players
 * - ANY    : no capacity restriction
 */
export enum CapacityFilterType {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ANY = 'ANY',
}

/**
 * Availability filter controlling whether to show open, full, or all campaigns.
 */
export enum AvailabilityFilterType {
  AVAILABLE_ONLY = 'AVAILABLE_ONLY',
  FULL_ONLY = 'FULL_ONLY',
  ALL = 'ALL',
}

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
// Core campaign interfaces
// ---------------------------------------------------------------------------

/**
 * Represents the Dungeon Master who owns and manages a campaign.
 */
export interface CampaignOwner {
  /** Unique identifier of the owner user. */
  id: string;
  /** Display name of the owner. */
  name: string;
  /** Subscription tier of the owner (e.g. "FREE", "PREMIUM"). */
  subscriptionTier: string;
}

/**
 * Core campaign data model returned by the backend API.
 * Contains all information needed to display a campaign card and
 * determine whether a user can join.
 */
export interface Campaign {
  /** Unique identifier of the campaign. */
  id: string;
  /** Human-readable campaign name. */
  name: string;
  /** Full description of the campaign. */
  description: string;
  /** Owner (Dungeon Master) of the campaign. */
  owner: CampaignOwner;
  /** Maximum number of players allowed in the campaign. */
  maxPlayers: number;
  /** Current number of enrolled players. */
  currentPlayers: number;
  /** Price in USD required to join the campaign (0 for free campaigns). */
  joinPrice: number;
  /** Visibility level controlling who can discover this campaign. */
  visibility: CampaignVisibility;
  /** Timestamp when the campaign was created. */
  createdAt: Date;
  /** Timestamp of the last campaign update. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Search & filter interfaces
// ---------------------------------------------------------------------------

/**
 * Defines a price range for filtering campaigns by join price.
 * Either a preset bucket or a custom min/max range can be used.
 */
export interface PriceRange {
  /** Minimum join price (inclusive), in USD. */
  min?: number;
  /** Maximum join price (inclusive), in USD. */
  max?: number;
  /** Preset price-range bucket selected from the filter UI. */
  preset?: PriceRangePreset;
}

/**
 * Defines a capacity filter for restricting campaigns by player-slot count.
 * The type selects a predefined bucket; minPlayers/maxPlayers allow overrides.
 */
export interface CapacityFilter {
  /** Capacity bucket (SMALL, MEDIUM, LARGE, or ANY). */
  type: CapacityFilterType;
  /** Minimum total player slots (inclusive). */
  minPlayers?: number;
  /** Maximum total player slots (inclusive). */
  maxPlayers?: number;
}

/**
 * Defines an availability filter for restricting campaigns by open-slot status.
 */
export interface AvailabilityFilter {
  /** Whether to show only available, only full, or all campaigns. */
  type: AvailabilityFilterType;
}

/**
 * Aggregates all optional filter criteria that can be applied to a campaign search.
 * Multiple filters are combined with AND logic.
 */
export interface CampaignFilters {
  /** Optional price-range filter. */
  priceRange?: PriceRange;
  /** Optional capacity filter. */
  capacityFilter?: CapacityFilter;
  /** Optional availability filter. */
  availabilityFilter?: AvailabilityFilter;
}

/**
 * Full search criteria sent to the backend, combining text search,
 * filters, and pagination parameters.
 */
export interface SearchCriteria {
  /** Free-text query matched against campaign name and description. */
  searchText?: string;
  /** Optional price-range filter. */
  priceRange?: PriceRange;
  /** Optional capacity filter. */
  capacityFilter?: CapacityFilter;
  /** Optional availability filter. */
  availabilityFilter?: AvailabilityFilter;
  /** Zero-based page index for pagination. */
  page: number;
  /** Number of campaigns to return per page. */
  size: number;
}

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

/**
 * Paginated response returned by the campaign search endpoint.
 * Contains the current page of campaigns along with pagination metadata.
 */
export interface CampaignSearchResult {
  /** Campaigns on the current page. */
  campaigns: Campaign[];
  /** Total number of campaigns matching the search criteria. */
  totalElements: number;
  /** Total number of pages available. */
  totalPages: number;
  /** Zero-based index of the current page. */
  currentPage: number;
  /** Whether there is a next page available. */
  hasNext: boolean;
}

// ---------------------------------------------------------------------------
// Payment interfaces
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
 * Payload sent to the mock payment processor when a user joins a paid campaign.
 */
export interface PaymentData {
  /** ID of the campaign the user is attempting to join. */
  campaignId: string;
  /** Amount to charge, in USD. Must match the campaign's joinPrice. */
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
  /** Whether the campaign enrollment was confirmed after a successful payment. */
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
  /** ID of the campaign the payment was for. */
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

// ---------------------------------------------------------------------------
// Enrollment interfaces
// ---------------------------------------------------------------------------

/**
 * Result returned after a campaign enrollment attempt (free or paid).
 */
export interface EnrollmentResult {
  /** Whether the enrollment was successful. */
  success: boolean;
  /** Human-readable message describing the outcome. */
  message: string;
  /** ID of the campaign the user was enrolled in. */
  campaignId: string;
  /** Timestamp when the enrollment was confirmed. */
  enrollmentDate?: Date;
}

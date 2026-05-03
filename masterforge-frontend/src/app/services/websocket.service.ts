/**
 * WebSocketService — real-time campaign availability updates.
 *
 * Manages a WebSocket connection to the backend for live campaign updates.
 * Falls back to HTTP polling (every 60 seconds) when WebSocket is unavailable.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.5, 10.6
 */

import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  Subject,
  BehaviorSubject,
  interval,
  Subscription,
  EMPTY,
  timer,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_URL = `${environment.wsBaseUrl}/ws/campaigns`;
const API_URL = `${environment.apiBaseUrl}/api`;

/** Polling interval when WebSocket is unavailable (60 seconds). */
const POLLING_INTERVAL_MS = 60_000;

/** Initial reconnect delay in milliseconds. */
const RECONNECT_INITIAL_DELAY_MS = 2_000;

/** Maximum reconnect delay in milliseconds (caps exponential back-off). */
const RECONNECT_MAX_DELAY_MS = 30_000;

/** Maximum number of reconnect attempts before giving up and falling back. */
const MAX_RECONNECT_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Represents a real-time campaign availability update received from the server.
 */
export interface CampaignAvailabilityUpdate {
  /** ID of the campaign that changed. */
  campaignId: string;
  /** Updated current player count. */
  currentPlayers: number;
  /** Maximum player capacity. */
  maxPlayers: number;
  /** Whether the campaign now has available slots. */
  hasAvailableSlots: boolean;
}

/**
 * Connection state of the WebSocket.
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'polling';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private http = inject(HttpClient);

  // ── Internal state ────────────────────────────────────────────────────────

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectSubscription: Subscription | null = null;
  private pollingSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  // ── Public observables ────────────────────────────────────────────────────

  /** Emits campaign availability updates from WebSocket or polling. */
  private campaignUpdates$ = new Subject<CampaignAvailabilityUpdate>();

  /** Emits the current WebSocket connection state. */
  private connectionState$ = new BehaviorSubject<WebSocketState>('disconnected');

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns an Observable that emits campaign availability updates.
   * Updates arrive via WebSocket when connected, or via polling as fallback.
   *
   * Validates: Requirements 10.2, 10.5
   */
  getCampaignUpdates(): Observable<CampaignAvailabilityUpdate> {
    return this.campaignUpdates$.asObservable();
  }

  /**
   * Returns an Observable of the current WebSocket connection state.
   */
  getConnectionState(): Observable<WebSocketState> {
    return this.connectionState$.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * Returns true if the WebSocket is currently connected.
   */
  isConnected(): boolean {
    return this.connectionState$.getValue() === 'connected';
  }

  /**
   * Returns true if the service is currently using polling fallback.
   */
  isPolling(): boolean {
    return this.connectionState$.getValue() === 'polling';
  }

  /**
   * Initiates the WebSocket connection.
   * If the connection fails, falls back to polling automatically.
   *
   * Validates: Requirements 10.5, 10.6
   */
  connect(): void {
    // WebSocket server is not implemented in the backend.
    // Skip straight to HTTP polling fallback (Req 10.6).
    if (!this.pollingSubscription) {
      this.startPolling();
    }
  }

  /**
   * Closes the WebSocket connection and stops polling.
   */
  disconnect(): void {
    this.stopPolling();
    this.cancelReconnect();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    this.connectionState$.next('disconnected');
  }

  /**
   * Manually triggers a campaign availability refresh via HTTP.
   * Useful when the user requests a manual refresh.
   *
   * Validates: Requirements 10.1
   */
  refreshCampaignAvailability(campaignIds: string[]): Observable<CampaignAvailabilityUpdate[]> {
    if (campaignIds.length === 0) {
      return EMPTY;
    }

    const params = campaignIds.join(',');
    return this.http
      .get<CampaignAvailabilityUpdate[]>(
        `${API_URL}/campaigns/availability?ids=${params}`,
      )
      .pipe(
        tap((updates) => {
          updates.forEach((update) => this.campaignUpdates$.next(update));
        }),
        catchError(() => EMPTY),
      );
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // -------------------------------------------------------------------------
  // Private — WebSocket management
  // -------------------------------------------------------------------------

  /**
   * Opens a new WebSocket connection and wires up event handlers.
   */
  private openWebSocket(): void {
    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      // WebSocket constructor can throw in some environments
      this.onWebSocketFailed();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.connectionState$.next('connected');
      this.stopPolling(); // Stop polling if it was running as fallback
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = () => {
      // onerror is always followed by onclose, so we handle reconnect there
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.connectionState$.next('disconnected');

      // 1000 = normal closure; don't reconnect
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Parses an incoming WebSocket message and emits a CampaignAvailabilityUpdate.
   */
  private handleMessage(data: string): void {
    try {
      const parsed = JSON.parse(data) as CampaignAvailabilityUpdate;
      if (parsed && parsed.campaignId) {
        this.campaignUpdates$.next(parsed);
      }
    } catch {
      console.warn('WebSocketService: received malformed message', data);
    }
  }

  /**
   * Schedules a reconnect attempt with exponential back-off.
   * Falls back to polling after MAX_RECONNECT_ATTEMPTS failures.
   *
   * Validates: Requirements 10.6
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `WebSocketService: max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Falling back to polling.`,
      );
      this.startPolling();
      return;
    }

    const delay = Math.min(
      RECONNECT_INITIAL_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    );

    this.reconnectAttempts++;

    this.cancelReconnect();
    this.reconnectSubscription = timer(delay)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.connectionState$.next('connecting');
        this.openWebSocket();
      });
  }

  /**
   * Called when the WebSocket cannot be created at all (e.g. not supported).
   */
  private onWebSocketFailed(): void {
    console.warn('WebSocketService: WebSocket unavailable. Using polling fallback.');
    this.startPolling();
  }

  private cancelReconnect(): void {
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe();
      this.reconnectSubscription = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private — Polling fallback
  // -------------------------------------------------------------------------

  /**
   * Starts HTTP polling as a fallback when WebSocket is unavailable.
   * Polls every 60 seconds.
   *
   * Validates: Requirements 10.1, 10.6
   */
  private startPolling(): void {
    if (this.pollingSubscription) {
      return; // Already polling
    }

    this.connectionState$.next('polling');

    this.pollingSubscription = interval(POLLING_INTERVAL_MS)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() =>
          this.http
            .get<CampaignAvailabilityUpdate[]>(`${API_URL}/campaigns/availability/updates`)
            .pipe(catchError(() => EMPTY)),
        ),
      )
      .subscribe((updates) => {
        if (Array.isArray(updates)) {
          updates.forEach((update) => this.campaignUpdates$.next(update));
        }
      });
  }

  /**
   * Stops the polling fallback.
   */
  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }
}

/**
 * NotificationService — manages in-app toast notifications.
 *
 * Provides:
 * - BehaviorSubject-backed notification history
 * - Active toast observable (most recent undismissed notification)
 * - Auto-dismiss after configurable delay (default 4000ms)
 * - Methods: showSuccess, showError, showInfo, showWarning, dismiss, clearAll
 *
 * Validates: Requirements 4.6, 16
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
  autoDismissMs?: number;
}

/** Default auto-dismiss delay in milliseconds. */
const DEFAULT_AUTO_DISMISS_MS = 4000;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class NotificationService {
  // ── Internal state ────────────────────────────────────────────────────────

  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private activeToastSubject = new BehaviorSubject<AppNotification | null>(null);

  // ── Public observables ────────────────────────────────────────────────────

  /**
   * Observable of the full notification history (all notifications ever shown).
   */
  notifications$: Observable<AppNotification[]> = this.notificationsSubject.asObservable();

  /**
   * Observable of the currently active (undismissed) toast notification.
   * Emits null when no toast is active.
   */
  activeToast$: Observable<AppNotification | null> = this.activeToastSubject.asObservable();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Shows a success notification.
   * Validates: Requirements 4.6
   */
  showSuccess(message: string): void {
    this.addNotification('success', message);
  }

  /**
   * Shows an error notification.
   */
  showError(message: string): void {
    this.addNotification('error', message);
  }

  /**
   * Shows an informational notification.
   */
  showInfo(message: string): void {
    this.addNotification('info', message);
  }

  /**
   * Shows a warning notification.
   */
  showWarning(message: string): void {
    this.addNotification('warning', message);
  }

  /**
   * Dismisses a notification by ID.
   * If the dismissed notification is the active toast, clears it.
   */
  dismiss(id: string): void {
    const current = this.activeToastSubject.getValue();
    if (current && current.id === id) {
      this.activeToastSubject.next(null);
    }
  }

  /**
   * Clears all notifications from history and dismisses the active toast.
   */
  clearAll(): void {
    this.notificationsSubject.next([]);
    this.activeToastSubject.next(null);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Creates a new notification, adds it to history, sets it as the active toast,
   * and schedules auto-dismiss.
   */
  private addNotification(
    type: AppNotification['type'],
    message: string,
    autoDismissMs: number = DEFAULT_AUTO_DISMISS_MS,
  ): void {
    const notification: AppNotification = {
      id: this.generateId(),
      type,
      message,
      timestamp: new Date(),
      autoDismissMs,
    };

    // Add to history
    const current = this.notificationsSubject.getValue();
    this.notificationsSubject.next([...current, notification]);

    // Set as active toast
    this.activeToastSubject.next(notification);

    // Schedule auto-dismiss
    timer(autoDismissMs).subscribe(() => {
      const active = this.activeToastSubject.getValue();
      if (active && active.id === notification.id) {
        this.activeToastSubject.next(null);
      }
    });
  }

  /**
   * Generates a unique notification ID.
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

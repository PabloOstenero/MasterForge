/**
 * ToastNotificationComponent — displays in-app toast notifications.
 *
 * Subscribes to NotificationService.activeToast$ and renders the current
 * notification with type-appropriate styling and a dismiss button.
 *
 * Validates: Requirements 4.6, 16
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NotificationService, AppNotification } from '../../../../services/notification.service';

@Component({
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  activeToast: AppNotification | null = null;

  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.activeToast$
      .pipe(takeUntil(this.destroy$))
      .subscribe((toast) => {
        this.activeToast = toast;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Dismisses the currently active toast.
   */
  onDismiss(): void {
    if (this.activeToast) {
      this.notificationService.dismiss(this.activeToast.id);
    }
  }
}

/**
 * NotificationService — unit tests and property-based tests.
 *
 * Feature: search-campaigns
 * Property 16: Enrollment Confirmation Notification
 * Validates: Requirements 4.6
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import * as fc from 'fast-check';

import { NotificationService, AppNotification } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  // ── Unit tests ─────────────────────────────────────────────────────────────

  describe('showSuccess()', () => {
    it('should add a notification with type "success"', (done) => {
      service.showSuccess('Operation succeeded');

      service.notifications$.subscribe((notifications) => {
        const found = notifications.find((n) => n.type === 'success');
        expect(found).toBeTruthy();
        expect(found!.message).toBe('Operation succeeded');
        done();
      });
    });

    it('should set the active toast to the new success notification', (done) => {
      service.showSuccess('Success message');

      service.activeToast$.subscribe((toast) => {
        if (toast) {
          expect(toast.type).toBe('success');
          expect(toast.message).toBe('Success message');
          done();
        }
      });
    });
  });

  describe('showError()', () => {
    it('should add a notification with type "error"', (done) => {
      service.showError('Something went wrong');

      service.notifications$.subscribe((notifications) => {
        const found = notifications.find((n) => n.type === 'error');
        expect(found).toBeTruthy();
        expect(found!.message).toBe('Something went wrong');
        done();
      });
    });
  });

  describe('showInfo()', () => {
    it('should add a notification with type "info"', (done) => {
      service.showInfo('Here is some info');

      service.notifications$.subscribe((notifications) => {
        const found = notifications.find((n) => n.type === 'info');
        expect(found).toBeTruthy();
        expect(found!.message).toBe('Here is some info');
        done();
      });
    });
  });

  describe('showWarning()', () => {
    it('should add a notification with type "warning"', (done) => {
      service.showWarning('Be careful');

      service.notifications$.subscribe((notifications) => {
        const found = notifications.find((n) => n.type === 'warning');
        expect(found).toBeTruthy();
        expect(found!.message).toBe('Be careful');
        done();
      });
    });
  });

  describe('dismiss()', () => {
    it('should clear the active toast when the active notification is dismissed', (done) => {
      service.showSuccess('Dismiss me');

      // Get the active toast id, then dismiss it
      service.activeToast$.subscribe((toast) => {
        if (toast) {
          service.dismiss(toast.id);
          // After dismiss, activeToast$ should emit null
          service.activeToast$.subscribe((afterDismiss) => {
            expect(afterDismiss).toBeNull();
            done();
          });
        }
      });
    });

    it('should not affect the notification history when dismissing', (done) => {
      service.showSuccess('Keep in history');

      service.activeToast$.subscribe((toast) => {
        if (toast) {
          service.dismiss(toast.id);
          service.notifications$.subscribe((notifications) => {
            // History should still contain the notification
            expect(notifications.length).toBeGreaterThan(0);
            done();
          });
        }
      });
    });

    it('should not clear active toast when dismissing a different id', (done) => {
      service.showSuccess('Active toast');

      service.activeToast$.subscribe((toast) => {
        if (toast) {
          service.dismiss('non-existent-id');
          // Check synchronously: activeToast$ is a BehaviorSubject, so we can read its current value
          let currentToast: AppNotification | null = null;
          const sub = service.activeToast$.subscribe((afterDismiss) => {
            currentToast = afterDismiss;
          });
          sub.unsubscribe();
          // Active toast should still be present
          expect(currentToast).not.toBeNull();
          done();
        }
      });
    });
  });

  describe('clearAll()', () => {
    it('should empty the notification list', (done) => {
      service.showSuccess('First');
      service.showError('Second');
      service.showInfo('Third');

      service.clearAll();

      service.notifications$.subscribe((notifications) => {
        expect(notifications.length).toBe(0);
        done();
      });
    });

    it('should clear the active toast', (done) => {
      service.showSuccess('Will be cleared');

      service.clearAll();

      service.activeToast$.subscribe((toast) => {
        expect(toast).toBeNull();
        done();
      });
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss the active toast after the configured delay', fakeAsync(() => {
      service.showSuccess('Auto-dismiss me');

      let activeToast: AppNotification | null = null;
      service.activeToast$.subscribe((toast) => {
        activeToast = toast;
      });

      // Toast should be active immediately
      expect(activeToast).not.toBeNull();

      // Advance time past the default 4000ms auto-dismiss delay
      tick(4001);

      // Toast should now be dismissed
      expect(activeToast).toBeNull();
    }));

    it('should keep the toast active before the delay expires', fakeAsync(() => {
      service.showSuccess('Still active');

      let activeToast: AppNotification | null = null;
      service.activeToast$.subscribe((toast) => {
        activeToast = toast;
      });

      // Advance time but not past the delay
      tick(2000);

      expect(activeToast).not.toBeNull();

      // Clean up
      tick(2001);
    }));
  });

  describe('notification history', () => {
    it('should accumulate multiple notifications in history', (done) => {
      service.showSuccess('First');
      service.showError('Second');
      service.showInfo('Third');

      service.notifications$.subscribe((notifications) => {
        expect(notifications.length).toBe(3);
        done();
      });
    });

    it('should preserve notification order (oldest first)', (done) => {
      service.showSuccess('First');
      service.showError('Second');

      service.notifications$.subscribe((notifications) => {
        if (notifications.length === 2) {
          expect(notifications[0].message).toBe('First');
          expect(notifications[1].message).toBe('Second');
          done();
        }
      });
    });
  });

  // ── Property-based tests ───────────────────────────────────────────────────

  /**
   * Feature: search-campaigns, Property 16: Enrollment Confirmation Notification
   * Validates: Requirements 4.6
   *
   * Property: For any successful enrollment result (success=true, non-empty campaignId,
   * non-empty message), calling showSuccess() must result in exactly one notification
   * being added to the history with type='success' and the correct message.
   */
  describe('Property 16: Enrollment Confirmation Notification', () => {
    it('should add exactly one success notification with the correct message for any valid enrollment', () => {
      let passed = true;
      let counterexample: unknown = null;

      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            campaignId: fc.uuid(),
          }),
          (input) => {
            // Re-create a fresh service instance for each property run
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({});
            const freshService = TestBed.inject(NotificationService);

            // Act: simulate a successful enrollment notification
            freshService.showSuccess(input.message);

            // Assert: notifications$ contains exactly one notification
            let notifications: AppNotification[] = [];
            freshService.notifications$.subscribe((n) => {
              notifications = n;
            });

            // There should be exactly one notification
            if (notifications.length !== 1) {
              passed = false;
              counterexample = input;
              return false;
            }

            // It must have type 'success'
            if (notifications[0].type !== 'success') {
              passed = false;
              counterexample = input;
              return false;
            }

            // It must carry the exact message
            if (notifications[0].message !== input.message) {
              passed = false;
              counterexample = input;
              return false;
            }

            // The active toast must also reflect this notification
            let activeToast: AppNotification | null = null;
            freshService.activeToast$.subscribe((t) => {
              activeToast = t;
            });

            if (!activeToast) {
              passed = false;
              counterexample = input;
              return false;
            }
            if ((activeToast as AppNotification).type !== 'success') {
              passed = false;
              counterexample = input;
              return false;
            }
            if ((activeToast as AppNotification).message !== input.message) {
              passed = false;
              counterexample = input;
              return false;
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );

      expect(passed)
        .withContext(`Property 16 failed for input: ${JSON.stringify(counterexample)}`)
        .toBeTrue();
    });

    it('should always assign a unique id to each notification', () => {
      let passed = true;
      let counterexample: unknown = null;

      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 100 }),
            { minLength: 2, maxLength: 10 },
          ),
          (messages) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({});
            const freshService = TestBed.inject(NotificationService);

            messages.forEach((msg) => freshService.showSuccess(msg));

            let notifications: AppNotification[] = [];
            freshService.notifications$.subscribe((n) => {
              notifications = n;
            });

            const ids = notifications.map((n) => n.id);
            const uniqueIds = new Set(ids);
            const result = uniqueIds.size === ids.length;
            if (!result) {
              passed = false;
              counterexample = messages;
            }
            return result;
          },
        ),
        { numRuns: 50 },
      );

      expect(passed)
        .withContext(`Unique ID property failed for input: ${JSON.stringify(counterexample)}`)
        .toBeTrue();
    });

    it('should always set a timestamp on each notification', () => {
      let passed = true;
      let counterexample: unknown = null;

      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            campaignId: fc.uuid(),
          }),
          (input) => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({});
            const freshService = TestBed.inject(NotificationService);

            const before = new Date();
            freshService.showSuccess(input.message);
            const after = new Date();

            let notifications: AppNotification[] = [];
            freshService.notifications$.subscribe((n) => {
              notifications = n;
            });

            if (notifications.length !== 1) {
              passed = false;
              counterexample = input;
              return false;
            }

            const ts = notifications[0].timestamp;
            const result = ts >= before && ts <= after;
            if (!result) {
              passed = false;
              counterexample = input;
            }
            return result;
          },
        ),
        { numRuns: 100 },
      );

      expect(passed)
        .withContext(`Timestamp property failed for input: ${JSON.stringify(counterexample)}`)
        .toBeTrue();
    });
  });
});

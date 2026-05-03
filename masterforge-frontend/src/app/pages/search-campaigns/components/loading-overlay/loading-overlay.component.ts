/**
 * LoadingOverlayComponent — displays a loading spinner overlay with a message
 * during async operations.
 *
 * Usage:
 *   <app-loading-overlay [loading]="isLoading" message="Cargando más..."></app-loading-overlay>
 *
 * Validates: Requirements 7.3, 7.4
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, IonSpinner],
  template: `
    @if (loading) {
      <div class="loading-overlay" role="status" aria-live="polite">
        <ion-spinner name="crescent"></ion-spinner>
        <p>{{ message }}</p>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      gap: 8px;
    }

    .loading-overlay p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-color-medium, #92949c);
    }
  `],
})
export class LoadingOverlayComponent {
  /** Whether the loading overlay is visible. */
  @Input() loading: boolean = false;

  /** Message to display below the spinner. */
  @Input() message: string = 'Cargando...';
}

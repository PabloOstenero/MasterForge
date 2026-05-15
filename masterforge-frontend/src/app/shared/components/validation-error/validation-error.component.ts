/**
 * ValidationErrorComponent — displays a user-friendly validation error message
 * for a form field using ErrorHandlerService for message mapping.
 *
 * Usage:
 *   <app-validation-error [errors]="form.get('field')?.errors" fieldName="field"></app-validation-error>
 *
 * Validates: Requirements 7.3, 7.4
 */

import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationErrors } from '@angular/forms';

import { ErrorHandlerService } from '../../../services/error-handler.service';

@Component({
  selector: 'app-validation-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errorMessage) {
      <span class="validation-error" role="alert">{{ errorMessage }}</span>
    }
  `,
  styles: [`
    .validation-error {
      display: block;
      color: var(--ion-color-danger, #eb445a);
      font-size: 0.75rem;
      margin-top: 4px;
    }
  `],
})
export class ValidationErrorComponent implements OnChanges {
  /** The ValidationErrors object from the form control, or null if valid. */
  @Input() errors: ValidationErrors | null = null;

  /** The field name used for context in error messages. */
  @Input() fieldName: string = '';

  errorMessage = '';

  private errorHandlerService = inject(ErrorHandlerService);

  ngOnChanges(): void {
    this.errorMessage = this.errorHandlerService.getValidationErrorMessage(
      this.fieldName,
      this.errors,
    );
  }
}

/**
 * Unit tests for ValidationErrorComponent.
 *
 * Tests cover:
 * - Shows nothing when errors is null
 * - Shows error message when required error is present
 * - Shows error message when invalidCardNumber error is present
 * - Updates message when errors input changes
 *
 * Validates: Requirements 7.3, 7.4
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ValidationErrorComponent } from './validation-error.component';
import { ErrorHandlerService } from '../../../services/error-handler.service';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('ValidationErrorComponent', () => {
  let component: ValidationErrorComponent;
  let fixture: ComponentFixture<ValidationErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationErrorComponent],
      providers: [ErrorHandlerService],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationErrorComponent);
    component = fixture.componentInstance;
  });

  // -------------------------------------------------------------------------
  // Null errors
  // -------------------------------------------------------------------------

  it('should show nothing when errors is null', () => {
    component.errors = null;
    component.fieldName = 'testField';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span).toBeNull();
  });

  it('should show nothing when errors is an empty object', () => {
    component.errors = {};
    component.fieldName = 'testField';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    // Empty errors object has no keys, so no message is generated
    expect(span).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Required error
  // -------------------------------------------------------------------------

  it('should show error message when required error is present', () => {
    component.errors = { required: true };
    component.fieldName = 'testField';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span).not.toBeNull();
    expect(span.nativeElement.textContent).toContain('obligatorio');
  });

  // -------------------------------------------------------------------------
  // invalidCardNumber error
  // -------------------------------------------------------------------------

  it('should show error message when invalidCardNumber error is present', () => {
    component.errors = { invalidCardNumber: true };
    component.fieldName = 'cardNumber';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span).not.toBeNull();
    expect(span.nativeElement.textContent).toContain('tarjeta');
  });

  // -------------------------------------------------------------------------
  // expiredCard error
  // -------------------------------------------------------------------------

  it('should show "expirado" message when expiredCard error is present', () => {
    component.errors = { expiredCard: true };
    component.fieldName = 'expiryDate';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span).not.toBeNull();
    expect(span.nativeElement.textContent).toContain('expirado');
  });

  // -------------------------------------------------------------------------
  // Dynamic updates
  // -------------------------------------------------------------------------

  it('should update message when errors input changes from null to required', () => {
    component.errors = null;
    component.fieldName = 'testField';
    fixture.detectChanges();

    // Initially no error shown
    expect(fixture.debugElement.query(By.css('.validation-error'))).toBeNull();

    // Simulate input change
    component.errors = { required: true };
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span).not.toBeNull();
    expect(span.nativeElement.textContent).toContain('obligatorio');
  });

  it('should clear message when errors input changes from required to null', () => {
    component.errors = { required: true };
    component.fieldName = 'testField';
    component.ngOnChanges();
    fixture.detectChanges();

    // Error shown initially
    expect(fixture.debugElement.query(By.css('.validation-error'))).not.toBeNull();

    // Clear errors
    component.errors = null;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.validation-error'))).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  it('should have role="alert" on the error span', () => {
    component.errors = { required: true };
    component.fieldName = 'testField';
    component.ngOnChanges();
    fixture.detectChanges();

    const span = fixture.debugElement.query(By.css('.validation-error'));
    expect(span.nativeElement.getAttribute('role')).toBe('alert');
  });
});

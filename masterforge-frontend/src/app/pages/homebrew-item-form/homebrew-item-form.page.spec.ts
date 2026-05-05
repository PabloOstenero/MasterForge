/**
 * Unit tests for HomebrewItemFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 10.2, 10.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewItemFormPage } from './homebrew-item-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Sword of Flames',
    type: 'Weapon',
    weight: 1.5,
    properties: null,   // optional — omitted
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewItemFormPage', () => {
  let component: HomebrewItemFormPage;
  let fixture: ComponentFixture<HomebrewItemFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createItem',
    ]);
    homebrewServiceSpy.createItem.and.returnValue(of({}));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewItemFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewItemFormPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise with a FormGroup', () => {
    expect(component.form).toBeTruthy();
  });

  it('should start with submitting = false', () => {
    expect(component.submitting).toBeFalse();
  });

  it('should start with error = null', () => {
    expect(component.error).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Form validity — Requirement 10.2
  // -------------------------------------------------------------------------

  describe('Form validity', () => {

    // --- name field ---

    it('should be invalid when name is empty', () => {
      component.form.patchValue({ name: '' });
      expect(component.form.get('name')?.invalid).toBeTrue();
    });

    it('should have a required error on name when empty', () => {
      component.form.patchValue({ name: '' });
      expect(component.form.get('name')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for name when a non-empty string is provided', () => {
      component.form.patchValue({ name: 'Magic Sword' });
      expect(component.form.get('name')?.valid).toBeTrue();
    });

    // --- type field ---

    it('should be invalid when type is empty', () => {
      component.form.patchValue({ type: '' });
      expect(component.form.get('type')?.invalid).toBeTrue();
    });

    it('should have a required error on type when empty', () => {
      component.form.patchValue({ type: '' });
      expect(component.form.get('type')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for type when a non-empty string is provided', () => {
      component.form.patchValue({ type: 'Armor' });
      expect(component.form.get('type')?.valid).toBeTrue();
    });

    // --- weight field ---

    it('should be invalid when weight is negative', () => {
      component.form.patchValue({ weight: -1 });
      expect(component.form.get('weight')?.invalid).toBeTrue();
    });

    it('should have a min error when weight is negative', () => {
      component.form.patchValue({ weight: -0.01 });
      expect(component.form.get('weight')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when weight is null (required)', () => {
      component.form.patchValue({ weight: null });
      expect(component.form.get('weight')?.invalid).toBeTrue();
    });

    it('should be valid when weight is exactly 0', () => {
      component.form.patchValue({ weight: 0 });
      expect(component.form.get('weight')?.valid).toBeTrue();
    });

    it('should be valid when weight is a positive value', () => {
      component.form.patchValue({ weight: 2.5 });
      expect(component.form.get('weight')?.valid).toBeTrue();
    });

    // --- properties field (optional) ---

    it('should be valid when properties is null (optional field)', () => {
      component.form.patchValue({ properties: null });
      expect(component.form.get('properties')?.valid).toBeTrue();
    });

    it('should be valid when properties is omitted (null default)', () => {
      // properties defaults to null — no validators applied
      expect(component.form.get('properties')?.valid).toBeTrue();
    });

    // --- overall form validity ---

    it('should be invalid when the overall form starts (all fields empty/default)', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when all required fields satisfy their constraints and properties is omitted', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });

    it('should be valid with correct values even when properties is not provided', () => {
      component.form.patchValue({ name: 'Potion of Healing', type: 'Potion', weight: 0.5 });
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Error messages in template — Requirement 10.5
  // -------------------------------------------------------------------------

  describe('Error messages on invalid submit attempt', () => {

    it('should mark all controls as touched when submit is called with invalid form', () => {
      spyOn(component.form, 'markAllAsTouched').and.callThrough();
      component.submit();
      expect(component.form.markAllAsTouched).toHaveBeenCalled();
    });

    it('should show name error message after submit with empty name', () => {
      // Form starts invalid; calling submit() marks all touched
      component.submit();
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeTruthy();
      expect(nameError.textContent).toContain('obligatorio');
    });

    it('should show type error message after submit with empty type', () => {
      component.form.patchValue({ name: 'Sword', type: '', weight: 1 });
      component.submit();
      fixture.detectChanges();

      const typeError = fixture.nativeElement.querySelector('[data-testid="type-error"]');
      expect(typeError).toBeTruthy();
      expect(typeError.textContent).toContain('obligatorio');
    });

    it('should show weight error message after submit with negative weight', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: -1 });
      component.submit();
      fixture.detectChanges();

      const weightError = fixture.nativeElement.querySelector('[data-testid="weight-error"]');
      expect(weightError).toBeTruthy();
    });

    it('should show weight required error message after submit with null weight', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: null });
      component.submit();
      fixture.detectChanges();

      const weightError = fixture.nativeElement.querySelector('[data-testid="weight-error"]');
      expect(weightError).toBeTruthy();
    });

    it('should NOT show name error before submit is attempted', () => {
      // Form is invalid but untouched — errors should not be visible yet
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeNull();
    });

    it('should NOT show type error before submit is attempted', () => {
      fixture.detectChanges();

      const typeError = fixture.nativeElement.querySelector('[data-testid="type-error"]');
      expect(typeError).toBeNull();
    });

    it('should NOT show weight error before submit is attempted', () => {
      fixture.detectChanges();

      const weightError = fixture.nativeElement.querySelector('[data-testid="weight-error"]');
      expect(weightError).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Submit guard — HomebrewService NOT called when form is invalid
  // -------------------------------------------------------------------------

  describe('Submit guard — invalid form', () => {

    it('should NOT call HomebrewService.createItem() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createItem).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createItem() when name is empty', () => {
      component.form.patchValue({ name: '', type: 'Weapon', weight: 1 });
      component.submit();
      expect(homebrewServiceSpy.createItem).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createItem() when type is empty', () => {
      component.form.patchValue({ name: 'Sword', type: '', weight: 1 });
      component.submit();
      expect(homebrewServiceSpy.createItem).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createItem() when weight is negative', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: -1 });
      component.submit();
      expect(homebrewServiceSpy.createItem).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createItem() when weight is null', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: null });
      component.submit();
      expect(homebrewServiceSpy.createItem).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createItem.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createItem() when form is valid', () => {
      component.submit();
      expect(homebrewServiceSpy.createItem).toHaveBeenCalled();
    });

    it('should navigate to /homebrew on successful submit', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.submit();
      expect(navigateSpy).toHaveBeenCalledWith(['/homebrew']);
    });

    it('should set submitting = false after successful submit', () => {
      component.submit();
      expect(component.submitting).toBeFalse();
    });

    it('should keep error = null after successful submit', () => {
      component.submit();
      expect(component.error).toBeNull();
    });

    it('should pass properties as empty object when properties is null', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: 1, properties: null });
      component.submit();

      const callArg = homebrewServiceSpy.createItem.calls.mostRecent().args[0];
      expect(callArg['properties']).toEqual({});
    });
  });

  // -------------------------------------------------------------------------
  // Failed submit — shows error and retains form values
  // -------------------------------------------------------------------------

  describe('Failed submit', () => {

    const backendError = { error: { message: 'Internal server error' } };

    beforeEach(() => {
      homebrewServiceSpy.createItem.and.returnValue(throwError(() => backendError));
      component.form.patchValue(validFormValue());
    });

    it('should set error message when backend returns an error', () => {
      component.submit();
      expect(component.error).toBeTruthy();
    });

    it('should display the backend error message from err.error.message', () => {
      component.submit();
      expect(component.error).toBe('Internal server error');
    });

    it('should display a fallback error message when err.error.message is absent', () => {
      homebrewServiceSpy.createItem.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createItem.and.returnValue(throwError(() => ({})));
      component.submit();
      expect(component.error).toBeTruthy();
    });

    it('should render the error message in the template', () => {
      component.submit();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="form-error"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Internal server error');
    });

    it('should NOT navigate to /homebrew when backend returns an error', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.submit();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should retain form values after a failed submit', () => {
      const nameBeforeSubmit = component.form.get('name')?.value;
      component.submit();
      expect(component.form.get('name')?.value).toBe(nameBeforeSubmit);
    });

    it('should set submitting = false after a failed submit', () => {
      component.submit();
      expect(component.submitting).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Cancel', () => {

    it('should navigate to /homebrew when cancel() is called', () => {
      const navigateSpy = spyOn(router, 'navigate');
      component.cancel();
      expect(navigateSpy).toHaveBeenCalledWith(['/homebrew']);
    });

    it('should render a cancel button in the template', () => {
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(cancelBtn).toBeTruthy();
    });
  });
});

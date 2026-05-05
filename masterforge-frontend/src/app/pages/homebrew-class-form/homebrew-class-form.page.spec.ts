/**
 * Unit tests for HomebrewClassFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 3.2, 3.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewClassFormPage } from './homebrew-class-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Artificer',
    hitDie: 8,
    savingThrows: {
      strength: false,
      dexterity: false,
      constitution: true,
      intelligence: false,
      wisdom: false,
      charisma: false,
    },
    price: 0,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewClassFormPage', () => {
  let component: HomebrewClassFormPage;
  let fixture: ComponentFixture<HomebrewClassFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createClass',
    ]);
    homebrewServiceSpy.createClass.and.returnValue(of({}));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewClassFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewClassFormPage);
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
  // Form validity — Requirement 3.2
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
      component.form.patchValue({ name: 'Paladin' });
      expect(component.form.get('name')?.valid).toBeTrue();
    });

    // --- hitDie field ---

    it('should be invalid when hitDie is below 4', () => {
      component.form.patchValue({ hitDie: 3 });
      expect(component.form.get('hitDie')?.invalid).toBeTrue();
    });

    it('should have a min error when hitDie is 3', () => {
      component.form.patchValue({ hitDie: 3 });
      expect(component.form.get('hitDie')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when hitDie is above 12', () => {
      component.form.patchValue({ hitDie: 13 });
      expect(component.form.get('hitDie')?.invalid).toBeTrue();
    });

    it('should have a max error when hitDie is 13', () => {
      component.form.patchValue({ hitDie: 13 });
      expect(component.form.get('hitDie')?.errors?.['max']).toBeTruthy();
    });

    it('should be invalid when hitDie is null (required)', () => {
      component.form.patchValue({ hitDie: null });
      expect(component.form.get('hitDie')?.invalid).toBeTrue();
    });

    it('should be valid when hitDie is exactly 4 (lower boundary)', () => {
      component.form.patchValue({ hitDie: 4 });
      expect(component.form.get('hitDie')?.valid).toBeTrue();
    });

    it('should be valid when hitDie is exactly 12 (upper boundary)', () => {
      component.form.patchValue({ hitDie: 12 });
      expect(component.form.get('hitDie')?.valid).toBeTrue();
    });

    it('should be valid when hitDie is 8 (mid-range)', () => {
      component.form.patchValue({ hitDie: 8 });
      expect(component.form.get('hitDie')?.valid).toBeTrue();
    });

    // --- savingThrows field ---

    it('should be invalid when no saving throw is selected (all false)', () => {
      const savingThrows = component.form.get('savingThrows');
      savingThrows?.patchValue({
        strength: false,
        dexterity: false,
        constitution: false,
        intelligence: false,
        wisdom: false,
        charisma: false,
      });
      expect(savingThrows?.invalid).toBeTrue();
    });

    it('should have atLeastOneRequired error when no saving throw is selected', () => {
      const savingThrows = component.form.get('savingThrows');
      savingThrows?.patchValue({
        strength: false,
        dexterity: false,
        constitution: false,
        intelligence: false,
        wisdom: false,
        charisma: false,
      });
      expect(savingThrows?.errors?.['atLeastOneRequired']).toBeTrue();
    });

    it('should be valid when at least one saving throw is selected', () => {
      const savingThrows = component.form.get('savingThrows');
      savingThrows?.patchValue({
        strength: true,
        dexterity: false,
        constitution: false,
        intelligence: false,
        wisdom: false,
        charisma: false,
      });
      expect(savingThrows?.valid).toBeTrue();
    });

    it('should be valid when all saving throws are selected', () => {
      const savingThrows = component.form.get('savingThrows');
      savingThrows?.patchValue({
        strength: true,
        dexterity: true,
        constitution: true,
        intelligence: true,
        wisdom: true,
        charisma: true,
      });
      expect(savingThrows?.valid).toBeTrue();
    });

    // --- price field ---

    it('should be invalid when price is negative', () => {
      component.form.patchValue({ price: -1 });
      expect(component.form.get('price')?.invalid).toBeTrue();
    });

    it('should have a min error when price is negative', () => {
      component.form.patchValue({ price: -0.01 });
      expect(component.form.get('price')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when price is null (required)', () => {
      component.form.patchValue({ price: null });
      expect(component.form.get('price')?.invalid).toBeTrue();
    });

    it('should be valid when price is exactly 0', () => {
      component.form.patchValue({ price: 0 });
      expect(component.form.get('price')?.valid).toBeTrue();
    });

    it('should be valid when price is a positive value', () => {
      component.form.patchValue({ price: 9.99 });
      expect(component.form.get('price')?.valid).toBeTrue();
    });

    // --- overall form validity ---

    it('should be invalid when the overall form starts (all fields empty/default)', () => {
      // After ngOnInit the form has empty name, null hitDie, all-false savingThrows, null price
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when all fields satisfy their constraints', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Error messages in template — Requirement 3.5
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

    it('should show hitDie error message after submit with out-of-range hitDie', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 3, price: 0 });
      component.form.get('savingThrows')?.patchValue({ constitution: true });
      component.submit();
      fixture.detectChanges();

      const hitDieError = fixture.nativeElement.querySelector('[data-testid="hit-die-error"]');
      expect(hitDieError).toBeTruthy();
    });

    it('should show saving throws error message after submit with no saving throw selected', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 8, price: 0 });
      // All saving throws remain false (default)
      component.submit();
      fixture.detectChanges();

      const savingThrowsError = fixture.nativeElement.querySelector('[data-testid="saving-throws-error"]');
      expect(savingThrowsError).toBeTruthy();
    });

    it('should show price error message after submit with negative price', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 8, price: -5 });
      component.form.get('savingThrows')?.patchValue({ constitution: true });
      component.submit();
      fixture.detectChanges();

      const priceError = fixture.nativeElement.querySelector('[data-testid="price-error"]');
      expect(priceError).toBeTruthy();
    });

    it('should NOT show name error before submit is attempted', () => {
      // Form is invalid but untouched — errors should not be visible yet
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Submit guard — HomebrewService NOT called when form is invalid
  // -------------------------------------------------------------------------

  describe('Submit guard — invalid form', () => {

    it('should NOT call HomebrewService.createClass() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createClass() when name is empty', () => {
      component.form.patchValue({ hitDie: 8, price: 0 });
      component.form.get('savingThrows')?.patchValue({ constitution: true });
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createClass() when hitDie is out of range', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 20, price: 0 });
      component.form.get('savingThrows')?.patchValue({ constitution: true });
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createClass() when no saving throw is selected', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 8, price: 0 });
      // All saving throws remain false
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createClass() when price is negative', () => {
      component.form.patchValue({ name: 'Artificer', hitDie: 8, price: -1 });
      component.form.get('savingThrows')?.patchValue({ constitution: true });
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createClass.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createClass() with the form value', () => {
      component.submit();
      expect(homebrewServiceSpy.createClass).toHaveBeenCalledWith(component.form.value);
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
  });

  // -------------------------------------------------------------------------
  // Failed submit — shows error and retains form values
  // -------------------------------------------------------------------------

  describe('Failed submit', () => {

    const backendError = { error: { message: 'Internal server error' } };

    beforeEach(() => {
      homebrewServiceSpy.createClass.and.returnValue(throwError(() => backendError));
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
      homebrewServiceSpy.createClass.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createClass.and.returnValue(throwError(() => ({})));
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

/**
 * Unit tests for HomebrewRaceFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 5.2, 5.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewRaceFormPage } from './homebrew-race-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a valid form value that satisfies all validators.
 *
 * Requirements 5.2:
 *   - name: non-empty string
 *   - size: non-empty string (required)
 *   - price: decimal >= 0
 *   - bonusStr/Dex/Con/Int/Wis/Cha: integer in [-10, 10] (optional, default 0)
 *   - speeds.walk: required, >= 0
 */
function validFormValue() {
  return {
    name: 'Half-Elf',
    size: 'Medium',
    price: 0,
    bonusStr: 0,
    bonusDex: 1,
    bonusCon: 0,
    bonusInt: 1,
    bonusWis: 0,
    bonusCha: 2,
    speeds: { walk: 30, swim: null, climb: null, fly: null },
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewRaceFormPage', () => {
  let component: HomebrewRaceFormPage;
  let fixture: ComponentFixture<HomebrewRaceFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createRace', 'getAllSpells'
    ]);
    homebrewServiceSpy.createRace.and.returnValue(of({}));
    homebrewServiceSpy.getAllSpells.and.returnValue(of([]));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1', isPro: () => false, getCurrentUser: () => ({ id: 'user-1', name: 'Test User', role: 'USER' }),
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewRaceFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewRaceFormPage);
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

  // -------------------------------------------------------------------------
  // Form validity — Requirement 5.2
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
      component.form.patchValue({ name: 'Half-Elf' });
      expect(component.form.get('name')?.valid).toBeTrue();
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

    it('should be valid when price is null (optional)', () => {
      component.form.patchValue({ price: null });
      expect(component.form.get('price')?.valid).toBeTrue();
    });

    it('should be valid when price is exactly 0', () => {
      component.form.patchValue({ price: 0 });
      expect(component.form.get('price')?.valid).toBeTrue();
    });

    it('should be valid when price is a positive value', () => {
      component.form.patchValue({ price: 9.99 });
      expect(component.form.get('price')?.valid).toBeTrue();
    });

    // --- bonusStr field ---

    it('should be invalid when bonusStr is below 0', () => {
      component.form.patchValue({ bonusStr: -1 });
      expect(component.form.get('bonusStr')?.invalid).toBeTrue();
    });

    it('should have a min error when bonusStr is -1', () => {
      component.form.patchValue({ bonusStr: -1 });
      expect(component.form.get('bonusStr')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when bonusStr is above 5', () => {
      component.form.patchValue({ bonusStr: 6 });
      expect(component.form.get('bonusStr')?.invalid).toBeTrue();
    });

    it('should have a max error when bonusStr is 6', () => {
      component.form.patchValue({ bonusStr: 6 });
      expect(component.form.get('bonusStr')?.errors?.['max']).toBeTruthy();
    });

    it('should be valid when bonusStr is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusStr: null });
      expect(component.form.get('bonusStr')?.valid).toBeTrue();
    });

    it('should be valid when bonusStr is exactly 0 (lower boundary)', () => {
      component.form.patchValue({ bonusStr: 0 });
      expect(component.form.get('bonusStr')?.valid).toBeTrue();
    });

    it('should be valid when bonusStr is exactly 5 (upper boundary)', () => {
      component.form.patchValue({ bonusStr: 5 });
      expect(component.form.get('bonusStr')?.valid).toBeTrue();
    });

    it('should be valid when bonusStr is 2 (mid-range)', () => {
      component.form.patchValue({ bonusStr: 2 });
      expect(component.form.get('bonusStr')?.valid).toBeTrue();
    });

    // --- bonusDex field ---

    it('should be invalid when bonusDex is below 0', () => {
      component.form.patchValue({ bonusDex: -1 });
      expect(component.form.get('bonusDex')?.invalid).toBeTrue();
    });

    it('should be invalid when bonusDex is above 5', () => {
      component.form.patchValue({ bonusDex: 6 });
      expect(component.form.get('bonusDex')?.invalid).toBeTrue();
    });

    it('should be valid when bonusDex is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusDex: null });
      expect(component.form.get('bonusDex')?.valid).toBeTrue();
    });

    it('should be valid when bonusDex is within range [0, 5]', () => {
      component.form.patchValue({ bonusDex: 2 });
      expect(component.form.get('bonusDex')?.valid).toBeTrue();
    });

    // --- bonusCon field ---

    it('should be invalid when bonusCon is below 0', () => {
      component.form.patchValue({ bonusCon: -1 });
      expect(component.form.get('bonusCon')?.invalid).toBeTrue();
    });

    it('should be invalid when bonusCon is above 5', () => {
      component.form.patchValue({ bonusCon: 6 });
      expect(component.form.get('bonusCon')?.invalid).toBeTrue();
    });

    it('should be valid when bonusCon is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusCon: null });
      expect(component.form.get('bonusCon')?.valid).toBeTrue();
    });

    it('should be valid when bonusCon is within range [0, 5]', () => {
      component.form.patchValue({ bonusCon: 1 });
      expect(component.form.get('bonusCon')?.valid).toBeTrue();
    });

    // --- bonusInt field ---

    it('should be invalid when bonusInt is below 0', () => {
      component.form.patchValue({ bonusInt: -1 });
      expect(component.form.get('bonusInt')?.invalid).toBeTrue();
    });

    it('should be invalid when bonusInt is above 5', () => {
      component.form.patchValue({ bonusInt: 6 });
      expect(component.form.get('bonusInt')?.invalid).toBeTrue();
    });

    it('should be valid when bonusInt is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusInt: null });
      expect(component.form.get('bonusInt')?.valid).toBeTrue();
    });

    it('should be valid when bonusInt is within range [0, 5]', () => {
      component.form.patchValue({ bonusInt: 1 });
      expect(component.form.get('bonusInt')?.valid).toBeTrue();
    });

    // --- bonusWis field ---

    it('should be invalid when bonusWis is below 0', () => {
      component.form.patchValue({ bonusWis: -1 });
      expect(component.form.get('bonusWis')?.invalid).toBeTrue();
    });

    it('should be invalid when bonusWis is above 5', () => {
      component.form.patchValue({ bonusWis: 6 });
      expect(component.form.get('bonusWis')?.invalid).toBeTrue();
    });

    it('should be valid when bonusWis is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusWis: null });
      expect(component.form.get('bonusWis')?.valid).toBeTrue();
    });

    it('should be valid when bonusWis is within range [0, 5]', () => {
      component.form.patchValue({ bonusWis: 3 });
      expect(component.form.get('bonusWis')?.valid).toBeTrue();
    });

    // --- bonusCha field ---

    it('should be invalid when bonusCha is below 0', () => {
      component.form.patchValue({ bonusCha: -1 });
      expect(component.form.get('bonusCha')?.invalid).toBeTrue();
    });

    it('should be invalid when bonusCha is above 5', () => {
      component.form.patchValue({ bonusCha: 6 });
      expect(component.form.get('bonusCha')?.invalid).toBeTrue();
    });

    it('should be valid when bonusCha is null (optional field, defaults to 0)', () => {
      component.form.patchValue({ bonusCha: null });
      expect(component.form.get('bonusCha')?.valid).toBeTrue();
    });

    it('should be valid when bonusCha is within range [0, 5]', () => {
      component.form.patchValue({ bonusCha: 2 });
      expect(component.form.get('bonusCha')?.valid).toBeTrue();
    });

    // --- overall form validity ---

    it('should be invalid when the form starts (all fields empty/default)', () => {
      // After ngOnInit the form has empty name, null price, null ability bonuses
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when all fields satisfy their constraints', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Error messages in template — Requirement 5.5
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

    it('should show price error message after submit with negative price', () => {
      component.form.patchValue({ ...validFormValue(), price: -5 });
      component.submit();
      fixture.detectChanges();

      const priceError = fixture.nativeElement.querySelector('[data-testid="price-error"]');
      expect(priceError).toBeTruthy();
    });



    it('should show bonusStr error message after submit with out-of-range bonusStr', () => {
      component.form.patchValue({ ...validFormValue(), bonusStr: 11 });
      component.submit();
      fixture.detectChanges();

      const bonusStrError = fixture.nativeElement.querySelector('[data-testid="bonusStr-error"]');
      expect(bonusStrError).toBeTruthy();
    });

    it('should show bonusDex error message after submit with out-of-range bonusDex', () => {
      component.form.patchValue({ ...validFormValue(), bonusDex: -11 });
      component.submit();
      fixture.detectChanges();

      const bonusDexError = fixture.nativeElement.querySelector('[data-testid="bonusDex-error"]');
      expect(bonusDexError).toBeTruthy();
    });

    it('should show bonusCon error message after submit with out-of-range bonusCon', () => {
      component.form.patchValue({ ...validFormValue(), bonusCon: 11 });
      component.submit();
      fixture.detectChanges();

      const bonusConError = fixture.nativeElement.querySelector('[data-testid="bonusCon-error"]');
      expect(bonusConError).toBeTruthy();
    });

    it('should show bonusInt error message after submit with out-of-range bonusInt', () => {
      component.form.patchValue({ ...validFormValue(), bonusInt: -11 });
      component.submit();
      fixture.detectChanges();

      const bonusIntError = fixture.nativeElement.querySelector('[data-testid="bonusInt-error"]');
      expect(bonusIntError).toBeTruthy();
    });

    it('should show bonusWis error message after submit with out-of-range bonusWis', () => {
      component.form.patchValue({ ...validFormValue(), bonusWis: 11 });
      component.submit();
      fixture.detectChanges();

      const bonusWisError = fixture.nativeElement.querySelector('[data-testid="bonusWis-error"]');
      expect(bonusWisError).toBeTruthy();
    });

    it('should show bonusCha error message after submit with out-of-range bonusCha', () => {
      component.form.patchValue({ ...validFormValue(), bonusCha: -11 });
      component.submit();
      fixture.detectChanges();

      const bonusChaError = fixture.nativeElement.querySelector('[data-testid="bonusCha-error"]');
      expect(bonusChaError).toBeTruthy();
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

    it('should NOT call HomebrewService.createRace() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when name is empty', () => {
      component.form.patchValue({ ...validFormValue(), name: '' });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when price is negative', () => {
      component.form.patchValue({ ...validFormValue(), price: -1 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusStr is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusStr: 11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusDex is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusDex: -11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusCon is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusCon: 11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusInt is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusInt: -11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusWis is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusWis: 11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createRace() when bonusCha is out of range', () => {
      component.form.patchValue({ ...validFormValue(), bonusCha: -11 });
      component.submit();
      expect(homebrewServiceSpy.createRace).not.toHaveBeenCalled();
    });

  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createRace.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createRace() when form is valid', () => {
      component.submit();
      expect(homebrewServiceSpy.createRace).toHaveBeenCalled();
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
      homebrewServiceSpy.createRace.and.returnValue(throwError(() => backendError));
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
      homebrewServiceSpy.createRace.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createRace.and.returnValue(throwError(() => ({})));
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

    it('should render the error message in the template when error is set directly', () => {
      component.error = 'Error de prueba';
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="form-error"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Error de prueba');
    });

  });
});

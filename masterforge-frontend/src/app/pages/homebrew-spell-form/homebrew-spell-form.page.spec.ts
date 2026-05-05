/**
 * Unit tests for HomebrewSpellFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 7.2, 7.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewSpellFormPage } from './homebrew-spell-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    description: 'A bright streak flashes from your pointing finger to a point you choose.',
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewSpellFormPage', () => {
  let component: HomebrewSpellFormPage;
  let fixture: ComponentFixture<HomebrewSpellFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createSpell',
    ]);
    homebrewServiceSpy.createSpell.and.returnValue(of({}));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewSpellFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewSpellFormPage);
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
  // Form validity — Requirement 7.2
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
      component.form.patchValue({ name: 'Magic Missile' });
      expect(component.form.get('name')?.valid).toBeTrue();
    });

    // --- level field ---

    it('should be invalid when level is below 0', () => {
      component.form.patchValue({ level: -1 });
      expect(component.form.get('level')?.invalid).toBeTrue();
    });

    it('should have a min error when level is -1', () => {
      component.form.patchValue({ level: -1 });
      expect(component.form.get('level')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when level is above 9', () => {
      component.form.patchValue({ level: 10 });
      expect(component.form.get('level')?.invalid).toBeTrue();
    });

    it('should have a max error when level is 10', () => {
      component.form.patchValue({ level: 10 });
      expect(component.form.get('level')?.errors?.['max']).toBeTruthy();
    });

    it('should be invalid when level is null (required)', () => {
      component.form.patchValue({ level: null });
      expect(component.form.get('level')?.invalid).toBeTrue();
    });

    it('should be valid when level is exactly 0 (cantrip)', () => {
      component.form.patchValue({ level: 0 });
      expect(component.form.get('level')?.valid).toBeTrue();
    });

    it('should be valid when level is exactly 9 (upper boundary)', () => {
      component.form.patchValue({ level: 9 });
      expect(component.form.get('level')?.valid).toBeTrue();
    });

    it('should be valid when level is 3 (mid-range)', () => {
      component.form.patchValue({ level: 3 });
      expect(component.form.get('level')?.valid).toBeTrue();
    });

    // --- school field ---

    it('should be invalid when school is empty', () => {
      component.form.patchValue({ school: '' });
      expect(component.form.get('school')?.invalid).toBeTrue();
    });

    it('should have a required error on school when empty', () => {
      component.form.patchValue({ school: '' });
      expect(component.form.get('school')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for school when a non-empty string is provided', () => {
      component.form.patchValue({ school: 'Necromancy' });
      expect(component.form.get('school')?.valid).toBeTrue();
    });

    // --- description field ---

    it('should be invalid when description is empty', () => {
      component.form.patchValue({ description: '' });
      expect(component.form.get('description')?.invalid).toBeTrue();
    });

    it('should have a required error on description when empty', () => {
      component.form.patchValue({ description: '' });
      expect(component.form.get('description')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for description when a non-empty string is provided', () => {
      component.form.patchValue({ description: 'A powerful spell.' });
      expect(component.form.get('description')?.valid).toBeTrue();
    });

    // --- overall form validity ---

    it('should be invalid when the overall form starts (all fields empty/default)', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when all fields satisfy their constraints', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Error messages in template — Requirement 7.5
  // -------------------------------------------------------------------------

  describe('Error messages on invalid submit attempt', () => {

    it('should mark all controls as touched when submit is called with invalid form', () => {
      spyOn(component.form, 'markAllAsTouched').and.callThrough();
      component.submit();
      expect(component.form.markAllAsTouched).toHaveBeenCalled();
    });

    it('should show name error message after submit with empty name', () => {
      component.submit();
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeTruthy();
      expect(nameError.textContent).toContain('obligatorio');
    });

    it('should show level error message after submit with out-of-range level', () => {
      component.form.patchValue({ name: 'Fireball', level: 10, school: 'Evocation', description: 'Desc' });
      component.submit();
      fixture.detectChanges();

      const levelError = fixture.nativeElement.querySelector('[data-testid="level-error"]');
      expect(levelError).toBeTruthy();
    });

    it('should show school error message after submit with empty school', () => {
      component.form.patchValue({ name: 'Fireball', level: 3, school: '', description: 'Desc' });
      component.submit();
      fixture.detectChanges();

      const schoolError = fixture.nativeElement.querySelector('[data-testid="school-error"]');
      expect(schoolError).toBeTruthy();
    });

    it('should show description error message after submit with empty description', () => {
      component.form.patchValue({ name: 'Fireball', level: 3, school: 'Evocation', description: '' });
      component.submit();
      fixture.detectChanges();

      const descriptionError = fixture.nativeElement.querySelector('[data-testid="description-error"]');
      expect(descriptionError).toBeTruthy();
    });

    it('should NOT show name error before submit is attempted', () => {
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Submit guard — HomebrewService NOT called when form is invalid
  // -------------------------------------------------------------------------

  describe('Submit guard — invalid form', () => {

    it('should NOT call HomebrewService.createSpell() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSpell() when name is empty', () => {
      component.form.patchValue({ name: '', level: 3, school: 'Evocation', description: 'Desc' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSpell() when level is out of range', () => {
      component.form.patchValue({ name: 'Fireball', level: 10, school: 'Evocation', description: 'Desc' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSpell() when school is empty', () => {
      component.form.patchValue({ name: 'Fireball', level: 3, school: '', description: 'Desc' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSpell() when description is empty', () => {
      component.form.patchValue({ name: 'Fireball', level: 3, school: 'Evocation', description: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createSpell.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createSpell() with the form value', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).toHaveBeenCalledWith(component.form.value);
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
      homebrewServiceSpy.createSpell.and.returnValue(throwError(() => backendError));
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
      homebrewServiceSpy.createSpell.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createSpell.and.returnValue(throwError(() => ({})));
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

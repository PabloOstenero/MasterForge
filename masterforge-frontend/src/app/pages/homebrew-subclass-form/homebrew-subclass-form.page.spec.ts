/**
 * Unit tests for HomebrewSubclassFormPage — form validation, class list loading, and navigation.
 *
 * Validates: Requirements 4.2, 4.3, 4.6
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewSubclassFormPage } from './homebrew-subclass-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_CLASSES = [
  { id: 1, name: 'Barbarian' },
  { id: 2, name: 'Wizard' },
];

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Path of the Berserker',
    description: 'A rage-fuelled subclass that channels primal fury.',
    parentClassId: 1,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewSubclassFormPage', () => {
  let component: HomebrewSubclassFormPage;
  let fixture: ComponentFixture<HomebrewSubclassFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createSubclass',
      'getClasses',
    ]);
    homebrewServiceSpy.createSubclass.and.returnValue(of({}));
    homebrewServiceSpy.getClasses.and.returnValue(of(MOCK_CLASSES));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewSubclassFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewSubclassFormPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // ── Component creation ────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Form initialisation ───────────────────────────────────────────────────

  describe('Form initialisation', () => {

    it('should initialise with a FormGroup', () => {
      expect(component.form).toBeTruthy();
    });

    it('should start with submitting = false', () => {
      expect(component.submitting).toBeFalse();
    });

    it('should start with error = null', () => {
      expect(component.error).toBeNull();
    });

    it('should have a name control', () => {
      expect(component.form.get('name')).toBeTruthy();
    });

    it('should have a description control', () => {
      expect(component.form.get('description')).toBeTruthy();
    });

    it('should have a parentClassId control', () => {
      expect(component.form.get('parentClassId')).toBeTruthy();
    });

    it('should be invalid when the form starts (all fields empty/default)', () => {
      expect(component.form.invalid).toBeTrue();
    });
  });

  // ── Form validity — Requirement 4.2 ──────────────────────────────────────

  describe('Form validity', () => {

    // --- name field ---

    it('should be invalid when name is empty', () => {
      component.form.setValue({ name: '', description: 'Some description', parentClassId: 1 });
      expect(component.form.get('name')!.invalid).toBeTrue();
    });

    it('should have a required error on name when empty', () => {
      component.form.patchValue({ name: '' });
      expect(component.form.get('name')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for name when a non-empty string is provided', () => {
      component.form.patchValue({ name: 'Oath of Devotion' });
      expect(component.form.get('name')?.valid).toBeTrue();
    });

    // --- description field ---

    it('should be invalid when description is empty', () => {
      component.form.setValue({ name: 'My Subclass', description: '', parentClassId: 1 });
      expect(component.form.get('description')!.invalid).toBeTrue();
    });

    it('should have a required error on description when empty', () => {
      component.form.patchValue({ description: '' });
      expect(component.form.get('description')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for description when a non-empty string is provided', () => {
      component.form.patchValue({ description: 'A powerful subclass.' });
      expect(component.form.get('description')?.valid).toBeTrue();
    });

    // --- parentClassId field ---

    it('should be invalid when parentClassId is null', () => {
      component.form.setValue({ name: 'My Subclass', description: 'Some description', parentClassId: null });
      expect(component.form.get('parentClassId')!.invalid).toBeTrue();
    });

    it('should have a required error on parentClassId when null', () => {
      component.form.patchValue({ parentClassId: null });
      expect(component.form.get('parentClassId')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for parentClassId when a valid ID is provided', () => {
      component.form.patchValue({ parentClassId: 1 });
      expect(component.form.get('parentClassId')?.valid).toBeTrue();
    });

    // --- overall form validity ---

    it('should be valid when all required fields are filled correctly', () => {
      component.form.setValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });

    it('should be invalid when only name is missing', () => {
      component.form.setValue({ name: '', description: 'A description', parentClassId: 1 });
      expect(component.form.invalid).toBeTrue();
    });

    it('should be invalid when only description is missing', () => {
      component.form.setValue({ name: 'My Subclass', description: '', parentClassId: 1 });
      expect(component.form.invalid).toBeTrue();
    });

    it('should be invalid when only parentClassId is missing', () => {
      component.form.setValue({ name: 'My Subclass', description: 'A description', parentClassId: null });
      expect(component.form.invalid).toBeTrue();
    });
  });

  // ── Class list loading — Requirement 4.3 ─────────────────────────────────

  describe('Class list loading', () => {

    it('should call getClasses() on init', () => {
      expect(homebrewServiceSpy.getClasses).toHaveBeenCalledTimes(1);
    });

    it('should populate availableClasses after successful load', () => {
      expect(component.availableClasses).toEqual(MOCK_CLASSES);
    });

    it('should set loadingClasses to false after successful load', () => {
      expect(component.loadingClasses).toBeFalse();
    });

    it('should set classesError to null after successful load', () => {
      expect(component.classesError).toBeNull();
    });

    it('should set classesError when getClasses() fails with a message', () => {
      homebrewServiceSpy.getClasses.and.returnValue(
        throwError(() => ({ message: 'Network error' })),
      );

      component.loadClasses();

      expect(component.classesError).toBe('Network error');
      expect(component.loadingClasses).toBeFalse();
    });

    it('should use a fallback error message when getClasses() fails without a message', () => {
      homebrewServiceSpy.getClasses.and.returnValue(throwError(() => ({})));

      component.loadClasses();

      expect(component.classesError).toBe('Error al cargar las clases. Por favor, recarga la página.');
    });

    it('should prefer err.error.message over err.message when getClasses() fails', () => {
      homebrewServiceSpy.getClasses.and.returnValue(
        throwError(() => ({ error: { message: 'Server error' }, message: 'Generic error' })),
      );

      component.loadClasses();

      expect(component.classesError).toBe('Server error');
    });

    it('should render the classes-error message in the template when load fails', () => {
      homebrewServiceSpy.getClasses.and.returnValue(
        throwError(() => ({ message: 'Load failed' })),
      );

      component.loadClasses();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="classes-error"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Load failed');
    });
  });

  // ── Error messages in template — Requirement 4.6 ─────────────────────────

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

    it('should show description error message after submit with empty description', () => {
      component.form.patchValue({ name: 'My Subclass', parentClassId: 1 });
      // description remains empty
      component.submit();
      fixture.detectChanges();

      const descError = fixture.nativeElement.querySelector('[data-testid="description-error"]');
      expect(descError).toBeTruthy();
      expect(descError.textContent).toContain('obligatoria');
    });

    it('should show parent class error message after submit with no class selected', () => {
      component.form.patchValue({ name: 'My Subclass', description: 'A description' });
      // parentClassId remains null
      component.submit();
      fixture.detectChanges();

      const parentClassError = fixture.nativeElement.querySelector('[data-testid="parent-class-error"]');
      expect(parentClassError).toBeTruthy();
      expect(parentClassError.textContent).toContain('obligatoria');
    });

    it('should NOT show name error before submit is attempted', () => {
      // Form is invalid but untouched — errors should not be visible yet
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('[data-testid="name-error"]');
      expect(nameError).toBeNull();
    });

    it('should NOT show description error before submit is attempted', () => {
      fixture.detectChanges();

      const descError = fixture.nativeElement.querySelector('[data-testid="description-error"]');
      expect(descError).toBeNull();
    });

    it('should NOT show parent class error before submit is attempted', () => {
      fixture.detectChanges();

      const parentClassError = fixture.nativeElement.querySelector('[data-testid="parent-class-error"]');
      expect(parentClassError).toBeNull();
    });
  });

  // ── Submit guard — HomebrewService NOT called when form is invalid ─────────

  describe('Submit guard — invalid form', () => {

    it('should NOT call HomebrewService.createSubclass() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createSubclass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSubclass() when name is empty', () => {
      component.form.patchValue({ description: 'A description', parentClassId: 1 });
      component.submit();
      expect(homebrewServiceSpy.createSubclass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSubclass() when description is empty', () => {
      component.form.patchValue({ name: 'My Subclass', parentClassId: 1 });
      component.submit();
      expect(homebrewServiceSpy.createSubclass).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createSubclass() when parentClassId is null', () => {
      component.form.patchValue({ name: 'My Subclass', description: 'A description' });
      component.submit();
      expect(homebrewServiceSpy.createSubclass).not.toHaveBeenCalled();
    });
  });

  // ── Successful submit ─────────────────────────────────────────────────────

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createSubclass.and.returnValue(of({}));
      component.form.setValue(validFormValue());
    });

    it('should call HomebrewService.createSubclass() with the form value', () => {
      component.submit();
      expect(homebrewServiceSpy.createSubclass).toHaveBeenCalledWith(component.form.value);
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

  // ── Failed submit — shows error and retains form values ──────────────────

  describe('Failed submit', () => {

    const backendError = { error: { message: 'Internal server error' } };

    beforeEach(() => {
      homebrewServiceSpy.createSubclass.and.returnValue(throwError(() => backendError));
      component.form.setValue(validFormValue());
    });

    it('should set error message when backend returns an error', () => {
      component.submit();
      expect(component.error).toBeTruthy();
    });

    it('should display the backend error message from err.error.message', () => {
      component.submit();
      expect(component.error).toBe('Internal server error');
    });

    it('should display the error message from err.message when err.error.message is absent', () => {
      homebrewServiceSpy.createSubclass.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createSubclass.and.returnValue(throwError(() => ({})));
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

  // ── Cancel button ─────────────────────────────────────────────────────────

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

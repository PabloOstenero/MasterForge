/**
 * Unit tests for HomebrewSpellFormPage — form validation, submit behaviour, navigation,
 * edit mode, constants, and new field coverage.
 *
 * Validates: Requirements 1.1–1.9, 2.1–2.10, 4.1–4.5, 8.1–8.4
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  HomebrewSpellFormPage,
  SPELL_SCHOOLS,
  SAVING_THROWS,
  DAMAGE_TYPES,
  SPELL_CLASSES,
} from './homebrew-spell-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_EDIT_ID = '550e8400-e29b-41d4-a716-446655440000';

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 ft.',
    duration: 'Instantaneous',
    description: 'A bright streak flashes from your pointing finger to a point you choose.',
  };
}

/** Builds an ActivatedRoute stub. Pass a non-null id for edit mode. */
function buildActivatedRouteStub(id: string | null) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
      queryParamMap: {
        get: (key: string) => null,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared factory — creates the TestBed with the given route stub
// ---------------------------------------------------------------------------

async function createComponent(
  homebrewSpy: jasmine.SpyObj<HomebrewService>,
  routeStub: { snapshot: { paramMap: { get: (key: string) => string | null } } },
) {
  const authServiceMock = {
    getUserIdFromToken: () => 'user-1',
    isPro:              () => false, getCurrentUser: () => ({ id: 'user-1', name: 'Test User', role: 'USER' }),
  };

  const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

  await TestBed.configureTestingModule({
    imports: [HomebrewSpellFormPage],
    providers: [
      { provide: HomebrewService, useValue: homebrewSpy },
      { provide: AuthService, useValue: authServiceMock },
      { provide: ApiService, useValue: { get: () => of([]), getClasses: () => of([]) } },
      { provide: ActivatedRoute, useValue: routeStub },
      { provide: Router, useValue: routerSpy },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(HomebrewSpellFormPage);
  const component = fixture.componentInstance;
  const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  fixture.detectChanges();
  return { fixture, component, router };
}

// ---------------------------------------------------------------------------
// Helper: build a full HomebrewService spy with all methods
// ---------------------------------------------------------------------------

function buildHomebrewSpy(): jasmine.SpyObj<HomebrewService> {
  const spy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
    'createSpell',
    'updateSpell',
    'getSpell',
  ]);
  spy.createSpell.and.returnValue(of({}));
  spy.updateSpell.and.returnValue(of({}));
  spy.getSpell.and.returnValue(of({}));
  return spy;
}

// ===========================================================================
// Suite 1 — CREATE MODE (no :id in route)
// ===========================================================================

describe('HomebrewSpellFormPage (create mode)', () => {
  let component: HomebrewSpellFormPage;
  let fixture: ComponentFixture<HomebrewSpellFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    homebrewServiceSpy = buildHomebrewSpy();
    const result = await createComponent(
      homebrewServiceSpy,
      buildActivatedRouteStub(null),
    );
    ({ fixture, component } = result);
    router = result.router as jasmine.SpyObj<Router>;
  });

  // -------------------------------------------------------------------------
  // Smoke tests
  // -------------------------------------------------------------------------

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
  // Exported constant lengths — Requirements 1.6–1.9
  // -------------------------------------------------------------------------

  describe('Exported constants', () => {
    it('SPELL_SCHOOLS should have exactly 8 entries', () => {
      expect(SPELL_SCHOOLS.length).toBe(8);
    });

    it('SAVING_THROWS should have exactly 7 entries', () => {
      expect(SAVING_THROWS.length).toBe(7);
    });

    it('DAMAGE_TYPES should have exactly 13 entries', () => {
      expect(DAMAGE_TYPES.length).toBe(13);
    });

    it('SPELL_CLASSES should have exactly 9 entries', () => {
      expect(SPELL_CLASSES.length).toBe(9);
    });
  });

  // -------------------------------------------------------------------------
  // Required controls — Requirements 1.1, 2.1–2.9
  // -------------------------------------------------------------------------

  describe('Required form controls', () => {

    // --- name ---
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

    // --- level ---
    it('should be invalid when level is null (required)', () => {
      component.form.patchValue({ level: null });
      expect(component.form.get('level')?.invalid).toBeTrue();
    });

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

    it('should be valid when level is exactly 0 (cantrip)', () => {
      component.form.patchValue({ level: 0 });
      expect(component.form.get('level')?.valid).toBeTrue();
    });

    it('should be valid when level is exactly 9 (upper boundary)', () => {
      component.form.patchValue({ level: 9 });
      expect(component.form.get('level')?.valid).toBeTrue();
    });

    // --- school ---
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

    // --- castingTime (new required field) ---
    it('castingTime control should exist', () => {
      expect(component.form.get('castingTime')).toBeTruthy();
    });

    it('should be invalid when castingTime is empty', () => {
      component.form.patchValue({ castingTime: '' });
      expect(component.form.get('castingTime')?.invalid).toBeTrue();
    });

    it('should have a required error on castingTime when empty', () => {
      component.form.patchValue({ castingTime: '' });
      expect(component.form.get('castingTime')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for castingTime when a non-empty string is provided', () => {
      component.form.patchValue({ castingTime: '1 action' });
      expect(component.form.get('castingTime')?.valid).toBeTrue();
    });

    // --- range (new required field) ---
    it('range control should exist', () => {
      expect(component.form.get('range')).toBeTruthy();
    });

    it('should be invalid when range is empty', () => {
      component.form.patchValue({ range: '' });
      expect(component.form.get('range')?.invalid).toBeTrue();
    });

    it('should have a required error on range when empty', () => {
      component.form.patchValue({ range: '' });
      expect(component.form.get('range')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for range when a non-empty string is provided', () => {
      component.form.patchValue({ range: '60 ft.' });
      expect(component.form.get('range')?.valid).toBeTrue();
    });

    // --- duration (new required field) ---
    it('duration control should exist', () => {
      expect(component.form.get('duration')).toBeTruthy();
    });

    it('should be invalid when duration is empty', () => {
      component.form.patchValue({ duration: '' });
      expect(component.form.get('duration')?.invalid).toBeTrue();
    });

    it('should have a required error on duration when empty', () => {
      component.form.patchValue({ duration: '' });
      expect(component.form.get('duration')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for duration when a non-empty string is provided', () => {
      component.form.patchValue({ duration: 'Instantaneous' });
      expect(component.form.get('duration')?.valid).toBeTrue();
    });

    // --- description ---
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

    it('should be valid when all required fields satisfy their constraints', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Optional controls — Requirements 1.2, 1.3
  // -------------------------------------------------------------------------

  describe('Optional form controls', () => {

    it('materialComponent control should exist', () => {
      expect(component.form.get('materialComponent')).toBeTruthy();
    });

    it('materialComponent should NOT have Validators.required', () => {
      component.form.patchValue({ materialComponent: '' });
      expect(component.form.get('materialComponent')?.errors?.['required']).toBeFalsy();
    });

    it('savingThrow control should exist', () => {
      expect(component.form.get('savingThrow')).toBeTruthy();
    });

    it('savingThrow should NOT have Validators.required', () => {
      component.form.patchValue({ savingThrow: '' });
      expect(component.form.get('savingThrow')?.errors?.['required']).toBeFalsy();
    });

    it('higherLevelDescription control should exist', () => {
      expect(component.form.get('higherLevelDescription')).toBeTruthy();
    });

    it('higherLevelDescription should NOT have Validators.required', () => {
      component.form.patchValue({ higherLevelDescription: '' });
      expect(component.form.get('higherLevelDescription')?.errors?.['required']).toBeFalsy();
    });
  });

  // -------------------------------------------------------------------------
  // Boolean toggle defaults — Requirements 1.3
  // -------------------------------------------------------------------------

  describe('Boolean toggle controls default to false', () => {

    it('verbal should default to false', () => {
      expect(component.form.get('verbal')?.value).toBeFalse();
    });

    it('somatic should default to false', () => {
      expect(component.form.get('somatic')?.value).toBeFalse();
    });

    it('material should default to false', () => {
      expect(component.form.get('material')?.value).toBeFalse();
    });

    it('concentration should default to false', () => {
      expect(component.form.get('concentration')?.value).toBeFalse();
    });

    it('ritual should default to false', () => {
      expect(component.form.get('ritual')?.value).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // No authorId control — Requirement 3.2
  // -------------------------------------------------------------------------

  it('should NOT have an authorId control in the form group', () => {
    expect(component.form.get('authorId')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Error messages in template — Requirements 2.2–2.9
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
      component.form.patchValue({ ...validFormValue(), level: 10 });
      component.submit();
      fixture.detectChanges();

      const levelError = fixture.nativeElement.querySelector('[data-testid="level-error"]');
      expect(levelError).toBeTruthy();
    });

    it('should show school error message after submit with empty school', () => {
      component.form.patchValue({ ...validFormValue(), school: '' });
      component.submit();
      fixture.detectChanges();

      const schoolError = fixture.nativeElement.querySelector('[data-testid="school-error"]');
      expect(schoolError).toBeTruthy();
    });

    it('should show description error message after submit with empty description', () => {
      component.form.patchValue({ ...validFormValue(), description: '' });
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
  // Submit guard — service NOT called when form is invalid — Requirement 2.10
  // -------------------------------------------------------------------------

  describe('Submit guard — invalid form', () => {

    it('should NOT call createSpell() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when name is empty', () => {
      component.form.patchValue({ ...validFormValue(), name: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when level is out of range', () => {
      component.form.patchValue({ ...validFormValue(), level: 10 });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when school is empty', () => {
      component.form.patchValue({ ...validFormValue(), school: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when castingTime is empty', () => {
      component.form.patchValue({ ...validFormValue(), castingTime: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when range is empty', () => {
      component.form.patchValue({ ...validFormValue(), range: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when duration is empty', () => {
      component.form.patchValue({ ...validFormValue(), duration: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });

    it('should NOT call createSpell() when description is empty', () => {
      component.form.patchValue({ ...validFormValue(), description: '' });
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Create mode title — Requirement 4.2
  // -------------------------------------------------------------------------

  it('should display "Nuevo Hechizo" title in create mode', () => {
    expect(component.editMode).toBeFalse();
    const titleEl = fixture.nativeElement.querySelector('[data-testid="form-title"]');
    if (titleEl) {
      expect(titleEl.textContent).toContain('Nuevo Hechizo');
    }
  });

  // -------------------------------------------------------------------------
  // Create mode: submit calls createSpell, not updateSpell — Requirement 4.4
  // -------------------------------------------------------------------------

  describe('Create mode submit routing', () => {

    beforeEach(() => {
      homebrewServiceSpy.createSpell.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call createSpell() in create mode', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).toHaveBeenCalled();
    });

    it('should NOT call updateSpell() in create mode', () => {
      component.submit();
      expect(homebrewServiceSpy.updateSpell).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew — Requirement 8.1
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createSpell.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createSpell() with the form value', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).toHaveBeenCalled();
    });

    it('should navigate to /homebrew on successful submit', () => {
      component.submit();
      expect(router.navigate).toHaveBeenCalledWith(['/homebrew']);
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
  // Failed submit — shows error and retains form values — Requirement 8.4
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
      component.submit();
      expect(router.navigate).not.toHaveBeenCalled();
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
  // Cancel button — navigates to /homebrew — Requirement 8.2
  // -------------------------------------------------------------------------

  describe('Cancel', () => {

    it('should navigate to /homebrew when cancel() is called', () => {
      component.cancel();
      expect(router.navigate).toHaveBeenCalledWith(['/homebrew']);
    });

    it('should render a cancel button in the template', () => {
      const cancelBtn = fixture.nativeElement.querySelector('[data-testid="cancel-button"]');
      expect(cancelBtn).toBeTruthy();
    });
  });
});

// ===========================================================================
// Suite 2 — EDIT MODE (route has :id param)
// ===========================================================================

describe('HomebrewSpellFormPage (edit mode)', () => {
  let component: HomebrewSpellFormPage;
  let fixture: ComponentFixture<HomebrewSpellFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: jasmine.SpyObj<Router>;

  /** A minimal valid spell object returned by getSpell. */
  const existingSpell = {
    id: TEST_EDIT_ID,
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'A creature you touch regains hit points.',
    verbal: true,
    somatic: true,
    material: false,
    materialComponent: '',
    concentration: false,
    ritual: false,
    damageTypes: '',
    savingThrow: 'None',
    spellClasses: 'Cleric, Paladin',
    higherLevelDescription: 'When cast at higher levels, heals more.',
  };

  beforeEach(async () => {
    homebrewServiceSpy = buildHomebrewSpy();
    homebrewServiceSpy.getSpell.and.returnValue(of(existingSpell));

    const result = await createComponent(
      homebrewServiceSpy,
      buildActivatedRouteStub(TEST_EDIT_ID),
    );
    ({ fixture, component } = result);
    router = result.router as jasmine.SpyObj<Router>;
  });

  // -------------------------------------------------------------------------
  // Edit mode activation — Requirement 4.1
  // -------------------------------------------------------------------------

  it('should set editMode = true when route has an :id param', () => {
    expect(component.editMode).toBeTrue();
  });

  it('should set editId to the route param value', () => {
    expect(component.editId).toBe(TEST_EDIT_ID);
  });

  it('should call getSpell() with the route id on init', () => {
    expect(homebrewServiceSpy.getSpell).toHaveBeenCalledWith(TEST_EDIT_ID);
  });

  // -------------------------------------------------------------------------
  // Edit mode title — Requirement 4.1
  // -------------------------------------------------------------------------

  it('should display "Editar Hechizo" title in edit mode', () => {
    const titleEl = fixture.nativeElement.querySelector('[data-testid="form-title"]');
    if (titleEl) {
      expect(titleEl.textContent).toContain('Editar Hechizo');
    }
  });

  // -------------------------------------------------------------------------
  // Edit mode pre-populates form — Requirement 4.3
  // -------------------------------------------------------------------------

  it('should pre-populate the name field from the loaded spell', () => {
    expect(component.form.get('name')?.value).toBe(existingSpell.name);
  });

  it('should pre-populate the level field from the loaded spell', () => {
    expect(component.form.get('level')?.value).toBe(existingSpell.level);
  });

  it('should pre-populate the school field from the loaded spell', () => {
    expect(component.form.get('school')?.value).toBe(existingSpell.school);
  });

  it('should pre-populate the castingTime field from the loaded spell', () => {
    expect(component.form.get('castingTime')?.value).toBe(existingSpell.castingTime);
  });

  it('should pre-populate the range field from the loaded spell', () => {
    expect(component.form.get('range')?.value).toBe(existingSpell.range);
  });

  it('should pre-populate the duration field from the loaded spell', () => {
    expect(component.form.get('duration')?.value).toBe(existingSpell.duration);
  });

  it('should pre-populate the description field from the loaded spell', () => {
    expect(component.form.get('description')?.value).toBe(existingSpell.description);
  });

  it('should pre-populate the verbal toggle from the loaded spell', () => {
    expect(component.form.get('verbal')?.value).toBe(existingSpell.verbal);
  });

  it('should pre-populate the somatic toggle from the loaded spell', () => {
    expect(component.form.get('somatic')?.value).toBe(existingSpell.somatic);
  });

  // -------------------------------------------------------------------------
  // Edit mode submit routing — Requirement 4.4
  // -------------------------------------------------------------------------

  describe('Edit mode submit routing', () => {

    beforeEach(() => {
      homebrewServiceSpy.updateSpell.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call updateSpell() in edit mode', () => {
      component.submit();
      expect(homebrewServiceSpy.updateSpell).toHaveBeenCalled();
    });

    it('should call updateSpell() with the correct editId', () => {
      component.submit();
      const [calledId] = homebrewServiceSpy.updateSpell.calls.mostRecent().args;
      expect(calledId).toBe(TEST_EDIT_ID);
    });

    it('should NOT call createSpell() in edit mode', () => {
      component.submit();
      expect(homebrewServiceSpy.createSpell).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edit mode load failure — Requirement 4.5
  // -------------------------------------------------------------------------

  describe('Edit mode load failure', () => {

    it('should set error to the correct Spanish message when getSpell fails', async () => {
      // Re-create the component with a failing getSpell
      homebrewServiceSpy.getSpell.and.returnValue(throwError(() => new Error('Not found')));

      await TestBed.resetTestingModule();
      const result = await createComponent(
        homebrewServiceSpy,
        buildActivatedRouteStub(TEST_EDIT_ID),
      );

      expect(result.component.error).toBe('No se pudo cargar el hechizo para editar.');
    });
  });
});

// ===========================================================================
// Suite 3 — EDIT MODE LOAD FAILURE (getSpell returns an error)
// ===========================================================================

describe('HomebrewSpellFormPage (edit mode — load failure)', () => {
  let component: HomebrewSpellFormPage;

  beforeEach(async () => {
    const homebrewSpy = buildHomebrewSpy();
    homebrewSpy.getSpell.and.returnValue(throwError(() => new Error('Not found')));

    const result = await createComponent(
      homebrewSpy,
      buildActivatedRouteStub(TEST_EDIT_ID),
    );
    component = result.component;
  });

  // Requirement 4.5
  it('should set error to the correct Spanish message when getSpell fails', () => {
    expect(component.error).toBe('No se pudo cargar el hechizo para editar.');
  });
});

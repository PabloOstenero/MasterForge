/**
 * Unit tests for HomebrewSubclassFormPage — form validation, class list loading, and navigation.
 *
 * Validates: Requirements 4.2, 4.3, 4.6
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  HomebrewSubclassFormPage,
  buildSubclassFeatures,
  SkillProficiencies,
  SubclassFeatureEntry,
  ExpandedSpellEntry,
  ResourcePool,
  Spellcasting
} from './homebrew-subclass-form.page';
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
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', ['createSubclass', 'getClasses', 'getAllSpells']);
    homebrewServiceSpy.createSubclass.and.returnValue(of({}));
    homebrewServiceSpy.getClasses.and.returnValue(of([{ id: 1, name: 'Barbarian' }]));
    homebrewServiceSpy.getAllSpells.and.returnValue(of([{ id: 'spell-1', name: 'Mage Hand' }]));
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
      component.form.patchValue({ name: '', description: 'Some description', parentClassId: 1 });
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

    it('should be valid when description is empty', () => {
      component.form.patchValue({ name: 'My Subclass', description: '', parentClassId: 1 });
      expect(component.form.get('description')!.valid).toBeTrue();
    });

    it('should NOT have a required error on description when empty', () => {
      component.form.patchValue({ description: '' });
      expect(component.form.get('description')?.errors).toBeNull();
    });

    it('should be valid for description when a non-empty string is provided', () => {
      component.form.patchValue({ description: 'A powerful subclass.' });
      expect(component.form.get('description')?.valid).toBeTrue();
    });

    // --- parentClassId field ---

    it('should be invalid when parentClassId is null', () => {
      component.form.patchValue({ name: 'My Subclass', description: 'Some description', parentClassId: null });
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
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });

    it('should be invalid when only name is missing', () => {
      component.form.patchValue({ name: '', description: 'A description', parentClassId: 1 });
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when only description is missing', () => {
      component.form.patchValue({ name: 'My Subclass', description: '', parentClassId: 1 });
      expect(component.form.valid).toBeTrue();
    });

    it('should be invalid when only parentClassId is missing', () => {
      component.form.patchValue({ name: 'My Subclass', description: 'A description', parentClassId: null });
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

    it('should NOT show description error message after submit with empty description', () => {
      component.form.patchValue({ name: 'My Subclass', parentClassId: 1, description: '' });
      component.submit();
      fixture.detectChanges();

      const descError = fixture.nativeElement.querySelector('[data-testid="description-error"]');
      expect(descError).toBeNull();
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

    it('should call HomebrewService.createSubclass() when description is empty', () => {
      component.form.patchValue({ name: 'My Subclass', description: '', parentClassId: 1 });
      component.submit();
      expect(homebrewServiceSpy.createSubclass).toHaveBeenCalled();
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
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createSubclass() with the correct DTO', () => {
      component.submit();
      expect(homebrewServiceSpy.createSubclass).toHaveBeenCalledWith(jasmine.objectContaining({
        name: 'Path of the Berserker',
        description: 'A rage-fuelled subclass that channels primal fury.',
        parentClassId: 1
      }));
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

// ---------------------------------------------------------------------------
// Pure Function Tests (13.1)
// ---------------------------------------------------------------------------
describe('buildSubclassFeatures() pure function', () => {
  const emptySkillProfs: SkillProficiencies = { fixed: [], choicePool: [], choiceCount: 0 };

  it('should produce empty arrays and no spellcasting key for empty inputs', () => {
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], [], [], [], null
    );
    expect(result.weaponProficiencies).toEqual([]);
    expect(result.armorProficiencies).toEqual([]);
    expect(result.toolProficiencies).toEqual([]);
    expect(result.damageResistances).toEqual([]);
    expect(result.damageImmunities).toEqual([]);
    expect(result.conditionImmunities).toEqual([]);
    expect(result.subclassFeatureEntries).toEqual([]);
    expect(result.expandedSpellList).toEqual([]);
    expect(result.resourcePools).toEqual([]);
    expect(result.spellcasting).toBeUndefined();
  });

  it('should correctly union weapon chips and custom profs', () => {
    const result = buildSubclassFeatures(
      ['Simple Weapons', 'Martial Weapons', 'Firearms'],
      [], [], emptySkillProfs, [], [], [], [], [], [], null
    );
    expect(result.weaponProficiencies).toEqual(['Simple Weapons', 'Martial Weapons', 'Firearms']);
  });

  it('should correctly union armor chips and custom profs', () => {
    const result = buildSubclassFeatures(
      [], ['Light Armor', 'Custom Armor'], [], emptySkillProfs, [], [], [], [], [], [], null
    );
    expect(result.armorProficiencies).toEqual(['Light Armor', 'Custom Armor']);
  });

  it('should produce the correct string array for active damage resistance chips', () => {
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, ['Fire', 'Cold'], [], [], [], [], [], null
    );
    expect(result.damageResistances).toEqual(['Fire', 'Cold']);
  });

  it('should produce the correct string array for active condition immunity chips', () => {
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], ['Charmed', 'Prone'], [], [], [], null
    );
    expect(result.conditionImmunities).toEqual(['Charmed', 'Prone']);
  });

  it('should serialize feature entries correctly', () => {
    const features: SubclassFeatureEntry[] = [{ name: 'Action Surge', description: 'Take one additional action', levelRequired: 2 }];
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], features, [], [], null
    );
    expect(result.subclassFeatureEntries).toEqual(features);
  });

  it('should serialize expanded spell list entries correctly, including level 0', () => {
    const spells: ExpandedSpellEntry[] = [
      { name: 'Mage Hand', level: 0, preparationType: 'ALWAYS_KNOWN' },
      { name: 'Fireball', level: 3, preparationType: 'ALWAYS_PREPARED' }
    ];
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], [], spells, [], null
    );
    expect(result.expandedSpellList).toEqual(spells);
  });

  it('should serialize resource pool entries correctly', () => {
    const pools: ResourcePool[] = [
      { name: 'Ki Points', dieType: 'd4', count: 2, rechargeOn: 'Short Rest' }
    ];
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], [], [], pools, null
    );
    expect(result.resourcePools).toEqual(pools);
  });

  it('should include spellcasting key when spellcasting is enabled', () => {
    const spellcasting: Spellcasting = {
      ability: 'Intelligence',
      spellcastingType: 'Third Caster',
      ritualCasting: false,
      preparationStyle: 'KNOWN',
      cantripsKnown: Array(20).fill(2),
      spellsKnown: Array(20).fill(3),
      spellSlots: { slots: [] }
    };
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], [], [], [], spellcasting
    );
    expect(result.spellcasting).toBeDefined();
    expect(result.spellcasting?.ability).toBe('Intelligence');
    expect(result.spellcasting?.spellsKnown).toBeDefined();
  });

  it('should omit spellsKnown when preparationStyle is PREPARED', () => {
    const spellcasting: Spellcasting = {
      ability: 'Wisdom',
      spellcastingType: 'Half Caster',
      ritualCasting: false,
      preparationStyle: 'PREPARED',
      cantripsKnown: Array(20).fill(2),
      spellSlots: { slots: [] }
    };
    const result = buildSubclassFeatures(
      [], [], [], emptySkillProfs, [], [], [], [], [], [], spellcasting
    );
    expect(result.spellcasting).toBeDefined();
    expect(result.spellcasting?.spellsKnown).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// HomebrewService Subclass Methods (13.2)
// ---------------------------------------------------------------------------
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('HomebrewService Subclass Methods', () => {
  let service: HomebrewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        HomebrewService,
        { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-123' } }
      ]
    });
    service = TestBed.inject(HomebrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send GET to /api/dnd-subclasses/{id} for getSubclass(id)', () => {
    service.getSubclass('subclass-1').subscribe();
    const req = httpMock.expectOne('/api/dnd-subclasses/subclass-1');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should send POST to /api/dnd-subclasses with authorId injected for createSubclass', () => {
    const dto: any = { name: 'New Subclass' };
    service.createSubclass(dto).subscribe();
    const req = httpMock.expectOne('/api/dnd-subclasses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'New Subclass', authorId: 'test-user-123' });
    req.flush({});
  });

  it('should send PUT to /api/dnd-subclasses/{id} with authorId injected for updateSubclass', () => {
    const dto: any = { name: 'Updated Subclass' };
    service.updateSubclass('subclass-1', dto).subscribe();
    const req = httpMock.expectOne('/api/dnd-subclasses/subclass-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Updated Subclass', authorId: 'test-user-123' });
    req.flush({});
  });
});

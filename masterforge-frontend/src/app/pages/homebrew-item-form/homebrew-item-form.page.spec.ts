/**
 * Unit tests for HomebrewItemFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 2.1, 2.3, 2.8, 10.2, 10.5, 14.1
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewItemFormPage } from './homebrew-item-form.page';
import { HomebrewService } from '../../services/homebrew.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid form value that satisfies all required validators. */
function validFormValue() {
  return {
    name: 'Sword of Flames',
    type: 'Weapon',
    weight: 1.5,
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
      'updateItem',
      'getItem',
    ]);
    homebrewServiceSpy.createItem.and.returnValue(of({}));
    homebrewServiceSpy.updateItem.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [HomebrewItemFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
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

  it('should NOT inject AuthService directly (Requirement 14.3)', () => {
    // The component should not have an authService property
    expect((component as any).authService).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Form validity — Requirements 2.1, 2.3, 2.8
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

    // --- overall form validity ---

    it('should be invalid when the overall form starts (all fields empty/default)', () => {
      expect(component.form.invalid).toBeTrue();
    });

    it('should be valid when all required fields satisfy their constraints', () => {
      component.form.patchValue(validFormValue());
      expect(component.form.valid).toBeTrue();
    });

    it('should be valid with correct values for different item types', () => {
      component.form.patchValue({ name: 'Potion of Healing', type: 'Potion', weight: 0.5 });
      expect(component.form.valid).toBeTrue();
    });
  });

  // -------------------------------------------------------------------------
  // Type-helper getters — Requirements 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1
  // -------------------------------------------------------------------------

  describe('Type-helper getters', () => {

    it('isWeapon should be true when type is Weapon', () => {
      component.form.patchValue({ type: 'Weapon' });
      expect(component.isWeapon).toBeTrue();
    });

    it('isWeapon should be false when type is Armor', () => {
      component.form.patchValue({ type: 'Armor' });
      expect(component.isWeapon).toBeFalse();
    });

    it('isArmor should be true when type is Armor', () => {
      component.form.patchValue({ type: 'Armor' });
      expect(component.isArmor).toBeTrue();
    });

    it('isShield should be true when type is Shield', () => {
      component.form.patchValue({ type: 'Shield' });
      expect(component.isShield).toBeTrue();
    });

    it('isPotion should be true when type is Potion', () => {
      component.form.patchValue({ type: 'Potion' });
      expect(component.isPotion).toBeTrue();
    });

    it('isMagicalItem should be true for Wondrous Item', () => {
      component.form.patchValue({ type: 'Wondrous Item' });
      expect(component.isMagicalItem).toBeTrue();
    });

    it('isMagicalItem should be true for Ring', () => {
      component.form.patchValue({ type: 'Ring' });
      expect(component.isMagicalItem).toBeTrue();
    });

    it('isMagicalItem should be true for Rod', () => {
      component.form.patchValue({ type: 'Rod' });
      expect(component.isMagicalItem).toBeTrue();
    });

    it('isMagicalItem should be true for Staff', () => {
      component.form.patchValue({ type: 'Staff' });
      expect(component.isMagicalItem).toBeTrue();
    });

    it('isMagicalItem should be true for Wand', () => {
      component.form.patchValue({ type: 'Wand' });
      expect(component.isMagicalItem).toBeTrue();
    });

    it('isMagicalItem should be false for Weapon', () => {
      component.form.patchValue({ type: 'Weapon' });
      expect(component.isMagicalItem).toBeFalse();
    });

    it('isAmmunition should be true when type is Ammunition', () => {
      component.form.patchValue({ type: 'Ammunition' });
      expect(component.isAmmunition).toBeTrue();
    });

    it('isGeneralGear should be true for Adventuring Gear', () => {
      component.form.patchValue({ type: 'Adventuring Gear' });
      expect(component.isGeneralGear).toBeTrue();
    });

    it('isGeneralGear should be true for Tool', () => {
      component.form.patchValue({ type: 'Tool' });
      expect(component.isGeneralGear).toBeTrue();
    });

    it('isGeneralGear should be true for Mount', () => {
      component.form.patchValue({ type: 'Mount' });
      expect(component.isGeneralGear).toBeTrue();
    });

    it('isGeneralGear should be true for Vehicle', () => {
      component.form.patchValue({ type: 'Vehicle' });
      expect(component.isGeneralGear).toBeTrue();
    });

    it('isGeneralGear should be true for Treasure', () => {
      component.form.patchValue({ type: 'Treasure' });
      expect(component.isGeneralGear).toBeTrue();
    });

    it('isGeneralGear should be false for Weapon', () => {
      component.form.patchValue({ type: 'Weapon' });
      expect(component.isGeneralGear).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // Chip helpers — Requirements 3.4, 3.5
  // -------------------------------------------------------------------------

  describe('Chip helpers', () => {

    it('selectDamageType should select the chip at the given index', () => {
      component.selectDamageType(2);
      expect(component.weaponDamageTypeIndex).toBe(2);
    });

    it('selectDamageType should deselect all other chips (single-select)', () => {
      component.selectDamageType(0);
      component.selectDamageType(3);
      expect(component.weaponDamageTypeIndex).toBe(3);
    });

    it('selectDamageType on already-selected chip should deselect it', () => {
      component.selectDamageType(1);
      component.selectDamageType(1); // toggle off
      expect(component.weaponDamageTypeIndex).toBe(-1);
    });

    it('toggleWeaponProperty should toggle the chip at the given index', () => {
      const arr = component.weaponPropertiesArray;
      expect(arr.at(0).value).toBeFalse();
      component.toggleWeaponProperty(0);
      expect(arr.at(0).value).toBeTrue();
    });

    it('toggleWeaponProperty should not affect other chips', () => {
      component.toggleWeaponProperty(0);
      expect(component.weaponPropertiesArray.at(1).value).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // FormArray helpers — Requirements 10.3, 10.4
  // -------------------------------------------------------------------------

  describe('FormArray helpers', () => {

    it('addAbility should append a new entry to the abilities FormArray', () => {
      expect(component.abilities.length).toBe(0);
      component.addAbility();
      expect(component.abilities.length).toBe(1);
    });

    it('addAbility entry should have required name and description controls', () => {
      component.addAbility();
      const entry = component.abilities.at(0);
      expect(entry.get('name')).toBeTruthy();
      expect(entry.get('description')).toBeTruthy();
    });

    it('addAbility entry name should be required', () => {
      component.addAbility();
      const nameCtrl = component.abilities.at(0).get('name');
      expect(nameCtrl?.errors?.['required']).toBeTrue();
    });

    it('removeAbility should remove the entry at the given index', () => {
      component.addAbility();
      component.addAbility();
      component.abilities.at(0).get('name')?.setValue('First');
      component.abilities.at(1).get('name')?.setValue('Second');

      component.removeAbility(0);

      expect(component.abilities.length).toBe(1);
      expect(component.abilities.at(0).get('name')?.value).toBe('Second');
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
      component.submit();
      fixture.detectChanges();

      const nameError = fixture.nativeElement.querySelector('.error-message');
      expect(nameError).toBeTruthy();
    });

    it('should show weight error message after submit with negative weight', () => {
      component.form.patchValue({ name: 'Sword', type: 'Weapon', weight: -1 });
      component.submit();
      fixture.detectChanges();

      const errors = fixture.nativeElement.querySelectorAll('.error-message');
      expect(errors.length).toBeGreaterThan(0);
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

    it('should pass a properties object (not null) to createItem', () => {
      component.submit();
      const callArg = homebrewServiceSpy.createItem.calls.mostRecent().args[0];
      expect(callArg['properties']).toBeDefined();
      expect(typeof callArg['properties']).toBe('object');
    });

    it('should pass authorId as empty string placeholder to createItem (Requirement 14.1)', () => {
      component.submit();
      const callArg = homebrewServiceSpy.createItem.calls.mostRecent().args[0];
      expect(callArg['authorId']).toBe('');
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

      const errorEl = fixture.nativeElement.querySelector('.form-error-banner');
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
  // Edit mode — Requirement 12
  // -------------------------------------------------------------------------

  describe('Edit mode', () => {

    it('should be in create mode by default (editMode = false)', () => {
      expect(component.editMode).toBeFalse();
    });

    it('should have editId = null in create mode', () => {
      expect(component.editId).toBeNull();
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
      const cancelBtn = fixture.nativeElement.querySelector('.back-btn');
      expect(cancelBtn).toBeTruthy();
    });
  });
});

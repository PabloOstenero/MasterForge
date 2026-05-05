/**
 * Unit tests for HomebrewMonsterFormPage — form validation, submit behaviour, and navigation.
 *
 * Validates: Requirements 6.2, 6.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { HomebrewMonsterFormPage } from './homebrew-monster-form.page';
import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a valid form value that satisfies all validators. */
function validFormValue() {
  return {
    name: 'Goblin',
    type: 'Humanoid',
    size: 'Small',
    armorClass: 15,
    hitPoints: 7,
    speed: '30 ft.',
    str: 8,
    dex: 14,
    con: 10,
    intStat: 10,
    wis: 8,
    cha: 8,
    challengeRating: 0.25,
    xp: 50,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewMonsterFormPage', () => {
  let component: HomebrewMonsterFormPage;
  let fixture: ComponentFixture<HomebrewMonsterFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let router: Router;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createMonster',
    ]);
    homebrewServiceSpy.createMonster.and.returnValue(of({}));

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewMonsterFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewMonsterFormPage);
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
  // Form validity — Requirement 6.2
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
      component.form.patchValue({ name: 'Dragon' });
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
      component.form.patchValue({ type: 'Beast' });
      expect(component.form.get('type')?.valid).toBeTrue();
    });

    // --- size field ---

    it('should be invalid when size is empty', () => {
      component.form.patchValue({ size: '' });
      expect(component.form.get('size')?.invalid).toBeTrue();
    });

    it('should be invalid when size is null (required)', () => {
      component.form.patchValue({ size: null });
      expect(component.form.get('size')?.invalid).toBeTrue();
    });

    it('should be valid when size is Small', () => {
      component.form.patchValue({ size: 'Small' });
      expect(component.form.get('size')?.valid).toBeTrue();
    });

    it('should be valid when size is Medium', () => {
      component.form.patchValue({ size: 'Medium' });
      expect(component.form.get('size')?.valid).toBeTrue();
    });

    it('should be valid when size is Large', () => {
      component.form.patchValue({ size: 'Large' });
      expect(component.form.get('size')?.valid).toBeTrue();
    });

    it('should be valid when size is Huge', () => {
      component.form.patchValue({ size: 'Huge' });
      expect(component.form.get('size')?.valid).toBeTrue();
    });

    it('should be valid when size is Gargantuan', () => {
      component.form.patchValue({ size: 'Gargantuan' });
      expect(component.form.get('size')?.valid).toBeTrue();
    });

    // --- armorClass field ---

    it('should be invalid when armorClass is null (required)', () => {
      component.form.patchValue({ armorClass: null });
      expect(component.form.get('armorClass')?.invalid).toBeTrue();
    });

    it('should be invalid when armorClass is below 1 (min error)', () => {
      component.form.patchValue({ armorClass: 0 });
      expect(component.form.get('armorClass')?.invalid).toBeTrue();
    });

    it('should have a min error when armorClass is 0', () => {
      component.form.patchValue({ armorClass: 0 });
      expect(component.form.get('armorClass')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when armorClass is above 30 (max error)', () => {
      component.form.patchValue({ armorClass: 31 });
      expect(component.form.get('armorClass')?.invalid).toBeTrue();
    });

    it('should have a max error when armorClass is 31', () => {
      component.form.patchValue({ armorClass: 31 });
      expect(component.form.get('armorClass')?.errors?.['max']).toBeTruthy();
    });

    it('should be valid when armorClass is exactly 1 (lower boundary)', () => {
      component.form.patchValue({ armorClass: 1 });
      expect(component.form.get('armorClass')?.valid).toBeTrue();
    });

    it('should be valid when armorClass is exactly 30 (upper boundary)', () => {
      component.form.patchValue({ armorClass: 30 });
      expect(component.form.get('armorClass')?.valid).toBeTrue();
    });

    it('should be valid when armorClass is 15 (mid-range)', () => {
      component.form.patchValue({ armorClass: 15 });
      expect(component.form.get('armorClass')?.valid).toBeTrue();
    });

    // --- hitPoints field ---

    it('should be invalid when hitPoints is null (required)', () => {
      component.form.patchValue({ hitPoints: null });
      expect(component.form.get('hitPoints')?.invalid).toBeTrue();
    });

    it('should be invalid when hitPoints is below 1 (min error)', () => {
      component.form.patchValue({ hitPoints: 0 });
      expect(component.form.get('hitPoints')?.invalid).toBeTrue();
    });

    it('should have a min error when hitPoints is 0', () => {
      component.form.patchValue({ hitPoints: 0 });
      expect(component.form.get('hitPoints')?.errors?.['min']).toBeTruthy();
    });

    it('should be valid when hitPoints is exactly 1', () => {
      component.form.patchValue({ hitPoints: 1 });
      expect(component.form.get('hitPoints')?.valid).toBeTrue();
    });

    it('should be valid when hitPoints is a large positive value', () => {
      component.form.patchValue({ hitPoints: 500 });
      expect(component.form.get('hitPoints')?.valid).toBeTrue();
    });

    // --- speed field ---

    it('should be invalid when speed is empty', () => {
      component.form.patchValue({ speed: '' });
      expect(component.form.get('speed')?.invalid).toBeTrue();
    });

    it('should have a required error on speed when empty', () => {
      component.form.patchValue({ speed: '' });
      expect(component.form.get('speed')?.errors?.['required']).toBeTrue();
    });

    it('should be valid for speed when a non-empty string is provided', () => {
      component.form.patchValue({ speed: '30 ft.' });
      expect(component.form.get('speed')?.valid).toBeTrue();
    });

    // --- str field ---

    it('should be invalid when str is null (required)', () => {
      component.form.patchValue({ str: null });
      expect(component.form.get('str')?.invalid).toBeTrue();
    });

    it('should be invalid when str is below 1 (min error)', () => {
      component.form.patchValue({ str: 0 });
      expect(component.form.get('str')?.invalid).toBeTrue();
    });

    it('should have a min error when str is 0', () => {
      component.form.patchValue({ str: 0 });
      expect(component.form.get('str')?.errors?.['min']).toBeTruthy();
    });

    it('should be invalid when str is above 30 (max error)', () => {
      component.form.patchValue({ str: 31 });
      expect(component.form.get('str')?.invalid).toBeTrue();
    });

    it('should have a max error when str is 31', () => {
      component.form.patchValue({ str: 31 });
      expect(component.form.get('str')?.errors?.['max']).toBeTruthy();
    });

    it('should be valid when str is exactly 1 (lower boundary)', () => {
      component.form.patchValue({ str: 1 });
      expect(component.form.get('str')?.valid).toBeTrue();
    });

    it('should be valid when str is exactly 30 (upper boundary)', () => {
      component.form.patchValue({ str: 30 });
      expect(component.form.get('str')?.valid).toBeTrue();
    });

    // --- dex field ---

    it('should be invalid when dex is null (required)', () => {
      component.form.patchValue({ dex: null });
      expect(component.form.get('dex')?.invalid).toBeTrue();
    });

    it('should be invalid when dex is below 1', () => {
      component.form.patchValue({ dex: 0 });
      expect(component.form.get('dex')?.invalid).toBeTrue();
    });

    it('should be invalid when dex is above 30', () => {
      component.form.patchValue({ dex: 31 });
      expect(component.form.get('dex')?.invalid).toBeTrue();
    });

    it('should be valid when dex is within range [1, 30]', () => {
      component.form.patchValue({ dex: 14 });
      expect(component.form.get('dex')?.valid).toBeTrue();
    });

    // --- con field ---

    it('should be invalid when con is null (required)', () => {
      component.form.patchValue({ con: null });
      expect(component.form.get('con')?.invalid).toBeTrue();
    });

    it('should be invalid when con is below 1', () => {
      component.form.patchValue({ con: 0 });
      expect(component.form.get('con')?.invalid).toBeTrue();
    });

    it('should be invalid when con is above 30', () => {
      component.form.patchValue({ con: 31 });
      expect(component.form.get('con')?.invalid).toBeTrue();
    });

    it('should be valid when con is within range [1, 30]', () => {
      component.form.patchValue({ con: 10 });
      expect(component.form.get('con')?.valid).toBeTrue();
    });

    // --- intStat field ---

    it('should be invalid when intStat is null (required)', () => {
      component.form.patchValue({ intStat: null });
      expect(component.form.get('intStat')?.invalid).toBeTrue();
    });

    it('should be invalid when intStat is below 1', () => {
      component.form.patchValue({ intStat: 0 });
      expect(component.form.get('intStat')?.invalid).toBeTrue();
    });

    it('should be invalid when intStat is above 30', () => {
      component.form.patchValue({ intStat: 31 });
      expect(component.form.get('intStat')?.invalid).toBeTrue();
    });

    it('should be valid when intStat is within range [1, 30]', () => {
      component.form.patchValue({ intStat: 10 });
      expect(component.form.get('intStat')?.valid).toBeTrue();
    });

    // --- wis field ---

    it('should be invalid when wis is null (required)', () => {
      component.form.patchValue({ wis: null });
      expect(component.form.get('wis')?.invalid).toBeTrue();
    });

    it('should be invalid when wis is below 1', () => {
      component.form.patchValue({ wis: 0 });
      expect(component.form.get('wis')?.invalid).toBeTrue();
    });

    it('should be invalid when wis is above 30', () => {
      component.form.patchValue({ wis: 31 });
      expect(component.form.get('wis')?.invalid).toBeTrue();
    });

    it('should be valid when wis is within range [1, 30]', () => {
      component.form.patchValue({ wis: 8 });
      expect(component.form.get('wis')?.valid).toBeTrue();
    });

    // --- cha field ---

    it('should be invalid when cha is null (required)', () => {
      component.form.patchValue({ cha: null });
      expect(component.form.get('cha')?.invalid).toBeTrue();
    });

    it('should be invalid when cha is below 1', () => {
      component.form.patchValue({ cha: 0 });
      expect(component.form.get('cha')?.invalid).toBeTrue();
    });

    it('should be invalid when cha is above 30', () => {
      component.form.patchValue({ cha: 31 });
      expect(component.form.get('cha')?.invalid).toBeTrue();
    });

    it('should be valid when cha is within range [1, 30]', () => {
      component.form.patchValue({ cha: 8 });
      expect(component.form.get('cha')?.valid).toBeTrue();
    });

    // --- challengeRating field ---

    it('should be invalid when challengeRating is null (required)', () => {
      component.form.patchValue({ challengeRating: null });
      expect(component.form.get('challengeRating')?.invalid).toBeTrue();
    });

    it('should be invalid when challengeRating is below 0 (min error)', () => {
      component.form.patchValue({ challengeRating: -1 });
      expect(component.form.get('challengeRating')?.invalid).toBeTrue();
    });

    it('should have a min error when challengeRating is negative', () => {
      component.form.patchValue({ challengeRating: -0.01 });
      expect(component.form.get('challengeRating')?.errors?.['min']).toBeTruthy();
    });

    it('should be valid when challengeRating is exactly 0', () => {
      component.form.patchValue({ challengeRating: 0 });
      expect(component.form.get('challengeRating')?.valid).toBeTrue();
    });

    it('should be valid when challengeRating is a positive value', () => {
      component.form.patchValue({ challengeRating: 0.25 });
      expect(component.form.get('challengeRating')?.valid).toBeTrue();
    });

    it('should be valid when challengeRating is a large positive value', () => {
      component.form.patchValue({ challengeRating: 30 });
      expect(component.form.get('challengeRating')?.valid).toBeTrue();
    });

    // --- xp field ---

    it('should be invalid when xp is null (required)', () => {
      component.form.patchValue({ xp: null });
      expect(component.form.get('xp')?.invalid).toBeTrue();
    });

    it('should be invalid when xp is below 0 (min error)', () => {
      component.form.patchValue({ xp: -1 });
      expect(component.form.get('xp')?.invalid).toBeTrue();
    });

    it('should have a min error when xp is negative', () => {
      component.form.patchValue({ xp: -1 });
      expect(component.form.get('xp')?.errors?.['min']).toBeTruthy();
    });

    it('should be valid when xp is exactly 0', () => {
      component.form.patchValue({ xp: 0 });
      expect(component.form.get('xp')?.valid).toBeTrue();
    });

    it('should be valid when xp is a positive value', () => {
      component.form.patchValue({ xp: 50 });
      expect(component.form.get('xp')?.valid).toBeTrue();
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
  // Error messages in template — Requirement 6.5
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
      component.form.patchValue({ ...validFormValue(), type: '' });
      component.submit();
      fixture.detectChanges();

      const typeError = fixture.nativeElement.querySelector('[data-testid="type-error"]');
      expect(typeError).toBeTruthy();
    });

    it('should show size error message after submit with empty size', () => {
      component.form.patchValue({ ...validFormValue(), size: '' });
      component.submit();
      fixture.detectChanges();

      const sizeError = fixture.nativeElement.querySelector('[data-testid="size-error"]');
      expect(sizeError).toBeTruthy();
    });

    it('should show armorClass error message after submit with null armorClass', () => {
      component.form.patchValue({ ...validFormValue(), armorClass: null });
      component.submit();
      fixture.detectChanges();

      const armorClassError = fixture.nativeElement.querySelector('[data-testid="armor-class-error"]');
      expect(armorClassError).toBeTruthy();
    });

    it('should show armorClass error message after submit with out-of-range armorClass', () => {
      component.form.patchValue({ ...validFormValue(), armorClass: 31 });
      component.submit();
      fixture.detectChanges();

      const armorClassError = fixture.nativeElement.querySelector('[data-testid="armor-class-error"]');
      expect(armorClassError).toBeTruthy();
    });

    it('should show hitPoints error message after submit with null hitPoints', () => {
      component.form.patchValue({ ...validFormValue(), hitPoints: null });
      component.submit();
      fixture.detectChanges();

      const hitPointsError = fixture.nativeElement.querySelector('[data-testid="hit-points-error"]');
      expect(hitPointsError).toBeTruthy();
    });

    it('should show hitPoints error message after submit with hitPoints below 1', () => {
      component.form.patchValue({ ...validFormValue(), hitPoints: 0 });
      component.submit();
      fixture.detectChanges();

      const hitPointsError = fixture.nativeElement.querySelector('[data-testid="hit-points-error"]');
      expect(hitPointsError).toBeTruthy();
    });

    it('should show speed error message after submit with empty speed', () => {
      component.form.patchValue({ ...validFormValue(), speed: '' });
      component.submit();
      fixture.detectChanges();

      const speedError = fixture.nativeElement.querySelector('[data-testid="speed-error"]');
      expect(speedError).toBeTruthy();
    });

    it('should show str error message after submit with out-of-range str', () => {
      component.form.patchValue({ ...validFormValue(), str: 31 });
      component.submit();
      fixture.detectChanges();

      const strError = fixture.nativeElement.querySelector('[data-testid="str-error"]');
      expect(strError).toBeTruthy();
    });

    it('should show dex error message after submit with out-of-range dex', () => {
      component.form.patchValue({ ...validFormValue(), dex: 0 });
      component.submit();
      fixture.detectChanges();

      const dexError = fixture.nativeElement.querySelector('[data-testid="dex-error"]');
      expect(dexError).toBeTruthy();
    });

    it('should show con error message after submit with out-of-range con', () => {
      component.form.patchValue({ ...validFormValue(), con: 31 });
      component.submit();
      fixture.detectChanges();

      const conError = fixture.nativeElement.querySelector('[data-testid="con-error"]');
      expect(conError).toBeTruthy();
    });

    it('should show intStat error message after submit with out-of-range intStat', () => {
      component.form.patchValue({ ...validFormValue(), intStat: 0 });
      component.submit();
      fixture.detectChanges();

      const intStatError = fixture.nativeElement.querySelector('[data-testid="intStat-error"]');
      expect(intStatError).toBeTruthy();
    });

    it('should show wis error message after submit with out-of-range wis', () => {
      component.form.patchValue({ ...validFormValue(), wis: 31 });
      component.submit();
      fixture.detectChanges();

      const wisError = fixture.nativeElement.querySelector('[data-testid="wis-error"]');
      expect(wisError).toBeTruthy();
    });

    it('should show cha error message after submit with out-of-range cha', () => {
      component.form.patchValue({ ...validFormValue(), cha: 0 });
      component.submit();
      fixture.detectChanges();

      const chaError = fixture.nativeElement.querySelector('[data-testid="cha-error"]');
      expect(chaError).toBeTruthy();
    });

    it('should show challengeRating error message after submit with null challengeRating', () => {
      component.form.patchValue({ ...validFormValue(), challengeRating: null });
      component.submit();
      fixture.detectChanges();

      const crError = fixture.nativeElement.querySelector('[data-testid="challenge-rating-error"]');
      expect(crError).toBeTruthy();
    });

    it('should show challengeRating error message after submit with negative challengeRating', () => {
      component.form.patchValue({ ...validFormValue(), challengeRating: -1 });
      component.submit();
      fixture.detectChanges();

      const crError = fixture.nativeElement.querySelector('[data-testid="challenge-rating-error"]');
      expect(crError).toBeTruthy();
    });

    it('should show xp error message after submit with null xp', () => {
      component.form.patchValue({ ...validFormValue(), xp: null });
      component.submit();
      fixture.detectChanges();

      const xpError = fixture.nativeElement.querySelector('[data-testid="xp-error"]');
      expect(xpError).toBeTruthy();
    });

    it('should show xp error message after submit with negative xp', () => {
      component.form.patchValue({ ...validFormValue(), xp: -1 });
      component.submit();
      fixture.detectChanges();

      const xpError = fixture.nativeElement.querySelector('[data-testid="xp-error"]');
      expect(xpError).toBeTruthy();
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

    it('should NOT call HomebrewService.createMonster() when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when name is empty', () => {
      component.form.patchValue({ ...validFormValue(), name: '' });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when type is empty', () => {
      component.form.patchValue({ ...validFormValue(), type: '' });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when size is empty', () => {
      component.form.patchValue({ ...validFormValue(), size: '' });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when armorClass is out of range', () => {
      component.form.patchValue({ ...validFormValue(), armorClass: 31 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when armorClass is below 1', () => {
      component.form.patchValue({ ...validFormValue(), armorClass: 0 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when hitPoints is below 1', () => {
      component.form.patchValue({ ...validFormValue(), hitPoints: 0 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when speed is empty', () => {
      component.form.patchValue({ ...validFormValue(), speed: '' });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when str is out of range', () => {
      component.form.patchValue({ ...validFormValue(), str: 31 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when dex is out of range', () => {
      component.form.patchValue({ ...validFormValue(), dex: 0 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when con is out of range', () => {
      component.form.patchValue({ ...validFormValue(), con: 31 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when intStat is out of range', () => {
      component.form.patchValue({ ...validFormValue(), intStat: 0 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when wis is out of range', () => {
      component.form.patchValue({ ...validFormValue(), wis: 31 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when cha is out of range', () => {
      component.form.patchValue({ ...validFormValue(), cha: 0 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when challengeRating is negative', () => {
      component.form.patchValue({ ...validFormValue(), challengeRating: -1 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });

    it('should NOT call HomebrewService.createMonster() when xp is negative', () => {
      component.form.patchValue({ ...validFormValue(), xp: -1 });
      component.submit();
      expect(homebrewServiceSpy.createMonster).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Successful submit — navigates to /homebrew
  // -------------------------------------------------------------------------

  describe('Successful submit', () => {

    beforeEach(() => {
      homebrewServiceSpy.createMonster.and.returnValue(of({}));
      component.form.patchValue(validFormValue());
    });

    it('should call HomebrewService.createMonster() with the form value', () => {
      component.submit();
      expect(homebrewServiceSpy.createMonster).toHaveBeenCalledWith(component.form.value);
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
      homebrewServiceSpy.createMonster.and.returnValue(throwError(() => backendError));
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
      homebrewServiceSpy.createMonster.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      expect(component.error).toBe('Network error');
    });

    it('should display a generic fallback error message when no message is available', () => {
      homebrewServiceSpy.createMonster.and.returnValue(throwError(() => ({})));
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

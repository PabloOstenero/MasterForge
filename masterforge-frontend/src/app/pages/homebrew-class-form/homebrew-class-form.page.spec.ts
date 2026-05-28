/**
 * Unit tests for HomebrewClassFormPage
 *
 * Covers:
 *  1. atLeastOneSelectedValidator (pure function)
 *  2. buildClassFeatures (pure function)
 *  3. parseSpellSlotTable and serializeSpellSlotTable (pure functions)
 *  4. Component initialization
 *  5. Form validators
 *  6. Chip toggle logic
 *  7. FormArray helpers
 *  8. Skill picker logic
 *  9. Custom proficiency helpers
 * 10. Spellcasting toggle logic
 * 11. Edit mode — loadClassForEdit
 * 12. Submit — invalid form
 * 13. Submit — create mode success
 * 14. Submit — create mode error
 * 15. Submit — edit mode
 * 16. Cancel
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

import {
  HomebrewClassFormPage,
  atLeastOneSelectedValidator,
  buildClassFeatures,
  parseSpellSlotTable,
  serializeSpellSlotTable,
  SAVING_THROWS,
  WEAPON_PROFS,
  ARMOR_PROFS,
  DAMAGE_TYPES,
  CONDITIONS,
  SKILL_NAMES,
} from './homebrew-class-form.page';
import {
  SkillProficiencies,
  MulticlassingPrerequisites,
  MulticlassingProficiencies,
  Spellcasting,
} from '../../models/homebrew.models';
import { HomebrewService } from '../../services/homebrew.service';

// Mock router that captures navigate calls
function createRouterMock() {
  return jasmine.createSpyObj<Router>('Router', ['navigate']);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createActivatedRouteMock(id: string | null) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

function makeValidForm(component: HomebrewClassFormPage): void {
  component.form.patchValue({
    name: 'Artificer',
    description: 'A tinkerer class',
    price: 0,
    hitDie: 'd8',
    primaryAbility: 'Intelligence',
    subclassLevel: 3,
  });
  // Select at least one saving throw (Constitution)
  (component.form.get('savingThrows') as FormGroup).get('Constitution')!.setValue(true);
}

/** Builds a realistic class object for edit mode tests */
function makeEditClassObject() {
  return {
    id: 42,
    name: 'Artificer',
    description: 'A tinkerer class',
    price: 5,
    hitDie: 'd8',
    savingThrows: {
      Strength: false,
      Dexterity: false,
      Constitution: true,
      Intelligence: true,
      Wisdom: false,
      Charisma: false,
    },
    features: [
      { id: 1, name: 'Magical Tinkering', description: 'Infuse objects with magic', levelRequired: 1 },
      { id: 2, name: 'Infuse Item', description: 'Imbue items with power', levelRequired: 2 },
    ],
    classFeatures: {
      primaryAbility: 'Intelligence',
      subclassLevel: 3,
      startingEquipment: 'Thieves tools, a light crossbow',
      skillProficiencies: {
        fixed: [],
        choicePool: ['Arcana', 'History'],
        choiceCount: 2,
      },
      weaponProficiencies: ['Simple Weapons', 'Hand Crossbows', 'Custom Blade'],
      armorProficiencies: ['Light Armor', 'Medium Armor'],
      toolProficiencies: ['Thieves Tools'],
      damageResistances: ['Fire', 'Acid'],
      damageImmunities: ['Poison'],
      conditionImmunities: ['Poisoned'],
      multiclassingPrerequisites: {
        requirements: [{ ability: 'Intelligence', minScore: 13 }],
        logic: 'AND',
      },
      multiclassingProficiencies: {
        armor: ['Light Armor'],
        weapons: ['Simple Weapons'],
        tools: ['Thieves Tools'],
      },
      spellcasting: {
        ability: 'Intelligence',
        spellcastingType: 'Half Caster',
        ritualCasting: true,
        preparationStyle: 'PREPARED',
        cantripsKnown: Array(20).fill(2),
        spellsKnown: Array(20).fill(4),
        spellSlots: {
          slots: Array(20).fill(Array(9).fill(0)),
        },
      },
    },
  };
}

// ===========================================================================
// 1. atLeastOneSelectedValidator (pure function)
// ===========================================================================

describe('atLeastOneSelectedValidator (pure function)', () => {
  let fb: FormBuilder;

  beforeEach(() => {
    fb = new FormBuilder();
  });

  it('should return atLeastOneRequired error when all controls are false', () => {
    const group = fb.group({
      Strength: [false],
      Dexterity: [false],
      Constitution: [false],
      Intelligence: [false],
      Wisdom: [false],
      Charisma: [false],
    });
    const result = atLeastOneSelectedValidator(group);
    expect(result).toEqual({ atLeastOneRequired: true });
  });

  it('should return null when exactly one control is true', () => {
    const group = fb.group({
      Strength: [false],
      Dexterity: [false],
      Constitution: [true],
      Intelligence: [false],
      Wisdom: [false],
      Charisma: [false],
    });
    const result = atLeastOneSelectedValidator(group);
    expect(result).toBeNull();
  });

  it('should return null when multiple controls are true', () => {
    const group = fb.group({
      Strength: [true],
      Dexterity: [true],
      Constitution: [true],
      Intelligence: [false],
      Wisdom: [false],
      Charisma: [false],
    });
    const result = atLeastOneSelectedValidator(group);
    expect(result).toBeNull();
  });

  it('should return null when all controls are true', () => {
    const group = fb.group({
      Strength: [true],
      Dexterity: [true],
      Constitution: [true],
      Intelligence: [true],
      Wisdom: [true],
      Charisma: [true],
    });
    const result = atLeastOneSelectedValidator(group);
    expect(result).toBeNull();
  });
});

// ===========================================================================
// 2. buildClassFeatures (pure function)
// ===========================================================================

describe('buildClassFeatures (pure function)', () => {
  const baseSkillProfs: SkillProficiencies = { fixed: ['Arcana'], choicePool: [], choiceCount: 0 };

  it('should include required fields in the result', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.primaryAbility).toBe('Intelligence');
    expect(result.subclassLevel).toBe(3);
    expect(result.skillProficiencies).toEqual(baseSkillProfs);
  });

  it('should omit startingEquipment when empty string', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.startingEquipment).toBeUndefined();
  });

  it('should include startingEquipment when non-empty', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, 'Thieves tools', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.startingEquipment).toBe('Thieves tools');
  });

  it('should trim startingEquipment whitespace', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '  Thieves tools  ', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.startingEquipment).toBe('Thieves tools');
  });

  it('should omit multiclassingPrerequisites when null', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.multiclassingPrerequisites).toBeUndefined();
  });

  it('should omit multiclassingPrerequisites when requirements array is empty', () => {
    const prereqs: MulticlassingPrerequisites = { requirements: [], logic: 'AND' };
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], prereqs, null, null, [], [], []
    );
    expect(result.multiclassingPrerequisites).toBeUndefined();
  });

  it('should include multiclassingPrerequisites when requirements are present', () => {
    const prereqs: MulticlassingPrerequisites = {
      requirements: [{ ability: 'Intelligence', minScore: 13 }],
      logic: 'AND',
    };
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], prereqs, null, null, [], [], []
    );
    expect(result.multiclassingPrerequisites).toEqual(prereqs);
  });

  it('should omit multiclassingProficiencies when null', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.multiclassingProficiencies).toBeUndefined();
  });

  it('should omit multiclassingProficiencies when all arrays are empty', () => {
    const mcProfs: MulticlassingProficiencies = { armor: [], weapons: [], tools: [] };
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, mcProfs, null, [], [], []
    );
    expect(result.multiclassingProficiencies).toBeUndefined();
  });

  it('should include multiclassingProficiencies when armor is non-empty', () => {
    const mcProfs: MulticlassingProficiencies = { armor: ['Light Armor'], weapons: [], tools: [] };
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, mcProfs, null, [], [], []
    );
    expect(result.multiclassingProficiencies).toEqual(mcProfs);
  });

  it('should omit spellcasting when null', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null, [], [], []
    );
    expect(result.spellcasting).toBeUndefined();
  });

  it('should include spellcasting when provided', () => {
    const sc: Spellcasting = {
      ability: 'Intelligence',
      spellcastingType: 'Full Caster',
      ritualCasting: false,
      preparationStyle: 'PREPARED',
      cantripsKnown: Array(20).fill(0),
      spellSlots: { slots: Array(20).fill(Array(9).fill(0)) },
    };
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, sc, [], [], []
    );
    expect(result.spellcasting).toEqual(sc);
  });

  it('should include weapon and armor proficiencies as provided', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      ['Simple Weapons', 'Custom Blade'], ['Light Armor'], [], null, null, null, [], [], []
    );
    expect(result.weaponProficiencies).toEqual(['Simple Weapons', 'Custom Blade']);
    expect(result.armorProficiencies).toEqual(['Light Armor']);
  });

  it('should include damage resistances, immunities, and condition immunities', () => {
    const result = buildClassFeatures(
      'Intelligence', 3, '', baseSkillProfs,
      [], [], [], null, null, null,
      ['Fire', 'Acid'], ['Poison'], ['Poisoned']
    );
    expect(result.damageResistances).toEqual(['Fire', 'Acid']);
    expect(result.damageImmunities).toEqual(['Poison']);
    expect(result.conditionImmunities).toEqual(['Poisoned']);
  });
});

// ===========================================================================
// 3. parseSpellSlotTable and serializeSpellSlotTable (pure functions)
// ===========================================================================

describe('parseSpellSlotTable and serializeSpellSlotTable (pure functions)', () => {
  it('should parse a 2D array into a SpellSlotTable object', () => {
    const slots = [[2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0]];
    const result = parseSpellSlotTable(slots);
    expect(result).toEqual({ slots });
  });

  it('should serialize a SpellSlotTable back to a 2D array', () => {
    const slots = [[2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0]];
    const table = { slots };
    const result = serializeSpellSlotTable(table);
    expect(result).toEqual(slots);
  });

  it('should round-trip: parse then serialize produces the original array', () => {
    const original = Array(20).fill(null).map((_, i) =>
      Array(9).fill(null).map((__, j) => (i + j) % 5)
    );
    const parsed = parseSpellSlotTable(original);
    const serialized = serializeSpellSlotTable(parsed);
    expect(serialized).toEqual(original);
  });

  it('should round-trip: serialize then parse produces equivalent table', () => {
    const original = Array(20).fill(null).map(() => Array(9).fill(0));
    const table = parseSpellSlotTable(original);
    const serialized = serializeSpellSlotTable(table);
    const reparsed = parseSpellSlotTable(serialized);
    expect(reparsed).toEqual(table);
  });

  it('should handle empty slots array', () => {
    const result = parseSpellSlotTable([]);
    expect(result).toEqual({ slots: [] });
    expect(serializeSpellSlotTable(result)).toEqual([]);
  });
});

// ===========================================================================
// Component-level tests (shared setup)
// ===========================================================================

describe('HomebrewClassFormPage (component)', () => {
  let component: HomebrewClassFormPage;
  let fixture: ComponentFixture<HomebrewClassFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createClass',
      'updateClass',
      'getClass',
      'createClassFeature',
      'updateClassFeature',
      'deleteClassFeature',
      'getAllItems',
    ]);
    homebrewServiceSpy.createClass.and.returnValue(of({ id: 99 }));
    homebrewServiceSpy.updateClass.and.returnValue(of({ id: 99 }));
    homebrewServiceSpy.getClass.and.returnValue(of(makeEditClassObject()));
    homebrewServiceSpy.createClassFeature.and.returnValue(of({}));
    homebrewServiceSpy.updateClassFeature.and.returnValue(of({}));
    homebrewServiceSpy.deleteClassFeature.and.returnValue(of(undefined));
    homebrewServiceSpy.getAllItems.and.returnValue(of([]));

    routerSpy = createRouterMock();
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [HomebrewClassFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock(null) },
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ role: 'USER' }), isPro: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewClassFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // =========================================================================
  // 4. Component initialization
  // =========================================================================

  describe('Component initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with a FormGroup', () => {
      expect(component.form).toBeTruthy();
    });

    it('should start with submitting = false', () => {
      expect(component.submitting).toBeFalse();
    });

    it('should start with error = null', () => {
      expect(component.error).toBeNull();
    });

    it('should start in create mode (editMode = false)', () => {
      expect(component.editMode).toBeFalse();
    });

    it('should initialize name control as empty string', () => {
      expect(component.form.get('name')?.value).toBe('');
    });

    it('should initialize price control as null', () => {
      expect(component.form.get('price')?.value).toBeNull();
    });

    it('should initialize hitDie control as empty string', () => {
      expect(component.form.get('hitDie')?.value).toBe('');
    });

    it('should initialize subclassLevel to 3', () => {
      expect(component.form.get('subclassLevel')?.value).toBe(3);
    });

    it('should initialize primaryAbility as empty string', () => {
      expect(component.form.get('primaryAbility')?.value).toBe('');
    });

    it('should initialize spellcastingEnabled to false', () => {
      expect(component.spellcastingEnabled).toBeFalse();
    });

    it('should initialize showSpellsKnown to false', () => {
      expect(component.showSpellsKnown).toBeFalse();
    });

    it('should initialize savingThrowChips as all false', () => {
      expect(component.savingThrowChips.every(v => v === false)).toBeTrue();
    });

    it('should initialize weaponChips as all false', () => {
      expect(component.weaponChips.every(v => v === false)).toBeTrue();
    });

    it('should initialize armorChips as all false', () => {
      expect(component.armorChips.every(v => v === false)).toBeTrue();
    });

    it('should initialize features FormArray as empty', () => {
      expect(component.features.length).toBe(0);
    });

    it('should initialize multiclassingPrerequisites FormArray as empty', () => {
      expect(component.multiclassingPrerequisites.length).toBe(0);
    });

    it('should initialize damageResistances FormArray with DAMAGE_TYPES.length entries', () => {
      expect(component.damageResistances.length).toBe(DAMAGE_TYPES.length);
    });

    it('should initialize damageImmunities FormArray with DAMAGE_TYPES.length entries', () => {
      expect(component.damageImmunities.length).toBe(DAMAGE_TYPES.length);
    });

    it('should initialize conditionImmunities FormArray with CONDITIONS.length entries', () => {
      expect(component.conditionImmunities.length).toBe(CONDITIONS.length);
    });

    it('should initialize cantripsKnown FormArray with 20 entries', () => {
      expect(component.cantripsKnown.length).toBe(20);
    });

    it('should initialize spellsKnown FormArray with 20 entries', () => {
      expect(component.spellsKnown.length).toBe(20);
    });

    it('should initialize spellSlots FormArray with 20 rows', () => {
      expect(component.spellSlots.length).toBe(20);
    });

    it('should initialize multiclassingArmorGrants FormArray with ARMOR_PROFS.length entries', () => {
      expect(component.multiclassingArmorGrants.length).toBe(ARMOR_PROFS.length);
    });

    it('should initialize multiclassingWeaponGrants FormArray with WEAPON_PROFS.length entries', () => {
      expect(component.multiclassingWeaponGrants.length).toBe(WEAPON_PROFS.length);
    });

    it('should initialize customWeaponProfs as empty array', () => {
      expect(component.customWeaponProfs).toEqual([]);
    });

    it('should initialize customArmorProfs as empty array', () => {
      expect(component.customArmorProfs).toEqual([]);
    });

    it('should initialize customToolProfs as empty array', () => {
      expect(component.customToolProfs).toEqual([]);
    });
  });

  // =========================================================================
  // 5. Form validators
  // =========================================================================

  describe('Form validators', () => {
    describe('name field', () => {
      it('should be invalid when name is empty', () => {
        component.form.get('name')!.setValue('');
        expect(component.form.get('name')!.invalid).toBeTrue();
      });

      it('should have required error when name is empty', () => {
        component.form.get('name')!.setValue('');
        expect(component.form.get('name')!.errors?.['required']).toBeTrue();
      });

      it('should be valid when name has a value', () => {
        component.form.get('name')!.setValue('Paladin');
        expect(component.form.get('name')!.valid).toBeTrue();
      });
    });

    describe('price field', () => {
      it('should be invalid when price is null', () => {
        component.form.get('price')!.setValue(null);
        expect(component.form.get('price')!.invalid).toBeTrue();
      });

      it('should be invalid when price is negative', () => {
        component.form.get('price')!.setValue(-1);
        expect(component.form.get('price')!.invalid).toBeTrue();
      });

      it('should have min error when price is negative', () => {
        component.form.get('price')!.setValue(-0.01);
        expect(component.form.get('price')!.errors?.['min']).toBeTruthy();
      });

      it('should be valid when price is 0', () => {
        component.form.get('price')!.setValue(0);
        expect(component.form.get('price')!.valid).toBeTrue();
      });

      it('should be valid when price is positive', () => {
        component.form.get('price')!.setValue(9.99);
        expect(component.form.get('price')!.valid).toBeTrue();
      });
    });

    describe('hitDie field', () => {
      it('should be invalid when hitDie is empty', () => {
        component.form.get('hitDie')!.setValue('');
        expect(component.form.get('hitDie')!.invalid).toBeTrue();
      });

      it('should have required error when hitDie is empty', () => {
        component.form.get('hitDie')!.setValue('');
        expect(component.form.get('hitDie')!.errors?.['required']).toBeTrue();
      });

      it('should be valid when hitDie is d6', () => {
        component.form.get('hitDie')!.setValue('d6');
        expect(component.form.get('hitDie')!.valid).toBeTrue();
      });

      it('should be valid when hitDie is d8', () => {
        component.form.get('hitDie')!.setValue('d8');
        expect(component.form.get('hitDie')!.valid).toBeTrue();
      });

      it('should be valid when hitDie is d10', () => {
        component.form.get('hitDie')!.setValue('d10');
        expect(component.form.get('hitDie')!.valid).toBeTrue();
      });

      it('should be valid when hitDie is d12', () => {
        component.form.get('hitDie')!.setValue('d12');
        expect(component.form.get('hitDie')!.valid).toBeTrue();
      });
    });

    describe('subclassLevel field', () => {
      it('should be invalid when subclassLevel is null', () => {
        component.form.get('subclassLevel')!.setValue(null);
        expect(component.form.get('subclassLevel')!.invalid).toBeTrue();
      });

      it('should be invalid when subclassLevel is 0', () => {
        component.form.get('subclassLevel')!.setValue(0);
        expect(component.form.get('subclassLevel')!.invalid).toBeTrue();
      });

      it('should have min error when subclassLevel is 0', () => {
        component.form.get('subclassLevel')!.setValue(0);
        expect(component.form.get('subclassLevel')!.errors?.['min']).toBeTruthy();
      });

      it('should be invalid when subclassLevel is 21', () => {
        component.form.get('subclassLevel')!.setValue(21);
        expect(component.form.get('subclassLevel')!.invalid).toBeTrue();
      });

      it('should have max error when subclassLevel is 21', () => {
        component.form.get('subclassLevel')!.setValue(21);
        expect(component.form.get('subclassLevel')!.errors?.['max']).toBeTruthy();
      });

      it('should be valid when subclassLevel is 1', () => {
        component.form.get('subclassLevel')!.setValue(1);
        expect(component.form.get('subclassLevel')!.valid).toBeTrue();
      });

      it('should be valid when subclassLevel is 20', () => {
        component.form.get('subclassLevel')!.setValue(20);
        expect(component.form.get('subclassLevel')!.valid).toBeTrue();
      });

      it('should be valid when subclassLevel is 3 (default)', () => {
        expect(component.form.get('subclassLevel')!.valid).toBeTrue();
      });
    });

    describe('primaryAbility field', () => {
      it('should be invalid when primaryAbility is empty', () => {
        component.form.get('primaryAbility')!.setValue('');
        expect(component.form.get('primaryAbility')!.invalid).toBeTrue();
      });

      it('should have required error when primaryAbility is empty', () => {
        component.form.get('primaryAbility')!.setValue('');
        expect(component.form.get('primaryAbility')!.errors?.['required']).toBeTrue();
      });

      it('should be valid when primaryAbility is set', () => {
        component.form.get('primaryAbility')!.setValue('Intelligence');
        expect(component.form.get('primaryAbility')!.valid).toBeTrue();
      });
    });

    describe('savingThrows FormGroup', () => {
      it('should be invalid when all saving throws are false', () => {
        const stGroup = component.form.get('savingThrows') as FormGroup;
        SAVING_THROWS.forEach(st => stGroup.get(st)!.setValue(false));
        expect(stGroup.invalid).toBeTrue();
      });

      it('should have atLeastOneRequired error when all saving throws are false', () => {
        const stGroup = component.form.get('savingThrows') as FormGroup;
        SAVING_THROWS.forEach(st => stGroup.get(st)!.setValue(false));
        expect(stGroup.errors?.['atLeastOneRequired']).toBeTrue();
      });

      it('should be valid when at least one saving throw is true', () => {
        const stGroup = component.form.get('savingThrows') as FormGroup;
        SAVING_THROWS.forEach(st => stGroup.get(st)!.setValue(false));
        stGroup.get('Constitution')!.setValue(true);
        expect(stGroup.valid).toBeTrue();
      });

      it('should use capitalized keys (Strength, not strength)', () => {
        const stGroup = component.form.get('savingThrows') as FormGroup;
        expect(stGroup.get('Strength')).toBeTruthy();
        expect(stGroup.get('strength')).toBeNull();
      });
    });
  });

  // =========================================================================
  // 6. Chip toggle logic
  // =========================================================================

  describe('Chip toggle logic', () => {
    describe('toggleSavingThrow', () => {
      it('should toggle savingThrowChips[index] from false to true', () => {
        component.toggleSavingThrow(0);
        expect(component.savingThrowChips[0]).toBeTrue();
      });

      it('should toggle savingThrowChips[index] from true to false', () => {
        component.toggleSavingThrow(0);
        component.toggleSavingThrow(0);
        expect(component.savingThrowChips[0]).toBeFalse();
      });

      it('should update the corresponding FormGroup control', () => {
        const stGroup = component.form.get('savingThrows') as FormGroup;
        component.toggleSavingThrow(0); // Strength
        expect(stGroup.get('Strength')!.value).toBeTrue();
      });

      it('should keep FormGroup control and chip in sync', () => {
        component.toggleSavingThrow(2); // Constitution
        const stGroup = component.form.get('savingThrows') as FormGroup;
        expect(stGroup.get('Constitution')!.value).toBe(component.savingThrowChips[2]);
      });
    });

    describe('toggleWeaponChip', () => {
      it('should toggle weaponChips[index] from false to true', () => {
        component.toggleWeaponChip(0);
        expect(component.weaponChips[0]).toBeTrue();
      });

      it('should toggle weaponChips[index] from true to false', () => {
        component.toggleWeaponChip(0);
        component.toggleWeaponChip(0);
        expect(component.weaponChips[0]).toBeFalse();
      });

      it('should not affect other weapon chips', () => {
        component.toggleWeaponChip(1);
        expect(component.weaponChips[0]).toBeFalse();
        expect(component.weaponChips[2]).toBeFalse();
      });
    });

    describe('toggleArmorChip', () => {
      it('should toggle armorChips[index] from false to true', () => {
        component.toggleArmorChip(0);
        expect(component.armorChips[0]).toBeTrue();
      });

      it('should toggle armorChips[index] from true to false', () => {
        component.toggleArmorChip(0);
        component.toggleArmorChip(0);
        expect(component.armorChips[0]).toBeFalse();
      });
    });

    describe('toggleDamageResistanceChip', () => {
      it('should toggle damageResistances FormArray value from false to true', () => {
        component.toggleDamageResistanceChip(0);
        expect(component.damageResistances.at(0).value).toBeTrue();
      });

      it('should toggle damageResistances FormArray value from true to false', () => {
        component.toggleDamageResistanceChip(0);
        component.toggleDamageResistanceChip(0);
        expect(component.damageResistances.at(0).value).toBeFalse();
      });
    });

    describe('toggleDamageImmunityChip', () => {
      it('should toggle damageImmunities FormArray value from false to true', () => {
        component.toggleDamageImmunityChip(0);
        expect(component.damageImmunities.at(0).value).toBeTrue();
      });

      it('should toggle damageImmunities FormArray value from true to false', () => {
        component.toggleDamageImmunityChip(0);
        component.toggleDamageImmunityChip(0);
        expect(component.damageImmunities.at(0).value).toBeFalse();
      });
    });

    describe('toggleConditionImmunityChip', () => {
      it('should toggle conditionImmunities FormArray value from false to true', () => {
        component.toggleConditionImmunityChip(0);
        expect(component.conditionImmunities.at(0).value).toBeTrue();
      });

      it('should toggle conditionImmunities FormArray value from true to false', () => {
        component.toggleConditionImmunityChip(0);
        component.toggleConditionImmunityChip(0);
        expect(component.conditionImmunities.at(0).value).toBeFalse();
      });
    });

    describe('toggleMulticlassingArmorChip', () => {
      it('should toggle multiclassingArmorChips[index] from false to true', () => {
        component.toggleMulticlassingArmorChip(0);
        expect(component.multiclassingArmorChips[0]).toBeTrue();
      });

      it('should update multiclassingArmorGrants FormArray to match chip state', () => {
        component.toggleMulticlassingArmorChip(0);
        expect(component.multiclassingArmorGrants.at(0).value).toBeTrue();
      });

      it('should toggle both chip and FormArray back to false', () => {
        component.toggleMulticlassingArmorChip(0);
        component.toggleMulticlassingArmorChip(0);
        expect(component.multiclassingArmorChips[0]).toBeFalse();
        expect(component.multiclassingArmorGrants.at(0).value).toBeFalse();
      });
    });

    describe('toggleMulticlassingWeaponChip', () => {
      it('should toggle multiclassingWeaponChips[index] from false to true', () => {
        component.toggleMulticlassingWeaponChip(0);
        expect(component.multiclassingWeaponChips[0]).toBeTrue();
      });

      it('should update multiclassingWeaponGrants FormArray to match chip state', () => {
        component.toggleMulticlassingWeaponChip(0);
        expect(component.multiclassingWeaponGrants.at(0).value).toBeTrue();
      });

      it('should toggle both chip and FormArray back to false', () => {
        component.toggleMulticlassingWeaponChip(0);
        component.toggleMulticlassingWeaponChip(0);
        expect(component.multiclassingWeaponChips[0]).toBeFalse();
        expect(component.multiclassingWeaponGrants.at(0).value).toBeFalse();
      });
    });
  });

  // =========================================================================
  // 7. FormArray helpers
  // =========================================================================

  describe('FormArray helpers', () => {
    describe('addFeature', () => {
      it('should add a new entry to the features FormArray', () => {
        component.addFeature();
        expect(component.features.length).toBe(1);
      });

      it('should add a FormGroup with id, name, description, levelRequired', () => {
        component.addFeature();
        const group = component.features.at(0) as FormGroup;
        expect(group.get('id')).toBeTruthy();
        expect(group.get('name')).toBeTruthy();
        expect(group.get('description')).toBeTruthy();
        expect(group.get('levelRequired')).toBeTruthy();
      });

      it('should initialize id as null', () => {
        component.addFeature();
        expect(component.features.at(0).get('id')!.value).toBeNull();
      });

      it('should initialize name as empty string', () => {
        component.addFeature();
        expect(component.features.at(0).get('name')!.value).toBe('');
      });

      it('should add multiple features', () => {
        component.addFeature();
        component.addFeature();
        component.addFeature();
        expect(component.features.length).toBe(3);
      });

      it('should require name on the new feature', () => {
        component.addFeature();
        expect(component.features.at(0).get('name')!.invalid).toBeTrue();
      });

      it('should require description on the new feature', () => {
        component.addFeature();
        expect(component.features.at(0).get('description')!.invalid).toBeTrue();
      });

      it('should require levelRequired on the new feature', () => {
        component.addFeature();
        expect(component.features.at(0).get('levelRequired')!.invalid).toBeTrue();
      });
    });

    describe('removeFeature', () => {
      it('should remove the feature at the given index', () => {
        component.addFeature();
        component.addFeature();
        component.removeFeature(0);
        expect(component.features.length).toBe(1);
      });

      it('should remove the correct feature', () => {
        component.addFeature();
        component.features.at(0).get('name')!.setValue('Feature A');
        component.addFeature();
        component.features.at(1).get('name')!.setValue('Feature B');
        component.removeFeature(0);
        expect(component.features.at(0).get('name')!.value).toBe('Feature B');
      });

      it('should result in empty array when last feature is removed', () => {
        component.addFeature();
        component.removeFeature(0);
        expect(component.features.length).toBe(0);
      });
    });

    describe('addMulticlassingPrerequisite', () => {
      it('should add a new entry to the multiclassingPrerequisites FormArray', () => {
        component.addMulticlassingPrerequisite();
        expect(component.multiclassingPrerequisites.length).toBe(1);
      });

      it('should add a FormGroup with ability and minScore', () => {
        component.addMulticlassingPrerequisite();
        const group = component.multiclassingPrerequisites.at(0) as FormGroup;
        expect(group.get('ability')).toBeTruthy();
        expect(group.get('minScore')).toBeTruthy();
      });

      it('should initialize ability as empty string', () => {
        component.addMulticlassingPrerequisite();
        expect(component.multiclassingPrerequisites.at(0).get('ability')!.value).toBe('');
      });

      it('should initialize minScore as null', () => {
        component.addMulticlassingPrerequisite();
        expect(component.multiclassingPrerequisites.at(0).get('minScore')!.value).toBeNull();
      });

      it('should require ability on the new prerequisite', () => {
        component.addMulticlassingPrerequisite();
        expect(component.multiclassingPrerequisites.at(0).get('ability')!.invalid).toBeTrue();
      });
    });

    describe('removeMulticlassingPrerequisite', () => {
      it('should remove the prerequisite at the given index', () => {
        component.addMulticlassingPrerequisite();
        component.addMulticlassingPrerequisite();
        component.removeMulticlassingPrerequisite(0);
        expect(component.multiclassingPrerequisites.length).toBe(1);
      });

      it('should result in empty array when last prerequisite is removed', () => {
        component.addMulticlassingPrerequisite();
        component.removeMulticlassingPrerequisite(0);
        expect(component.multiclassingPrerequisites.length).toBe(0);
      });
    });
  });

  // =========================================================================
  // 8. Skill picker logic
  // =========================================================================

  describe('Skill picker logic', () => {
    describe('confirmAddSkill', () => {
      it('should mark the skill as selected in the skills FormGroup', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        expect(component.skills.get('Arcana')!.get('selected')!.value).toBeTrue();
      });

      it('should clear pendingSkillName after confirming', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        expect(component.pendingSkillName).toBe('');
      });

      it('should do nothing when pendingSkillName is empty', () => {
        component.pendingSkillName = '';
        component.confirmAddSkill();
        expect(component.selectedSkillNames.length).toBe(0);
      });

      it('should add skill to selectedSkillNames', () => {
        component.pendingSkillName = 'History';
        component.confirmAddSkill();
        expect(component.selectedSkillNames).toContain('History');
      });
    });

    describe('removeSkillEntry', () => {
      it('should mark the skill as not selected', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        component.removeSkillEntry('Arcana');
        expect(component.skills.get('Arcana')!.get('selected')!.value).toBeFalse();
      });

      it('should remove skill from selectedSkillNames', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        component.removeSkillEntry('Arcana');
        expect(component.selectedSkillNames).not.toContain('Arcana');
      });
    });

    describe('selectedSkillNames', () => {
      it('should return empty array when no skills are selected', () => {
        expect(component.selectedSkillNames).toEqual([]);
      });

      it('should return only selected skills', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        component.pendingSkillName = 'History';
        component.confirmAddSkill();
        expect(component.selectedSkillNames).toEqual(['Arcana', 'History']);
      });
    });

    describe('availableSkillNames', () => {
      it('should return all skills when none are selected', () => {
        expect(component.availableSkillNames.length).toBe(SKILL_NAMES.length);
      });

      it('should exclude selected skills', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        expect(component.availableSkillNames).not.toContain('Arcana');
      });

      it('should return all skills minus selected ones', () => {
        component.pendingSkillName = 'Arcana';
        component.confirmAddSkill();
        expect(component.availableSkillNames.length).toBe(SKILL_NAMES.length - 1);
      });
    });
  });

  // =========================================================================
  // 9. Custom proficiency helpers
  // =========================================================================

  describe('Custom proficiency helpers', () => {
    describe('addCustomWeaponProf', () => {
      it('should add a trimmed value to customWeaponProfs', () => {
        component.pendingWeaponProf = '  Whip  ';
        component.addCustomWeaponProf();
        expect(component.customWeaponProfs).toContain('Whip');
      });

      it('should clear pendingWeaponProf after adding', () => {
        component.pendingWeaponProf = 'Whip';
        component.addCustomWeaponProf();
        expect(component.pendingWeaponProf).toBe('');
      });

      it('should not add empty string', () => {
        component.pendingWeaponProf = '   ';
        component.addCustomWeaponProf();
        expect(component.customWeaponProfs.length).toBe(0);
      });

      it('should accumulate multiple entries', () => {
        component.pendingWeaponProf = 'Whip';
        component.addCustomWeaponProf();
        component.pendingWeaponProf = 'Net';
        component.addCustomWeaponProf();
        expect(component.customWeaponProfs).toEqual(['Whip', 'Net']);
      });
    });

    describe('addCustomArmorProf', () => {
      it('should add a trimmed value to customArmorProfs', () => {
        component.pendingArmorProf = '  Padded Armor  ';
        component.addCustomArmorProf();
        expect(component.customArmorProfs).toContain('Padded Armor');
      });

      it('should clear pendingArmorProf after adding', () => {
        component.pendingArmorProf = 'Padded Armor';
        component.addCustomArmorProf();
        expect(component.pendingArmorProf).toBe('');
      });

      it('should not add empty string', () => {
        component.pendingArmorProf = '';
        component.addCustomArmorProf();
        expect(component.customArmorProfs.length).toBe(0);
      });
    });

    describe('addCustomToolProf', () => {
      it('should add a trimmed value to customToolProfs', () => {
        component.pendingToolProf = '  Thieves Tools  ';
        component.addCustomToolProf();
        expect(component.customToolProfs).toContain('Thieves Tools');
      });

      it('should clear pendingToolProf after adding', () => {
        component.pendingToolProf = 'Thieves Tools';
        component.addCustomToolProf();
        expect(component.pendingToolProf).toBe('');
      });

      it('should not add empty string', () => {
        component.pendingToolProf = '';
        component.addCustomToolProf();
        expect(component.customToolProfs.length).toBe(0);
      });
    });
  });

  // =========================================================================
  // 10. Spellcasting toggle logic
  // =========================================================================

  describe('Spellcasting toggle logic', () => {
    describe('toggleSpellcasting', () => {
      it('should flip spellcastingEnabled from false to true', () => {
        component.toggleSpellcasting();
        expect(component.spellcastingEnabled).toBeTrue();
      });

      it('should flip spellcastingEnabled from true to false', () => {
        component.toggleSpellcasting();
        component.toggleSpellcasting();
        expect(component.spellcastingEnabled).toBeFalse();
      });

      it('should add required validator to spellcastingAbility when enabled', () => {
        component.toggleSpellcasting();
        component.form.get('spellcastingAbility')!.setValue('');
        expect(component.form.get('spellcastingAbility')!.invalid).toBeTrue();
        expect(component.form.get('spellcastingAbility')!.errors?.['required']).toBeTrue();
      });

      it('should add required validator to spellcastingType when enabled', () => {
        component.toggleSpellcasting();
        component.form.get('spellcastingType')!.setValue('');
        expect(component.form.get('spellcastingType')!.invalid).toBeTrue();
        expect(component.form.get('spellcastingType')!.errors?.['required']).toBeTrue();
      });

      it('should remove required validator from spellcastingAbility when disabled', () => {
        component.toggleSpellcasting(); // enable
        component.toggleSpellcasting(); // disable
        component.form.get('spellcastingAbility')!.setValue('');
        expect(component.form.get('spellcastingAbility')!.valid).toBeTrue();
      });

      it('should remove required validator from spellcastingType when disabled', () => {
        component.toggleSpellcasting(); // enable
        component.toggleSpellcasting(); // disable
        component.form.get('spellcastingType')!.setValue('');
        expect(component.form.get('spellcastingType')!.valid).toBeTrue();
      });

      it('should reset spellcastingAbility to empty string when disabled', () => {
        component.toggleSpellcasting();
        component.form.get('spellcastingAbility')!.setValue('Intelligence');
        component.toggleSpellcasting();
        expect(component.form.get('spellcastingAbility')!.value).toBe('');
      });

      it('should reset spellcastingType to empty string when disabled', () => {
        component.toggleSpellcasting();
        component.form.get('spellcastingType')!.setValue('Full Caster');
        component.toggleSpellcasting();
        expect(component.form.get('spellcastingType')!.value).toBe('');
      });
    });

    describe('onPreparationStyleChange', () => {
      it('should set showSpellsKnown to true when preparationStyle is KNOWN', () => {
        component.form.get('preparationStyle')!.setValue('KNOWN');
        component.onPreparationStyleChange();
        expect(component.showSpellsKnown).toBeTrue();
      });

      it('should set showSpellsKnown to false when preparationStyle is PREPARED', () => {
        component.form.get('preparationStyle')!.setValue('KNOWN');
        component.onPreparationStyleChange();
        component.form.get('preparationStyle')!.setValue('PREPARED');
        component.onPreparationStyleChange();
        expect(component.showSpellsKnown).toBeFalse();
      });
    });
  });

  // =========================================================================
  // 12. Submit — invalid form
  // =========================================================================

  describe('Submit — invalid form', () => {
    it('should call markAllAsTouched when form is invalid', () => {
      spyOn(component.form, 'markAllAsTouched').and.callThrough();
      component.submit();
      expect(component.form.markAllAsTouched).toHaveBeenCalled();
    });

    it('should NOT call createClass when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should NOT call updateClass when form is invalid', () => {
      component.submit();
      expect(homebrewServiceSpy.updateClass).not.toHaveBeenCalled();
    });

    it('should NOT set submitting = true when form is invalid', () => {
      component.submit();
      expect(component.submitting).toBeFalse();
    });

    it('should not navigate when form is invalid', () => {
      component.submit();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should be invalid when name is missing', () => {
      component.form.get('price')!.setValue(0);
      component.form.get('hitDie')!.setValue('d8');
      component.form.get('primaryAbility')!.setValue('Intelligence');
      (component.form.get('savingThrows') as FormGroup).get('Constitution')!.setValue(true);
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });

    it('should be invalid when no saving throw is selected', () => {
      component.form.get('name')!.setValue('Artificer');
      component.form.get('price')!.setValue(0);
      component.form.get('hitDie')!.setValue('d8');
      component.form.get('primaryAbility')!.setValue('Intelligence');
      // All saving throws remain false
      component.submit();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 13. Submit — create mode success
  // =========================================================================

  describe('Submit — create mode success', () => {
    beforeEach(() => {
      homebrewServiceSpy.createClass.and.returnValue(of({ id: 99 }));
      makeValidForm(component);
    });

    it('should call createClass with a DTO', fakeAsync(() => {
      component.submit();
      tick();
      expect(homebrewServiceSpy.createClass).toHaveBeenCalled();
    }));

    it('should navigate to /homebrew on success', fakeAsync(() => {
      component.submit();
      tick();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/homebrew']);
    }));

    it('should set submitting = false after success', fakeAsync(() => {
      component.submit();
      tick();
      expect(component.submitting).toBeFalse();
    }));

    it('should keep error = null after success', fakeAsync(() => {
      component.submit();
      tick();
      expect(component.error).toBeNull();
    }));

    it('should call reconcileClassFeatures with the returned class id', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(of({ id: 77 }));
      spyOn(component, 'reconcileClassFeatures').and.returnValue(Promise.resolve());
      component.submit();
      tick();
      expect(component.reconcileClassFeatures).toHaveBeenCalledWith(77);
    }));

    it('should include name in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.name).toBe('Artificer');
    }));

    it('should include hitDie in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.hitDie).toBe(8 as any);
    }));

    it('should include price in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.price).toBe(0);
    }));

    it('should include savingThrows as a Record in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.savingThrows).toBeTruthy();
      expect(typeof dto.savingThrows).toBe('object');
    }));

    it('should serialize selected saving throw as true in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.savingThrows['Constitution']).toBeTrue();
    }));

    it('should serialize unselected saving throw as false in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.savingThrows['Strength']).toBeFalse();
    }));

    it('should include classFeatures in the DTO', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.classFeatures).toBeTruthy();
    }));

    it('should not include spellcasting in classFeatures when spellcastingEnabled is false', fakeAsync(() => {
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.classFeatures.spellcasting).toBeUndefined();
    }));

    it('should include spellcasting in classFeatures when spellcastingEnabled is true', fakeAsync(() => {
      component.toggleSpellcasting();
      component.form.get('spellcastingAbility')!.setValue('Intelligence');
      component.form.get('spellcastingType')!.setValue('Full Caster');
      component.submit();
      tick();
      const dto = homebrewServiceSpy.createClass.calls.mostRecent().args[0];
      expect(dto.classFeatures.spellcasting).toBeTruthy();
    }));
  });

  // =========================================================================
  // 14. Submit — create mode error
  // =========================================================================

  describe('Submit — create mode error', () => {
    beforeEach(() => {
      makeValidForm(component);
    });

    it('should set error message from err.error.message', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      component.submit();
      tick();
      expect(component.error).toBe('Server error');
    }));

    it('should set error message from err.message when err.error.message is absent', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(
        throwError(() => ({ message: 'Network error' }))
      );
      component.submit();
      tick();
      expect(component.error).toBe('Network error');
    }));

    it('should set a fallback error message when no message is available', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(throwError(() => ({})));
      component.submit();
      tick();
      expect(component.error).toBeTruthy();
    }));

    it('should set submitting = false after error', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      component.submit();
      tick();
      expect(component.submitting).toBeFalse();
    }));

    it('should NOT navigate to /homebrew on error', fakeAsync(() => {
      homebrewServiceSpy.createClass.and.returnValue(
        throwError(() => ({ error: { message: 'Server error' } }))
      );
      component.submit();
      tick();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));
  });

  // =========================================================================
  // 16. Cancel
  // =========================================================================

  describe('Cancel', () => {
    it('should navigate to /homebrew when cancel() is called', () => {
      component.cancel();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/homebrew']);
    });
  });
});

// ===========================================================================
// 11. Edit mode — loadClassForEdit (separate describe with its own beforeEach)
// ===========================================================================

describe('HomebrewClassFormPage — Edit mode', () => {
  let component: HomebrewClassFormPage;
  let fixture: ComponentFixture<HomebrewClassFormPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    homebrewServiceSpy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
      'createClass',
      'updateClass',
      'getClass',
      'createClassFeature',
      'updateClassFeature',
      'deleteClassFeature',
      'getAllItems',
    ]);
    homebrewServiceSpy.createClass.and.returnValue(of({ id: 99 }));
    homebrewServiceSpy.updateClass.and.returnValue(of({ id: 42 }));
    homebrewServiceSpy.getClass.and.returnValue(of(makeEditClassObject()));
    homebrewServiceSpy.createClassFeature.and.returnValue(of({}));
    homebrewServiceSpy.updateClassFeature.and.returnValue(of({}));
    homebrewServiceSpy.deleteClassFeature.and.returnValue(of(undefined));
    homebrewServiceSpy.getAllItems.and.returnValue(of([]));

    routerSpy = createRouterMock();
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [HomebrewClassFormPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: ActivatedRoute, useValue: createActivatedRouteMock('42') },
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ role: 'USER' }), isPro: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewClassFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should enter edit mode when route has an id param', () => {
    expect(component.editMode).toBeTrue();
  });

  it('should store the edit id', () => {
    expect(component.editId).toBe('42');
  });

  it('should call getClass with the route id', () => {
    expect(homebrewServiceSpy.getClass).toHaveBeenCalledWith('42');
  });

  it('should patch name from loaded class', () => {
    expect(component.form.get('name')!.value).toBe('Artificer');
  });

  it('should patch description from loaded class', () => {
    expect(component.form.get('description')!.value).toBe('A tinkerer class');
  });

  it('should patch price from loaded class', () => {
    expect(component.form.get('price')!.value).toBe(5);
  });

  it('should patch hitDie from loaded class', () => {
    expect(component.form.get('hitDie')!.value).toBe('d8');
  });

  it('should patch primaryAbility from classFeatures', () => {
    expect(component.form.get('primaryAbility')!.value).toBe('Intelligence');
  });

  it('should patch subclassLevel from classFeatures', () => {
    expect(component.form.get('subclassLevel')!.value).toBe(3);
  });

  it('should patch startingEquipment from classFeatures', () => {
    expect(component.equipmentLegacyText).toBe('Thieves tools, a light crossbow');
  });

  it('should restore saving throw Constitution as true', () => {
    const stGroup = component.form.get('savingThrows') as FormGroup;
    expect(stGroup.get('Constitution')!.value).toBeTrue();
  });

  it('should restore saving throw Intelligence as true', () => {
    const stGroup = component.form.get('savingThrows') as FormGroup;
    expect(stGroup.get('Intelligence')!.value).toBeTrue();
  });

  it('should restore saving throw Strength as false', () => {
    const stGroup = component.form.get('savingThrows') as FormGroup;
    expect(stGroup.get('Strength')!.value).toBeFalse();
  });

  it('should restore weapon chips for standard profs', () => {
    // 'Simple Weapons' is at index 0 in WEAPON_PROFS
    const simpleIdx = WEAPON_PROFS.indexOf('Simple Weapons');
    expect(component.weaponChips[simpleIdx]).toBeTrue();
  });

  it('should restore custom weapon profs', () => {
    expect(component.customWeaponProfs).toContain('Custom Blade');
  });

  it('should restore armor chips for standard profs', () => {
    const lightIdx = ARMOR_PROFS.indexOf('Light Armor');
    expect(component.armorChips[lightIdx]).toBeTrue();
  });

  it('should restore custom tool profs', () => {
    expect(component.customToolProfs).toContain('Thieves Tools');
  });

  it('should restore damage resistance chips', () => {
    const fireIdx = DAMAGE_TYPES.indexOf('Fire');
    expect(component.damageResistances.at(fireIdx).value).toBeTrue();
  });

  it('should restore damage immunity chips', () => {
    const poisonIdx = DAMAGE_TYPES.indexOf('Poison');
    expect(component.damageImmunities.at(poisonIdx).value).toBeTrue();
  });

  it('should restore condition immunity chips', () => {
    const poisonedIdx = CONDITIONS.indexOf('Poisoned');
    expect(component.conditionImmunities.at(poisonedIdx).value).toBeTrue();
  });

  it('should rebuild features FormArray from loaded features', () => {
    expect(component.features.length).toBe(2);
  });

  it('should restore feature names', () => {
    expect(component.features.at(0).get('name')!.value).toBe('Magical Tinkering');
    expect(component.features.at(1).get('name')!.value).toBe('Infuse Item');
  });

  it('should restore feature ids', () => {
    expect(component.features.at(0).get('id')!.value).toBe(1);
    expect(component.features.at(1).get('id')!.value).toBe(2);
  });

  it('should store originalFeatures for reconciliation', () => {
    expect(component.originalFeatures.length).toBe(2);
    expect(component.originalFeatures[0].id).toBe(1);
    expect(component.originalFeatures[1].id).toBe(2);
  });

  it('should restore spellcastingEnabled to true', () => {
    expect(component.spellcastingEnabled).toBeTrue();
  });

  it('should restore spellcastingAbility', () => {
    expect(component.form.get('spellcastingAbility')!.value).toBe('Intelligence');
  });

  it('should restore spellcastingType', () => {
    expect(component.form.get('spellcastingType')!.value).toBe('Half Caster');
  });

  it('should restore ritualCasting', () => {
    expect(component.form.get('ritualCasting')!.value).toBeTrue();
  });

  it('should restore preparationStyle', () => {
    expect(component.form.get('preparationStyle')!.value).toBe('PREPARED');
  });

  it('should restore multiclassing prerequisites', () => {
    expect(component.multiclassingPrerequisites.length).toBe(1);
    expect(component.multiclassingPrerequisites.at(0).get('ability')!.value).toBe('Intelligence');
    expect(component.multiclassingPrerequisites.at(0).get('minScore')!.value).toBe(13);
  });

  it('should restore multiclassing armor chips', () => {
    const lightIdx = ARMOR_PROFS.indexOf('Light Armor');
    expect(component.multiclassingArmorChips[lightIdx]).toBeTrue();
    expect(component.multiclassingArmorGrants.at(lightIdx).value).toBeTrue();
  });

  it('should restore multiclassing weapon chips', () => {
    const simpleIdx = WEAPON_PROFS.indexOf('Simple Weapons');
    expect(component.multiclassingWeaponChips[simpleIdx]).toBeTrue();
    expect(component.multiclassingWeaponGrants.at(simpleIdx).value).toBeTrue();
  });

  it('should restore skill proficiencies choicePool', () => {
    expect(component.isSkillSelected('Arcana')).toBeTrue();
    expect(component.isSkillSelected('History')).toBeTrue();
  });

  it('should restore skillChoiceCount', () => {
    expect(component.form.get('skillChoiceCount')!.value).toBe(2);
  });

  // =========================================================================
  // 15. Submit — edit mode
  // =========================================================================

  describe('Submit — edit mode', () => {
    beforeEach(() => {
      makeValidForm(component);
    });

    it('should call updateClass instead of createClass', fakeAsync(() => {
      component.submit();
      tick();
      expect(homebrewServiceSpy.updateClass).toHaveBeenCalled();
      expect(homebrewServiceSpy.createClass).not.toHaveBeenCalled();
    }));

    it('should call updateClass with the edit id', fakeAsync(() => {
      component.submit();
      tick();
      expect(homebrewServiceSpy.updateClass.calls.mostRecent().args[0]).toBe('42');
    }));

    it('should navigate to /homebrew after successful update', fakeAsync(() => {
      component.submit();
      tick();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/homebrew']);
    }));

    it('should set error when updateClass fails', fakeAsync(() => {
      homebrewServiceSpy.updateClass.and.returnValue(
        throwError(() => ({ error: { message: 'Update failed' } }))
      );
      component.submit();
      tick();
      expect(component.error).toBe('Update failed');
    }));
  });
});

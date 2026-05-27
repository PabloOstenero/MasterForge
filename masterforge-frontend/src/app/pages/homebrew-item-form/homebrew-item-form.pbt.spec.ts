/**
 * Property-Based Tests for buildItemProperties() — Item Properties Serialization
 *
 * Feature: homebrew-item-form
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * Properties tested:
 *   Property 1: Type isolation — Weapon (no armor/shield/potion/ammunition/gear keys)
 *   Property 2: Type isolation — Armor (no weapon/shield/potion/ammunition/gear keys)
 *   Property 3: Null omission for optional string and numeric fields
 *   Property 4: Shield acBonus invariant (always present for any numeric value)
 *   Property 5: Armor baseAc invariant (always present for any numeric value ≥ 1)
 *   Property 6: addAbility() increments the FormArray by exactly 1
 *   Property 7: removeAbility(i) removes exactly the entry at index i
 *
 * Each test runs a minimum of 100 iterations with randomly generated data.
 */

import * as fc from 'fast-check';
import { FormBuilder } from '@angular/forms';
import {
  buildItemProperties,
  ITEM_TYPES,
  MAGICAL_ITEM_TYPES,
  ITEM_RARITIES,
  DAMAGE_TYPES,
  WEAPON_PROPERTIES,
  MAGICAL_BONUSES,
  ARMOR_CATEGORIES,
  ABILITY_STATS,
  WeaponFormValues,
  ArmorFormValues,
  ShieldFormValues,
  PotionFormValues,
  MagicalFormValues,
  AmmunitionFormValues,
  GearFormValues,
  HomebrewItemFormPage,
} from './homebrew-item-form.page';
import {
  SpecialAbilityEntry
} from '../../models/homebrew.models';

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for WeaponFormValues */
const weaponFormArb: fc.Arbitrary<WeaponFormValues> = fc.record({
  damageDiceCount:  fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
  damageDieType:    fc.constantFrom('d4', 'd6', 'd8', 'd10', 'd12', 'd20'),
  damageBonus:      fc.option(fc.integer({ min: -5, max: 10 }), { nil: null }),
  damageType:       fc.tuple(
    ...Array.from({ length: DAMAGE_TYPES.length }, () => fc.boolean())
  ).map((arr) => {
    // Enforce single-select: at most one true
    const firstTrue = arr.indexOf(true);
    return arr.map((v, i) => (firstTrue === -1 ? false : i === firstTrue));
  }),
  weaponProperties: fc.tuple(
    ...Array.from({ length: WEAPON_PROPERTIES.length }, () => fc.boolean())
  ).map((arr) => [...arr]),
  rangeNormal:        fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
  rangeLong:          fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 20 })),
  versatileDiceCount: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
  versatileDieType:   fc.constantFrom('d4', 'd6', 'd8', 'd10', 'd12', 'd20'),
  stat:               fc.constantFrom(...ABILITY_STATS),
  magicalBonus:       fc.constantFrom(...MAGICAL_BONUSES),
  attackBonus:        fc.option(fc.integer({ min: -5, max: 20 }), { nil: null }),
});

/** Arbitrary for ArmorFormValues */
const armorFormArb: fc.Arbitrary<ArmorFormValues> = fc.record({
  armorCategory:      fc.constantFrom(...ARMOR_CATEGORIES),
  baseAc:             fc.integer({ min: 1, max: 30 }),
  dexBonus:           fc.boolean(),
  dexLimit:           fc.option(fc.integer({ min: 0, max: 10 }), { nil: null }),
  stealthDisadvantage: fc.boolean(),
  strengthRequirement: fc.option(fc.integer({ min: 0, max: 30 }), { nil: null }),
  magicalBonus:       fc.constantFrom(...MAGICAL_BONUSES),
});

/** Arbitrary for ShieldFormValues */
const shieldFormArb: fc.Arbitrary<ShieldFormValues> = fc.record({
  acBonus:      fc.integer({ min: 0, max: 10 }),
  magicalBonus: fc.constantFrom(...MAGICAL_BONUSES),
});

/** Arbitrary for PotionFormValues */
const potionFormArb: fc.Arbitrary<PotionFormValues> = fc.record({
  healingDiceCount:  fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
  healingDieType:    fc.constantFrom('d4', 'd6', 'd8', 'd10', 'd12', 'd20'),
  healingAmount:     fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  effectDescription: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 100 })),
});

/** Arbitrary for MagicalFormValues */
const magicalFormArb: fc.Arbitrary<MagicalFormValues> = fc.record({
  charges:           fc.option(fc.integer({ min: 0, max: 20 }), { nil: null }),
  recharge:          fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 40 })),
  rechargeDiceCount: fc.option(fc.integer({ min: 1, max: 10 }), { nil: null }),
  rechargeDieType:   fc.constantFrom('d4', 'd6', 'd8', 'd10', 'd12', 'd20'),
  rechargeBonus:     fc.option(fc.integer({ min: -5, max: 10 }), { nil: null }),
  attunementBy:      fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 60 })),
});

/** Arbitrary for AmmunitionFormValues */
const ammunitionFormArb: fc.Arbitrary<AmmunitionFormValues> = fc.record({
  damageBonus:  fc.option(fc.integer({ min: -5, max: 10 }), { nil: null }),
  magicalBonus: fc.constantFrom(...MAGICAL_BONUSES),
});

/** Arbitrary for GearFormValues */
const gearFormArb: fc.Arbitrary<GearFormValues> = fc.record({
  gearDescription: fc.oneof(fc.constant(''), fc.string({ minLength: 1, maxLength: 100 })),
  valueGp:         fc.option(fc.integer({ min: 0, max: 100000 }), { nil: null }),
});

/** Arbitrary for SpecialAbilityEntry */
const specialAbilityArb: fc.Arbitrary<SpecialAbilityEntry> = fc.record({
  name:        fc.string({ minLength: 1, maxLength: 60 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  levelRequired: fc.integer({ min: 1, max: 20 }),
});

/** Default/empty form values used when a section is not under test */
const defaultWeapon: WeaponFormValues = {
  damageDiceCount: null, damageDieType: 'd6', damageBonus: null,
  damageType: Array(DAMAGE_TYPES.length).fill(false),
  weaponProperties: Array(WEAPON_PROPERTIES.length).fill(false),
  rangeNormal: '', rangeLong: '',
  versatileDiceCount: null, versatileDieType: 'd8',
  stat: 'str', magicalBonus: 0, attackBonus: null,
};

const defaultArmor: ArmorFormValues = {
  armorCategory: 'Light', baseAc: 10, dexBonus: true, dexLimit: null,
  stealthDisadvantage: false, strengthRequirement: null, magicalBonus: 0,
};

const defaultShield: ShieldFormValues = { acBonus: 2, magicalBonus: 0 };

const defaultPotion: PotionFormValues = { healingDiceCount: null, healingDieType: 'd4', healingAmount: null, effectDescription: '' };

const defaultMagical: MagicalFormValues = { 
  charges: null, 
  recharge: '', 
  rechargeDiceCount: null, 
  rechargeDieType: 'd4', 
  rechargeBonus: null, 
  attunementBy: '' 
};

const defaultAmmunition: AmmunitionFormValues = { damageBonus: null, magicalBonus: 0 };

const defaultGear: GearFormValues = { gearDescription: '', valueGp: null };

const defaultBuffs: any = {
  bonusStr: null, bonusDex: null, bonusCon: null, bonusInt: null, bonusWis: null, bonusCha: null,
  overrideStr: null, overrideDex: null, overrideCon: null, overrideInt: null, overrideWis: null, overrideCha: null,
  bonusMaxHp: null
};

// ---------------------------------------------------------------------------
// Property-Based Test Suite — buildItemProperties()
// ---------------------------------------------------------------------------

describe('buildItemProperties() — Property-Based Tests', () => {

  // -------------------------------------------------------------------------
  // Property 1: Type isolation — Weapon
  // -------------------------------------------------------------------------

  it('Property 1: buildItemProperties with itemType=Weapon returns no armor/shield/potion/ammunition/gear keys', () => {
    // Feature: homebrew-item-form, Property 1: Type isolation — Weapon
    // **Validates: Requirements 11.2, 11.4**

    const armorOnlyKeys = [
      'baseAc', 'dexBonus', 'dexLimit', 'stealthDisadvantage', 'strengthRequirement', 'armorCategory',
    ];
    const shieldOnlyKeys = ['acBonus'];
    const potionOnlyKeys = ['healingDiceCount', 'healingDieType', 'healingAmount', 'effectDescription'];
    const ammunitionOnlyKeys = ['damageBonus'];
    const gearOnlyKeys = ['gearDescription'];

    const forbiddenKeys = [
      ...armorOnlyKeys,
      ...shieldOnlyKeys,
      ...potionOnlyKeys,
      ...ammunitionOnlyKeys,
      ...gearOnlyKeys,
    ];

    fc.assert(
      fc.property(
        weaponFormArb,
        fc.array(specialAbilityArb, { maxLength: 5 }),
        (weapon, abilities) => {
          const result = buildItemProperties(
            'Weapon',
            weapon,
            defaultArmor,
            defaultShield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            abilities,
          );

          for (const key of forbiddenKeys) {
            expect(Object.prototype.hasOwnProperty.call(result, key))
              .withContext(`Key "${key}" should not appear in Weapon output`)
              .toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Type isolation — Armor
  // -------------------------------------------------------------------------

  it('Property 2: buildItemProperties with itemType=Armor returns no weapon/shield/potion/ammunition/gear keys', () => {
    // Feature: homebrew-item-form, Property 2: Type isolation — Armor
    // **Validates: Requirements 11.2, 11.5**

    const weaponOnlyKeys = [
      'damageDiceCount', 'damageDieType', 'damageBonus', 'damageType', 'weaponProperties',
      'rangeNormal', 'rangeLong', 'versatileDiceCount', 'versatileDieType', 'stat', 'attackBonus',
    ];
    const shieldOnlyKeys = ['acBonus'];
    const potionOnlyKeys = ['healingDiceCount', 'healingDieType', 'healingAmount', 'effectDescription'];
    const ammunitionOnlyKeys = ['damageBonus'];
    const gearOnlyKeys = ['gearDescription'];

    const forbiddenKeys = [
      ...weaponOnlyKeys,
      ...shieldOnlyKeys,
      ...potionOnlyKeys,
      ...ammunitionOnlyKeys,
      ...gearOnlyKeys,
    ];

    fc.assert(
      fc.property(
        armorFormArb,
        fc.array(specialAbilityArb, { maxLength: 5 }),
        (armor, abilities) => {
          const result = buildItemProperties(
            'Armor',
            defaultWeapon,
            armor,
            defaultShield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            abilities,
          );

          for (const key of forbiddenKeys) {
            expect(Object.prototype.hasOwnProperty.call(result, key))
              .withContext(`Key "${key}" should not appear in Armor output`)
              .toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Null omission for optional fields
  // -------------------------------------------------------------------------

  it('Property 3: buildItemProperties omits optional string fields set to "" and optional numeric fields set to null', () => {
    // Feature: homebrew-item-form, Property 3: Null omission for optional string and numeric fields
    // **Validates: Requirements 11.3**

    /**
     * Keys that are always serialized by the function regardless of their value
     * (chip serialization fields, booleans, and required numeric fields).
     * These are intentionally excluded from the null-omission check.
     */
    const alwaysIncludedKeys = new Set([
      // Weapon chip fields — always serialized (may be '' when nothing selected)
      'damageType', 'weaponProperties',
      // Weapon required fields
      'stat', 'magicalBonus',
      // Armor boolean fields — always included when section is active
      'dexBonus', 'stealthDisadvantage',
      // Armor required numeric
      'baseAc', 'armorCategory',
      // Shield required numeric
      'acBonus',
      // Ammunition required
      'magicalBonus',
    ]);

    /** Weapon with all optional fields cleared */
    const emptyWeapon: WeaponFormValues = {
      damageDiceCount: null, damageDieType: 'd6', damageBonus: null,
      damageType: Array(DAMAGE_TYPES.length).fill(false),
      weaponProperties: Array(WEAPON_PROPERTIES.length).fill(false),
      rangeNormal: '', rangeLong: '',
      versatileDiceCount: null, versatileDieType: 'd8',
      stat: 'str', magicalBonus: 0, attackBonus: null,
    };

    /** Armor with all optional fields cleared */
    const emptyArmor: ArmorFormValues = {
      armorCategory: 'Light',
      baseAc: 10,
      dexBonus: true,
      dexLimit: null,
      stealthDisadvantage: false,
      strengthRequirement: null,
      magicalBonus: 0,
    };

    /** Potion with all optional fields cleared */
    const emptyPotion: PotionFormValues = {
      healingDiceCount: null, healingDieType: 'd4',
      healingAmount: null, effectDescription: '',
    };

    /** Magical with all optional fields cleared */
    const emptyMagical: MagicalFormValues = {
      charges: null,
      recharge: '',
      rechargeDiceCount: null,
      rechargeDieType: 'd4',
      rechargeBonus: null,
      attunementBy: '',
    };

    /** Ammunition with all optional fields cleared */
    const emptyAmmunition: AmmunitionFormValues = {
      damageBonus: null,
      magicalBonus: 0,
    };

    /** Gear with all optional fields cleared */
    const emptyGear: GearFormValues = {
      gearDescription: '',
      valueGp: null,
    };

    // Test each item type with all optional fields empty/null
    const itemTypesToTest = [
      'Weapon', 'Armor', 'Shield', 'Potion',
      'Wondrous Item', 'Ammunition', 'Adventuring Gear',
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...itemTypesToTest),
        (itemType) => {
          const result = buildItemProperties(
            itemType,
            emptyWeapon,
            emptyArmor,
            defaultShield,
            emptyPotion,
            emptyMagical,
            emptyAmmunition,
            emptyGear,
            defaultBuffs,
            [],
          );

          // For keys that are NOT always-included, no value should be null, undefined, or empty string
          for (const [key, value] of Object.entries(result)) {
            if (alwaysIncludedKeys.has(key)) continue;

            expect(value)
              .withContext(`Key "${key}" should not have a null/undefined/empty value`)
              .not.toBeNull();
            expect(value)
              .withContext(`Key "${key}" should not be undefined`)
              .not.toBeUndefined();
            expect(value)
              .withContext(`Key "${key}" should not be empty string`)
              .not.toBe('');
          }

          // Verify that known optional keys are absent when their values are empty/null
          const optionalStringKeysByType: Record<string, string[]> = {
            'Weapon':          ['damageDiceCount', 'damageDieType', 'damageBonus', 'rangeNormal', 'rangeLong', 'versatileDiceCount', 'versatileDieType', 'attackBonus'],
            'Armor':           ['dexLimit', 'strengthRequirement'],
            'Potion':          ['healingDiceCount', 'healingDieType', 'healingAmount', 'effectDescription'],
            'Wondrous Item':   ['charges', 'recharge', 'attunementBy'],
            'Ammunition':      ['damageBonus'],
            'Adventuring Gear':['gearDescription', 'valueGp'],
          };

          const optionalKeys = optionalStringKeysByType[itemType] ?? [];
          for (const key of optionalKeys) {
            expect(Object.prototype.hasOwnProperty.call(result, key))
              .withContext(`Optional key "${key}" should be absent when its value is empty/null (itemType=${itemType})`)
              .toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Shield acBonus invariant
  // -------------------------------------------------------------------------

  it('Property 4: buildItemProperties with itemType=Shield always includes the acBonus key for any numeric value', () => {
    // Feature: homebrew-item-form, Property 4: Shield acBonus invariant (always present for any numeric value)
    // **Validates: Requirements 5.3, 11.6**

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.constantFrom(...MAGICAL_BONUSES),
        (acBonus, magicalBonus) => {
          const shield: ShieldFormValues = { acBonus, magicalBonus };

          const result = buildItemProperties(
            'Shield',
            defaultWeapon,
            defaultArmor,
            shield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            [],
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'acBonus'))
            .withContext(`acBonus key must always be present in Shield output (acBonus=${acBonus})`)
            .toBe(true);
          expect(result['acBonus']).toBe(acBonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: Armor baseAc invariant
  // -------------------------------------------------------------------------

  it('Property 5: buildItemProperties with itemType=Armor always includes the baseAc key for any numeric value ≥ 1', () => {
    // Feature: homebrew-item-form, Property 5: Armor baseAc invariant (always present for any numeric value ≥ 1)
    // **Validates: Requirements 4.4, 11.5**

    fc.assert(
      fc.property(
        armorFormArb,
        (armor) => {
          // Ensure baseAc is always ≥ 1 (already enforced by armorFormArb)
          const result = buildItemProperties(
            'Armor',
            defaultWeapon,
            armor,
            defaultShield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            [],
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'baseAc'))
            .withContext(`baseAc key must always be present in Armor output (baseAc=${armor.baseAc})`)
            .toBe(true);
          expect(result['baseAc']).toBe(armor.baseAc);
        }
      ),
      { numRuns: 100 }
    );
  });

});

// ---------------------------------------------------------------------------
// Property-Based Tests for FormArray helpers — addAbility / removeAbility
// ---------------------------------------------------------------------------

describe('HomebrewItemFormPage FormArray helpers — Property-Based Tests', () => {

  /**
   * Creates a minimal HomebrewItemFormPage instance without Angular TestBed,
   * using FormBuilder directly so we can test the FormArray helpers in isolation.
   */
  function createComponent(): HomebrewItemFormPage {
    const fb = new FormBuilder();
    const homebrewServiceStub: any = {};
    const routerStub: any = {};
    const routeStub: any = { snapshot: { paramMap: { get: () => null } } };
    const authServiceStub: any = { getCurrentUser: () => null, isPro: () => false };
    const component = new HomebrewItemFormPage(fb, homebrewServiceStub, routerStub, routeStub, authServiceStub);
    component.ngOnInit();
    return component;
  }

  // -------------------------------------------------------------------------
  // Property 6: addAbility() increments the FormArray by exactly 1
  // -------------------------------------------------------------------------

  it('Property 6: addAbility() increments the abilities FormArray length by exactly 1', () => {
    // Feature: homebrew-item-form, Property 6: addAbility() increments the FormArray by exactly 1
    // **Validates: Requirements 10.3**

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (initialCount) => {
        const component = createComponent();

        // Pre-populate the FormArray with initialCount abilities
        for (let i = 0; i < initialCount; i++) {
          component.addAbility();
        }

        expect(component.abilities.length).toBe(initialCount);

        // Call addAbility() once and verify the count increases by exactly 1
        component.addAbility();

        expect(component.abilities.length).toBe(initialCount + 1);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: removeAbility(i) removes exactly the entry at index i
  // -------------------------------------------------------------------------

  it('Property 7: removeAbility(i) removes exactly the entry at index i, resulting in N-1 entries in original order', () => {
    // Feature: homebrew-item-form, Property 7: removeAbility(i) removes exactly the entry at index i
    // **Validates: Requirements 10.4**

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }).chain((n) =>
          fc.tuple(
            fc.constant(n),
            fc.integer({ min: 0, max: n - 1 }),
          )
        ),
        ([n, indexToRemove]) => {
          const component = createComponent();

          // Pre-populate the FormArray with n abilities, each with a unique name
          for (let i = 0; i < n; i++) {
            component.addAbility();
            // Set a unique name so we can identify which entry was removed
            component.abilities.at(i).get('name')?.setValue(`Ability-${i}`);
          }

          // Capture the name of the entry that should be removed
          const removedName = component.abilities.at(indexToRemove).get('name')?.value as string;

          // Capture names of all entries that should remain (in order)
          const expectedRemainingNames = component.abilities.controls
            .filter((_, idx) => idx !== indexToRemove)
            .map((ctrl) => ctrl.get('name')?.value as string);

          // Remove the entry at indexToRemove
          component.removeAbility(indexToRemove);

          // Verify the length decreased by exactly 1
          expect(component.abilities.length).toBe(n - 1);

          // Verify the removed entry's name is no longer present
          const remainingNames = component.abilities.controls.map(
            (ctrl) => ctrl.get('name')?.value as string
          );
          expect(remainingNames).toEqual(expectedRemainingNames);
          expect(remainingNames).not.toContain(removedName);
        }
      ),
      { numRuns: 100 }
    );
  });

});

// ---------------------------------------------------------------------------
// Property-Based Tests for showsSpecialAbilities and extended buildItemProperties
// ---------------------------------------------------------------------------

describe('homebrew-item-special-abilities — Property-Based Tests', () => {

  /**
   * Creates a minimal HomebrewItemFormPage instance without Angular TestBed,
   * using FormBuilder directly so we can test the getter in isolation.
   */
  function createComponent(): HomebrewItemFormPage {
    const fb = new FormBuilder();
    const homebrewServiceStub: any = {};
    const routerStub: any = {};
    const routeStub: any = { snapshot: { paramMap: { get: () => null } } };
    const authServiceStub: any = { getCurrentUser: () => null, isPro: () => false };
    const component = new HomebrewItemFormPage(fb, homebrewServiceStub, routerStub, routeStub, authServiceStub);
    component.ngOnInit();
    return component;
  }

  /** The 8 types that should show the special abilities section */
  const SPECIAL_ABILITY_TYPES = ['Weapon', 'Armor', 'Shield', 'Wondrous Item', 'Ring', 'Rod', 'Staff', 'Wand'];

  // -------------------------------------------------------------------------
  // Property 8: showsSpecialAbilities returns true iff type is a Special_Ability_Type
  // -------------------------------------------------------------------------

  it('Property 8: showsSpecialAbilities returns true iff type is a Special_Ability_Type', () => {
    // Feature: homebrew-item-special-abilities, Property 8: showsSpecialAbilities returns true iff type is a Special_Ability_Type
    // **Validates: Requirements 4.1, 4.2**

    fc.assert(
      fc.property(
        fc.constantFrom(...ITEM_TYPES),
        (type) => {
          const component = createComponent();
          // Set the item type via the form control
          component['form'].get('type')?.setValue(type);

          const expected = SPECIAL_ABILITY_TYPES.includes(type);
          expect(component.showsSpecialAbilities)
            .withContext(`showsSpecialAbilities should be ${expected} for type "${type}"`)
            .toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 9: buildItemProperties with Weapon and non-empty specialAbilities includes the key
  // -------------------------------------------------------------------------

  it('Property 9: buildItemProperties with Weapon and non-empty specialAbilities includes the key', () => {
    // Feature: homebrew-item-special-abilities, Property 9: buildItemProperties with Weapon and non-empty specialAbilities includes the key
    // **Validates: Requirements 2.1, 6.1**

    const specialAbilityArb: fc.Arbitrary<SpecialAbilityEntry> = fc.record({
      name:        fc.string({ minLength: 1, maxLength: 60 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      levelRequired: fc.integer({ min: 1, max: 20 }),
    });

    fc.assert(
      fc.property(
        weaponFormArb,
        fc.array(specialAbilityArb, { minLength: 1, maxLength: 5 }),
        (weapon, abilities) => {
          const result = buildItemProperties(
            'Weapon',
            weapon,
            defaultArmor,
            defaultShield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            abilities,
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'specialAbilities'))
            .withContext('specialAbilities key must be present in Weapon output when abilities is non-empty')
            .toBe(true);
          expect(result['specialAbilities']).toEqual(abilities);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 10: buildItemProperties with Armor and non-empty specialAbilities includes the key
  // -------------------------------------------------------------------------

  it('Property 10: buildItemProperties with Armor and non-empty specialAbilities includes the key', () => {
    // Feature: homebrew-item-special-abilities, Property 10: buildItemProperties with Armor and non-empty specialAbilities includes the key
    // **Validates: Requirements 2.2, 6.2**

    const specialAbilityArb: fc.Arbitrary<SpecialAbilityEntry> = fc.record({
      name:        fc.string({ minLength: 1, maxLength: 60 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      levelRequired: fc.integer({ min: 1, max: 20 }),
    });

    fc.assert(
      fc.property(
        armorFormArb,
        fc.array(specialAbilityArb, { minLength: 1, maxLength: 5 }),
        (armor, abilities) => {
          const result = buildItemProperties(
            'Armor',
            defaultWeapon,
            armor,
            defaultShield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            abilities,
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'specialAbilities'))
            .withContext('specialAbilities key must be present in Armor output when abilities is non-empty')
            .toBe(true);
          expect(result['specialAbilities']).toEqual(abilities);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 11: buildItemProperties with Shield and non-empty specialAbilities includes the key
  // -------------------------------------------------------------------------

  it('Property 11: buildItemProperties with Shield and non-empty specialAbilities includes the key', () => {
    // Feature: homebrew-item-special-abilities, Property 11: buildItemProperties with Shield and non-empty specialAbilities includes the key
    // **Validates: Requirements 2.3, 6.3**

    const specialAbilityArb: fc.Arbitrary<SpecialAbilityEntry> = fc.record({
      name:        fc.string({ minLength: 1, maxLength: 60 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      levelRequired: fc.integer({ min: 1, max: 20 }),
    });

    fc.assert(
      fc.property(
        shieldFormArb,
        fc.array(specialAbilityArb, { minLength: 1, maxLength: 5 }),
        (shield, abilities) => {
          const result = buildItemProperties(
            'Shield',
            defaultWeapon,
            defaultArmor,
            shield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            abilities,
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'specialAbilities'))
            .withContext('specialAbilities key must be present in Shield output when abilities is non-empty')
            .toBe(true);
          expect(result['specialAbilities']).toEqual(abilities);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 12: buildItemProperties with Weapon/Armor/Shield and empty specialAbilities omits the key
  // -------------------------------------------------------------------------

  it('Property 12: buildItemProperties with Weapon/Armor/Shield and empty specialAbilities omits the key', () => {
    // Feature: homebrew-item-special-abilities, Property 12: buildItemProperties with Weapon/Armor/Shield and empty specialAbilities omits the key
    // **Validates: Requirements 2.4, 6.4**

    fc.assert(
      fc.property(
        fc.constantFrom('Weapon', 'Armor', 'Shield'),
        weaponFormArb,
        armorFormArb,
        shieldFormArb,
        (itemType, weapon, armor, shield) => {
          const result = buildItemProperties(
            itemType,
            weapon,
            armor,
            shield,
            defaultPotion,
            defaultMagical,
            defaultAmmunition,
            defaultGear,
            defaultBuffs,
            [], // empty specialAbilities
          );

          expect(Object.prototype.hasOwnProperty.call(result, 'specialAbilities'))
            .withContext(`specialAbilities key must be absent in ${itemType} output when abilities is empty`)
            .toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

});

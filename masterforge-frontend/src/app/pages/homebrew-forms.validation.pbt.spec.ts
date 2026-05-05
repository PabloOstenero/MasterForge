/**
 * Property-Based Tests for All Homebrew Creation Forms — Form Validation
 *
 * Feature: homebrew-content-creation
 * Property 3: Form validation accepts valid inputs and rejects invalid ones
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * **Validates: Requirements 3.2, 4.2, 5.2, 6.2, 7.2, 10.2**
 *
 * Strategy:
 *   For each form type (Class, Subclass, Race, Monster, Spell, Item), use
 *   fast-check arbitraries to generate random inputs. Build a FormGroup
 *   programmatically with the same validators as the actual form component.
 *   Assert that FormGroup.valid matches whether all field constraints are
 *   satisfied.
 *
 *   This property test verifies that the validation logic is consistent:
 *     - Valid inputs (all constraints satisfied) → form.valid === true
 *     - Invalid inputs (any constraint violated) → form.valid === false
 *
 *   Each test runs a minimum of 100 iterations with randomly generated data.
 */

import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import * as fc from 'fast-check';

import { SAVING_THROW_KEYS, atLeastOneTrue } from './homebrew-class-form/homebrew-class-form.page';
import { ABILITY_BONUS_KEYS } from './homebrew-race-form/homebrew-race-form.page';
import { MONSTER_SIZES, MONSTER_ABILITY_KEYS } from './homebrew-monster-form/homebrew-monster-form.page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if all field constraints are satisfied for the given form data.
 * This is the "oracle" function that defines what "valid" means for each form.
 */
function isValidClassData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (data.hitDie == null || data.hitDie < 4 || data.hitDie > 12) return false;
  if (data.price == null || data.price < 0) return false;
  // At least one saving throw must be true
  const savingThrows = data.savingThrows || {};
  const hasAtLeastOne = Object.values(savingThrows).some((v) => v === true);
  if (!hasAtLeastOne) return false;
  return true;
}

function isValidSubclassData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (!data.description || data.description.trim() === '') return false;
  if (data.parentClassId == null) return false;
  return true;
}

function isValidRaceData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (data.price == null || data.price < 0) return false;
  // All six ability bonuses must be present and in range [-10, 10]
  for (const key of ABILITY_BONUS_KEYS) {
    const val = data[key];
    if (val == null || val < -10 || val > 10) return false;
  }
  return true;
}

function isValidMonsterData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (!data.type || data.type.trim() === '') return false;
  if (!data.size || !MONSTER_SIZES.includes(data.size as any)) return false;
  if (data.armorClass == null || data.armorClass < 1 || data.armorClass > 30) return false;
  if (data.hitPoints == null || data.hitPoints < 1) return false;
  if (!data.speed || data.speed.trim() === '') return false;
  // All six ability scores must be in range [1, 30]
  for (const key of MONSTER_ABILITY_KEYS) {
    const val = data[key];
    if (val == null || val < 1 || val > 30) return false;
  }
  if (data.challengeRating == null || data.challengeRating < 0) return false;
  if (data.xp == null || data.xp < 0) return false;
  return true;
}

function isValidSpellData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (data.level == null || data.level < 0 || data.level > 9) return false;
  if (!data.school || data.school.trim() === '') return false;
  if (!data.description || data.description.trim() === '') return false;
  return true;
}

function isValidItemData(data: any): boolean {
  if (!data.name || data.name.trim() === '') return false;
  if (!data.type || data.type.trim() === '') return false;
  if (data.weight == null || data.weight < 0) return false;
  // properties is optional — no validation needed
  return true;
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

// --- Class form arbitraries ---

const savingThrowsArb = fc.record({
  strength: fc.boolean(),
  dexterity: fc.boolean(),
  constitution: fc.boolean(),
  intelligence: fc.boolean(),
  wisdom: fc.boolean(),
  charisma: fc.boolean(),
});

const classFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  hitDie: fc.oneof(
    fc.constant(null),
    fc.integer({ min: -5, max: 20 }) // includes invalid values
  ),
  savingThrows: savingThrowsArb,
  price: fc.oneof(
    fc.constant(null),
    fc.double({ min: -10, max: 1000, noNaN: true })
  ),
});

// --- Subclass form arbitraries ---

const subclassFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  parentClassId: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 1, max: 100 })
  ),
});

// --- Race form arbitraries ---

const raceFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  price: fc.oneof(
    fc.constant(null),
    fc.double({ min: -10, max: 1000, noNaN: true })
  ),
  bonusStr: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
  bonusDex: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
  bonusCon: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
  bonusInt: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
  bonusWis: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
  bonusCha: fc.oneof(fc.constant(null), fc.integer({ min: -15, max: 15 })),
});

// --- Monster form arbitraries ---

const monsterFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  type: fc.string({ minLength: 0, maxLength: 60 }),
  size: fc.oneof(
    fc.constant(''),
    fc.constantFrom(...MONSTER_SIZES),
    fc.string({ minLength: 1, maxLength: 20 }) // includes invalid sizes
  ),
  armorClass: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  hitPoints: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 1000 })),
  speed: fc.string({ minLength: 0, maxLength: 60 }),
  str: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  dex: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  con: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  intStat: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  wis: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  cha: fc.oneof(fc.constant(null), fc.integer({ min: -5, max: 40 })),
  challengeRating: fc.oneof(fc.constant(null), fc.double({ min: -5, max: 30, noNaN: true })),
  xp: fc.oneof(fc.constant(null), fc.integer({ min: -100, max: 100000 })),
});

// --- Spell form arbitraries ---

const spellFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  level: fc.oneof(fc.constant(null), fc.integer({ min: -2, max: 12 })),
  school: fc.string({ minLength: 0, maxLength: 60 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
});

// --- Item form arbitraries ---

const itemFormDataArb = fc.record({
  name: fc.string({ minLength: 0, maxLength: 60 }),
  type: fc.string({ minLength: 0, maxLength: 60 }),
  weight: fc.oneof(fc.constant(null), fc.double({ min: -10, max: 1000, noNaN: true })),
  properties: fc.oneof(fc.constant(null), fc.constant({}), fc.object()),
});

// ---------------------------------------------------------------------------
// Form builders (replicate the actual component logic)
// ---------------------------------------------------------------------------

function buildClassForm(fb: FormBuilder, data: any): FormGroup {
  const savingThrowsGroup = fb.group(
    SAVING_THROW_KEYS.reduce((acc, key) => ({ ...acc, [key]: [data.savingThrows?.[key] ?? false] }), {}),
    { validators: atLeastOneTrue }
  );

  return fb.group({
    name: [data.name ?? '', Validators.required],
    hitDie: [data.hitDie ?? null, [Validators.required, Validators.min(4), Validators.max(12)]],
    savingThrows: savingThrowsGroup,
    price: [data.price ?? null, [Validators.required, Validators.min(0)]],
  });
}

function buildSubclassForm(fb: FormBuilder, data: any): FormGroup {
  return fb.group({
    name: [data.name ?? '', Validators.required],
    description: [data.description ?? '', Validators.required],
    parentClassId: [data.parentClassId ?? null, Validators.required],
  });
}

function buildRaceForm(fb: FormBuilder, data: any): FormGroup {
  const abilityBonusControls = ABILITY_BONUS_KEYS.reduce(
    (acc, key) => ({
      ...acc,
      [key]: [data[key] ?? null, [Validators.required, Validators.min(-10), Validators.max(10)]],
    }),
    {} as Record<string, any>
  );

  return fb.group({
    name: [data.name ?? '', Validators.required],
    price: [data.price ?? null, [Validators.required, Validators.min(0)]],
    ...abilityBonusControls,
  });
}

function buildMonsterForm(fb: FormBuilder, data: any): FormGroup {
  const abilityControls = MONSTER_ABILITY_KEYS.reduce(
    (acc, key) => ({
      ...acc,
      [key]: [data[key] ?? null, [Validators.required, Validators.min(1), Validators.max(30)]],
    }),
    {} as Record<string, any>
  );

  return fb.group({
    name: [data.name ?? '', Validators.required],
    type: [data.type ?? '', Validators.required],
    size: [data.size ?? '', Validators.required],
    armorClass: [data.armorClass ?? null, [Validators.required, Validators.min(1), Validators.max(30)]],
    hitPoints: [data.hitPoints ?? null, [Validators.required, Validators.min(1)]],
    speed: [data.speed ?? '', Validators.required],
    ...abilityControls,
    challengeRating: [data.challengeRating ?? null, [Validators.required, Validators.min(0)]],
    xp: [data.xp ?? null, [Validators.required, Validators.min(0)]],
  });
}

function buildSpellForm(fb: FormBuilder, data: any): FormGroup {
  return fb.group({
    name: [data.name ?? '', Validators.required],
    level: [data.level ?? null, [Validators.required, Validators.min(0), Validators.max(9)]],
    school: [data.school ?? '', Validators.required],
    description: [data.description ?? '', Validators.required],
  });
}

function buildItemForm(fb: FormBuilder, data: any): FormGroup {
  return fb.group({
    name: [data.name ?? '', Validators.required],
    type: [data.type ?? '', Validators.required],
    weight: [data.weight ?? null, [Validators.required, Validators.min(0)]],
    properties: [data.properties ?? null],
  });
}

// ---------------------------------------------------------------------------
// Property-Based Test Suite
// ---------------------------------------------------------------------------

describe('Homebrew Forms — Property 3: Form validation accepts valid inputs and rejects invalid ones', () => {
  // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones

  let fb: FormBuilder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fb = TestBed.inject(FormBuilder);
  });

  // -------------------------------------------------------------------------
  // P3a — Class form validation
  // -------------------------------------------------------------------------

  it('P3a — Class form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 3.2**

    fc.assert(
      fc.property(classFormDataArb, (data) => {
        const form = buildClassForm(fb, data);
        const expectedValid = isValidClassData(data);

        expect(form.valid)
          .withContext(
            `Class form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P3b — Subclass form validation
  // -------------------------------------------------------------------------

  it('P3b — Subclass form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 4.2**

    fc.assert(
      fc.property(subclassFormDataArb, (data) => {
        const form = buildSubclassForm(fb, data);
        const expectedValid = isValidSubclassData(data);

        expect(form.valid)
          .withContext(
            `Subclass form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P3c — Race form validation
  // -------------------------------------------------------------------------

  it('P3c — Race form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 5.2**

    fc.assert(
      fc.property(raceFormDataArb, (data) => {
        const form = buildRaceForm(fb, data);
        const expectedValid = isValidRaceData(data);

        expect(form.valid)
          .withContext(
            `Race form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P3d — Monster form validation
  // -------------------------------------------------------------------------

  it('P3d — Monster form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 6.2**

    fc.assert(
      fc.property(monsterFormDataArb, (data) => {
        const form = buildMonsterForm(fb, data);
        const expectedValid = isValidMonsterData(data);

        expect(form.valid)
          .withContext(
            `Monster form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P3e — Spell form validation
  // -------------------------------------------------------------------------

  it('P3e — Spell form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 7.2**

    fc.assert(
      fc.property(spellFormDataArb, (data) => {
        const form = buildSpellForm(fb, data);
        const expectedValid = isValidSpellData(data);

        expect(form.valid)
          .withContext(
            `Spell form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P3f — Item form validation
  // -------------------------------------------------------------------------

  it('P3f — Item form: valid state matches constraint satisfaction', () => {
    // Feature: homebrew-content-creation, Property 3: Form validation accepts valid inputs and rejects invalid ones
    // **Validates: Requirements 10.2**

    fc.assert(
      fc.property(itemFormDataArb, (data) => {
        const form = buildItemForm(fb, data);
        const expectedValid = isValidItemData(data);

        expect(form.valid)
          .withContext(
            `Item form validity mismatch for data: ${JSON.stringify(data)}. ` +
            `Expected valid=${expectedValid}, got valid=${form.valid}`
          )
          .toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });
});

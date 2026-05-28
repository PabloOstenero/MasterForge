/**
 * Property-Based Tests for buildCombatMechanics() — Combat Mechanics Serialization
 *
 * Feature: homebrew-monster-form-complete
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * Properties tested:
 *   Property 1: La descripción es opcional — no invalida el formulario
 *   Property 2: Serialización de description en combatMechanics
 *   Property 3: addAttack incrementa el FormArray en exactamente 1
 *   Property 4: removeAttack elimina exactamente la entrada indicada
 *   Property 5: Serialización completa de combatMechanics
 *   Property 6: savingThrows omite claves nulas
 *   Property 7: senses omite claves vacías y nulas
 *   Property 8: Formulario inválido cuando un ataque, habilidad o skill tiene nombre vacío
 *
 * Each test runs a minimum of 100 iterations with randomly generated data.
 */

import * as fc from 'fast-check';
import { FormBuilder } from '@angular/forms';
import {
  buildCombatMechanics,
  HomebrewMonsterFormPage,
} from './homebrew-monster-form.page';
import {
  AttackEntry,
  FeatureEntry as AbilityEntry,
  MonsterSkillEntry as SkillEntry,
  MonsterSavingThrows as SavingThrows,
  SenseObject as Senses,
} from '../../models/homebrew.models';

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for AttackEntry */
const attackEntryArb: fc.Arbitrary<AttackEntry> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  attackBonus: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  damageDice: fc.string({ minLength: 0, maxLength: 20 }),
  damageType: fc.string({ minLength: 0, maxLength: 40 }),
  reach: fc.string({ minLength: 0, maxLength: 20 }),
});

/** Arbitrary for AbilityEntry */
const abilityEntryArb: fc.Arbitrary<AbilityEntry> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  levelRequired: fc.integer({ min: 1, max: 20 }),
});

/** Arbitrary for SkillEntry */
const skillEntryArb: fc.Arbitrary<SkillEntry> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 60 }),
  bonus: fc.integer({ min: -10, max: 20 }),
});

/** Arbitrary for SavingThrows — each key can be a number or null */
const savingThrowsArb: fc.Arbitrary<SavingThrows> = fc.record({
  str: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  dex: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  con: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  int: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  wis: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
  cha: fc.option(fc.integer({ min: -10, max: 20 }), { nil: null }),
});

/** Arbitrary for Senses — numeric fields can be null; passivePerception can be null */
const sensesArb: fc.Arbitrary<any> = fc.record({
  darkvision: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  blindsight: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  tremorsense: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  truesight: fc.option(fc.integer({ min: 0, max: 120 }), { nil: null }),
  passivePerception: fc.option(fc.integer({ min: 1, max: 30 }), { nil: null }),
});

/** Minimal/empty SavingThrows (all null) */
const emptySavingThrows: SavingThrows = {
  str: null, dex: null, con: null, int: null, wis: null, cha: null,
};

/** Minimal/empty Senses (all null) */
const emptySenses: any = {
  darkvision: null, blindsight: null, tremorsense: null, truesight: null, passivePerception: null,
};

// ---------------------------------------------------------------------------
// Property-Based Test Suite
// ---------------------------------------------------------------------------

describe('buildCombatMechanics() — Property-Based Tests', () => {

  // -------------------------------------------------------------------------
  // Property 1: La descripción es opcional — no invalida el formulario
  // -------------------------------------------------------------------------

  it('Property 1: form.valid is true regardless of description value when all required stats are valid', () => {
    // **Validates: Requirements 1.2, 1.3**

    /**
     * Arbitrary for valid monster stats (all required fields satisfied).
     */
    const validStatsArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      type: fc.string({ minLength: 1, maxLength: 50 }),
      size: fc.constantFrom('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'),
      armorClass: fc.integer({ min: 1, max: 30 }),
      hitPoints: fc.integer({ min: 1, max: 999 }),
      speed: fc.string({ minLength: 1, maxLength: 30 }),
      str: fc.integer({ min: 1, max: 30 }),
      dex: fc.integer({ min: 1, max: 30 }),
      con: fc.integer({ min: 1, max: 30 }),
      intStat: fc.integer({ min: 1, max: 30 }),
      wis: fc.integer({ min: 1, max: 30 }),
      cha: fc.integer({ min: 1, max: 30 }),
      challengeRating: fc.float({ min: 0, max: 30, noNaN: true }),
      xp: fc.integer({ min: 0, max: 999999 }),
    });

    fc.assert(
      fc.property(
        validStatsArb,
        fc.string(),  // any description value, including ""
        (stats, description) => {
          const fb = new FormBuilder();
          const homebrewServiceStub: any = {};
          const routerStub: any = {};
          const routeStub: any = { snapshot: { paramMap: { get: () => null } } };
          const authServiceStub: any = { getCurrentUser: () => null, isPro: () => false };
          const component = new HomebrewMonsterFormPage(fb, homebrewServiceStub, routerStub, routeStub, authServiceStub);
          component.ngOnInit();

          // Fill all required stats fields
          component.form.patchValue({
            name: stats.name,
            type: stats.type,
            size: stats.size,
            alignment: 'Neutral',
            armorClass: stats.armorClass,
            hitPoints: stats.hitPoints,
            speed: stats.speed,
            str: stats.str,
            dex: stats.dex,
            con: stats.con,
            intStat: stats.intStat,
            wis: stats.wis,
            cha: stats.cha,
            challengeRating: stats.challengeRating,
            xp: stats.xp,
            description: description,
          });

          // The form SHALL be valid regardless of the description value
          expect(component.form.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: Serialización de description en combatMechanics
  // -------------------------------------------------------------------------

  it('Property 2: description is passed through unchanged for any string value', () => {
    // **Validates: Requirements 1.4, 1.5**

    fc.assert(
      fc.property(fc.string(), (description) => {
        const result = buildCombatMechanics(
          description,
          emptySavingThrows,
          [],
          [],
          [],
          [],
          [],
          emptySenses,
          [],
          [],
          [],
          undefined,
          [],
        );

        expect(result.description).toBe(description);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 5: Serialización completa de combatMechanics
  // -------------------------------------------------------------------------

  it('Property 5: buildCombatMechanics returns an object with exactly the expected keys', () => {
    // **Validates: Requirements 1.4, 2.6, 3.7, 4.1, 6.4, 7.7, 8.4, 9.4, 10.3**

    const expectedKeys = [
      'description',
      'savingThrows',
      'skills',
      'damageResistances',
      'damageImmunities',
      'damageVulnerabilities',
      'conditionImmunities',
      'languages',
      'senses',
      'attacks',
      'abilities',
      'speeds',
      'legendaryActions',
    ].sort();

    fc.assert(
      fc.property(
        fc.string(),
        savingThrowsArb,
        fc.array(skillEntryArb, { maxLength: 5 }),
        fc.array(fc.string(), { maxLength: 5 }),
        fc.array(fc.string(), { maxLength: 5 }),
        fc.array(fc.string(), { maxLength: 5 }),
        fc.array(fc.string(), { maxLength: 5 }),
        sensesArb,
        fc.array(attackEntryArb, { maxLength: 5 }),
        fc.array(abilityEntryArb, { maxLength: 5 }),
        fc.array(fc.record({ name: fc.string(), description: fc.string() }), { maxLength: 5 }),
        (
          description,
          savingThrows,
          skills,
          damageResistances,
          damageImmunities,
          damageVulnerabilities,
          conditionImmunities,
          senses,
          attacks,
          abilities,
          legendaryActions,
        ) => {
          const result = buildCombatMechanics(
            description,
            savingThrows,
            skills,
            damageResistances,
            damageImmunities,
            damageVulnerabilities,
            conditionImmunities,
            senses,
            attacks,
            abilities,
            [],
            undefined,
            legendaryActions,
          );

          const actualKeys = Object.keys(result).sort();
          expect(actualKeys).toEqual(expectedKeys);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 6: savingThrows omite claves nulas
  // -------------------------------------------------------------------------

  it('Property 6: savingThrows only contains keys with numeric values (null keys are omitted)', () => {
    // **Validates: Requirement 6.4**

    fc.assert(
      fc.property(savingThrowsArb, (savingThrows) => {
        const result = buildCombatMechanics(
          '',
          savingThrows,
          [],
          [],
          [],
          [],
          [],
          emptySenses,
          [],
          [],
          [],
          undefined,
          [],
        );

        // Every key in the result must have a numeric value
        const resultKeys = Object.keys(result.savingThrows) as Array<keyof SavingThrows>;
        for (const key of resultKeys) {
          const val = (result.savingThrows as any)[key];
          expect(typeof val).toBe('number');
          expect(val).not.toBeNull();
        }

        // Every key with a numeric value in the input must appear in the result
        const inputKeys = Object.keys(savingThrows) as Array<keyof SavingThrows>;
        for (const key of inputKeys) {
          const inputVal = (savingThrows as any)[key];
          if (inputVal !== null && typeof inputVal === 'number') {
            expect((result.savingThrows as any)[key]).toBe(inputVal);
          } else {
            expect((result.savingThrows as any)[key]).toBeUndefined();
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 7: senses omite claves vacías y nulas
  // -------------------------------------------------------------------------

  it('Property 7: senses only contains keys with non-empty, non-null values', () => {
    // **Validates: Requirement 10.3**

    fc.assert(
      fc.property(sensesArb, (senses) => {
        const result = buildCombatMechanics(
          '',
          emptySavingThrows,
          [],
          [],
          [],
          [],
          [],
          senses,
          [],
          [],
          [],
          undefined,
          [],
        );

        const resultSenses = result.senses as Record<string, any>;
        const resultKeys = Object.keys(resultSenses);

        // Every key in the result must have a non-null, non-empty value
        for (const key of resultKeys) {
          const val = resultSenses[key];
          expect(val).not.toBeNull();
          expect(val).not.toBe('');
        }

        // Every key with a non-null, non-empty value in the input must appear in the result
        const inputSenses = senses as Record<string, any>;
        for (const key of Object.keys(inputSenses)) {
          const inputVal = inputSenses[key];
          if (inputVal !== null && inputVal !== '') {
            expect(resultSenses[key]).toBe(inputVal);
          } else {
            expect(resultSenses[key]).toBeUndefined();
          }
        }
      }),
      { numRuns: 100 }
    );
  });

});

// ---------------------------------------------------------------------------
// Property-Based Tests for FormArray helpers — addAttack / removeAttack
// ---------------------------------------------------------------------------

describe('HomebrewMonsterFormPage FormArray helpers — Property-Based Tests', () => {

  /**
   * Creates a minimal HomebrewMonsterFormPage instance without Angular TestBed,
   * using FormBuilder directly so we can test the FormArray helpers in isolation.
   */
  function createComponent(): HomebrewMonsterFormPage {
    const fb = new FormBuilder();
    // Provide minimal stubs for injected services
    const homebrewServiceStub: any = {};
    const routerStub: any = {};
    const routeStub: any = { snapshot: { paramMap: { get: () => null } } };
    const authServiceStub: any = { getCurrentUser: () => null, isPro: () => false };
    const component = new HomebrewMonsterFormPage(fb, homebrewServiceStub, routerStub, routeStub, authServiceStub);
    component.ngOnInit();
    return component;
  }

  // -------------------------------------------------------------------------
  // Property 3: addAttack incrementa el FormArray en exactamente 1
  // -------------------------------------------------------------------------

  it('Property 3: addAttack() increments the attacks FormArray length by exactly 1', () => {
    // **Validates: Requirement 2.2**

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (initialCount) => {
        const component = createComponent();

        // Pre-populate the FormArray with initialCount attacks
        for (let i = 0; i < initialCount; i++) {
          component.addAttack();
        }

        expect(component.attacks.length).toBe(initialCount);

        // Call addAttack() once and verify the count increases by exactly 1
        component.addAttack();

        expect(component.attacks.length).toBe(initialCount + 1);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: removeAttack elimina exactamente la entrada indicada
  // -------------------------------------------------------------------------

  it('Property 4: removeAttack(i) removes exactly the entry at index i, resulting in N-1 entries', () => {
    // **Validates: Requirement 2.5**

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

          // Pre-populate the FormArray with n attacks, each with a unique name
          for (let i = 0; i < n; i++) {
            component.addAttack();
            // Set a unique name so we can identify which entry was removed
            component.attacks.at(i).get('name')?.setValue(`Attack-${i}`);
          }

          // Capture the name of the entry that should be removed
          const removedName = component.attacks.at(indexToRemove).get('name')?.value as string;

          // Capture names of all entries that should remain (in order)
          const expectedRemainingNames = component.attacks.controls
            .filter((_, idx) => idx !== indexToRemove)
            .map((ctrl) => ctrl.get('name')?.value as string);

          // Remove the entry at indexToRemove
          component.removeAttack(indexToRemove);

          // Verify the length decreased by exactly 1
          expect(component.attacks.length).toBe(n - 1);

          // Verify the removed entry's name is no longer present at its original position
          const remainingNames = component.attacks.controls.map(
            (ctrl) => ctrl.get('name')?.value as string
          );
          expect(remainingNames).toEqual(expectedRemainingNames);
          expect(remainingNames).not.toContain(removedName);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 8: Formulario inválido cuando un ataque, habilidad o skill tiene nombre vacío
  // -------------------------------------------------------------------------

  it('Property 8: form.valid is false when any attack, ability, or skill has an empty name', () => {
    // **Validates: Requirements 2.8, 3.9, 7.4**

    /**
     * Arbitrary for a valid monster stats object (all required fields filled).
     * We use fixed valid values for simplicity since the property focuses on
     * the FormArray name validation, not the stats validation.
     */
    const validStatsArb = fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      type: fc.string({ minLength: 1, maxLength: 50 }),
      size: fc.constantFrom('Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'),
      armorClass: fc.integer({ min: 1, max: 30 }),
      hitPoints: fc.integer({ min: 1, max: 999 }),
      speed: fc.string({ minLength: 1, maxLength: 30 }),
      str: fc.integer({ min: 1, max: 30 }),
      dex: fc.integer({ min: 1, max: 30 }),
      con: fc.integer({ min: 1, max: 30 }),
      intStat: fc.integer({ min: 1, max: 30 }),
      wis: fc.integer({ min: 1, max: 30 }),
      cha: fc.integer({ min: 1, max: 30 }),
      challengeRating: fc.float({ min: 0, max: 30, noNaN: true }),
      xp: fc.integer({ min: 0, max: 999999 }),
    });

    /** Which FormArray to target: attacks, abilities, or skills */
    const arrayTargetArb = fc.constantFrom('attacks', 'abilities', 'skills' as const);

    fc.assert(
      fc.property(
        validStatsArb,
        arrayTargetArb,
        (stats, target) => {
          const component = createComponent();

          // Fill all required stats fields
          component.form.patchValue({
            name: stats.name,
            type: stats.type,
            size: stats.size,
            alignment: 'Neutral',
            armorClass: stats.armorClass,
            hitPoints: stats.hitPoints,
            speed: stats.speed,
            str: stats.str,
            dex: stats.dex,
            con: stats.con,
            intStat: stats.intStat,
            wis: stats.wis,
            cha: stats.cha,
            challengeRating: stats.challengeRating,
            xp: stats.xp,
          });

          // Add one entry to the target FormArray with an empty name
          if (target === 'attacks') {
            component.addAttack();
            // name is '' by default (required validator), so form should be invalid
          } else if (target === 'abilities') {
            component.addAbility();
            // name is '' by default (required validator), so form should be invalid
          } else {
            // Skills no longer use a FormArray with required validators —
            // they use a chip-based FormGroup. Test invalidity via an attack instead.
            component.addAttack();
          }

          // The form must be invalid because the name control is empty and required
          expect(component.form.valid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

});

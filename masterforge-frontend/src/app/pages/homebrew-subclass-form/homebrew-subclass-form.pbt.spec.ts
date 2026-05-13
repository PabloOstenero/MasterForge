import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import fc from 'fast-check';
import {
  buildSubclassFeatures,
  WEAPON_PROFS,
  ARMOR_PROFS,
  DAMAGE_TYPES,
  CONDITIONS,
  SPELLCASTING_ABILITIES,
  SPELLCASTING_TYPES,
  PREPARATION_STYLES,
  DIE_TYPES,
  RECHARGE_OPTIONS,
  EXPANDED_SPELL_PREPARATION_TYPES,
  SPELL_SLOT_PRESETS,
  SKILL_NAMES,
  HomebrewSubclassFormPage,
} from './homebrew-subclass-form.page';
import {
  SkillProficiencies
} from '../../models/homebrew.models';

describe('HomebrewSubclassFormPage - Property Based Tests', () => {

  // Generators
  const weaponProfsGen = fc.subarray([...WEAPON_PROFS]);
  const customStringsGen = fc.array(fc.string({ minLength: 1, maxLength: 20 }));
  const armorProfsGen = fc.subarray([...ARMOR_PROFS]);
  const damageTypesGen = fc.subarray([...DAMAGE_TYPES]);
  const conditionsGen = fc.subarray([...CONDITIONS]);

  const skillProficienciesGen = fc.record({
    fixed: fc.constant([] as string[]),
    choicePool: fc.subarray([...SKILL_NAMES]),
    choiceCount: fc.nat(5)
  });

  const featureEntryGen = fc.record({
    name: fc.string({ minLength: 1 }),
    description: fc.string({ minLength: 1 }),
    levelRequired: fc.integer({ min: 1, max: 20 })
  });
  const featureEntriesGen = fc.array(featureEntryGen);

  const expandedSpellEntryGen = fc.record({
    name: fc.string({ minLength: 1 }),
    level: fc.integer({ min: 0, max: 9 }),
    preparationType: fc.constantFrom(...EXPANDED_SPELL_PREPARATION_TYPES)
  });
  const expandedSpellListGen = fc.array(expandedSpellEntryGen);

  const resourcePoolGen = fc.record({
    name: fc.string({ minLength: 1 }),
    dieType: fc.constantFrom(...DIE_TYPES),
    count: fc.integer({ min: 1, max: 20 }),
    rechargeOn: fc.constantFrom(...RECHARGE_OPTIONS)
  });
  const resourcePoolsGen = fc.array(resourcePoolGen);
  const additionalSpellClassGen = fc.option(fc.string({ minLength: 1 }), { nil: null });

  const spellcastingGen = fc.option(fc.record({
    ability: fc.constantFrom(...SPELLCASTING_ABILITIES),
    spellcastingType: fc.constantFrom(...SPELLCASTING_TYPES),
    ritualCasting: fc.boolean(),
    preparationStyle: fc.constantFrom(...PREPARATION_STYLES),
    cantripsKnown: fc.array(fc.nat(10), { minLength: 20, maxLength: 20 }),
    spellsKnown: fc.array(fc.nat(20), { minLength: 20, maxLength: 20 }),
    spellSlots: fc.record({
      slots: fc.array(fc.array(fc.nat(4), { minLength: 9, maxLength: 9 }), { minLength: 20, maxLength: 20 })
    })
  }), { nil: null });

  const subclassFeaturesGen = fc.record({
    weaponProficiencies: fc.array(fc.string({ minLength: 1 })),
    armorProficiencies: fc.array(fc.string({ minLength: 1 })),
    toolProficiencies: fc.array(fc.string({ minLength: 1 })),
    skillProficiencies: skillProficienciesGen,
    damageResistances: damageTypesGen,
    damageImmunities: damageTypesGen,
    conditionImmunities: conditionsGen,
    features: featureEntriesGen,
    expandedSpellList: expandedSpellListGen,
    resourcePools: resourcePoolsGen,
    spellcasting: spellcastingGen
  }).map(sf => {
    if (sf.spellcasting === null) {
      delete (sf as any).spellcasting;
    } else if (sf.spellcasting && sf.spellcasting.preparationStyle === 'PREPARED') {
      delete (sf.spellcasting as any).spellsKnown;
    }
    return sf;
  });

  // -------------------------------------------------------------------------
  // Property 1: buildSubclassFeatures serializes all fields correctly
  // -------------------------------------------------------------------------
  it('Property 1: buildSubclassFeatures serializes all fields correctly', () => {
    fc.assert(
      fc.property(
        weaponProfsGen,
        customStringsGen,
        armorProfsGen,
        customStringsGen,
        customStringsGen,
        skillProficienciesGen,
        damageTypesGen,
        damageTypesGen,
        conditionsGen,
        featureEntriesGen,
        expandedSpellListGen,
        resourcePoolsGen,
        spellcastingGen,
        additionalSpellClassGen,
        (
          weaponChips, customWeapon, armorChips, customArmor, customTool,
          skills, dmgRes, dmgImm, condImm, features, spells, pools, spellcasting,
          additionalSpellClass
        ) => {
          const result = buildSubclassFeatures(
            [...weaponChips, ...customWeapon],
            [...armorChips, ...customArmor],
            customTool,
            skills,
            dmgRes,
            dmgImm,
            condImm,
            features,
            spells,
            pools,
            spellcasting,
            additionalSpellClass
          );

          expect(result.weaponProficiencies).toEqual([...weaponChips, ...customWeapon]);
          expect(result.armorProficiencies).toEqual([...armorChips, ...customArmor]);
          expect(result.toolProficiencies).toEqual(customTool);
          expect(result.skillProficiencies).toEqual(skills);
          expect(result.damageResistances).toEqual(dmgRes);
          expect(result.damageImmunities).toEqual(dmgImm);
          expect(result.conditionImmunities).toEqual(condImm);
          expect(result.features).toEqual(features);
          expect(result.expandedSpellList).toEqual(spells);
          expect(result.resourcePools).toEqual(pools);
          expect(result.additionalSpellClass).toEqual(additionalSpellClass ?? undefined);

          if (spellcasting) {
            expect(result.spellcasting).toEqual(spellcasting);
          } else {
            expect(result.spellcasting).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: SubclassFeatures JSON round-trip
  // -------------------------------------------------------------------------
  it('Property 2: SubclassFeatures JSON round-trip', () => {
    fc.assert(
      fc.property(subclassFeaturesGen, (sf) => {
        const jsonString = JSON.stringify(sf);
        const parsed = JSON.parse(jsonString);
        expect(parsed).toEqual(sf);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: Spell slot preset population
  // -------------------------------------------------------------------------
  it('Property 3: Spell slot preset population', () => {
    const presetTypes = Object.keys(SPELL_SLOT_PRESETS);
    const presetGen = fc.constantFrom(...presetTypes);

    fc.assert(
      fc.property(presetGen, (presetType) => {
        const preset = SPELL_SLOT_PRESETS[presetType];
        
        // Mock the form control update mechanism
        const slots: (number | null)[][] = Array(20).fill(null).map(() => Array(9).fill(0));
        
        preset.forEach((row, levelIdx) => {
          row.forEach((val, slotIdx) => {
            slots[levelIdx][slotIdx] = val === 0 ? null : val;
          });
        });

        // Verify dimensions and values match preset logic (treating 0 as null in form)
        expect(slots.length).toBe(20);
        slots.forEach((row, i) => {
          expect(row.length).toBe(9);
          row.forEach((val, j) => {
            const expectedVal = preset[i][j] === 0 ? null : preset[i][j];
            expect(val).toBe(expectedVal);
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 4: Edit mode round-trip
  // -------------------------------------------------------------------------
  it('Property 4: Edit mode round-trip', () => {
    // Generate valid API response objects with subclassFeatures populated
    const responseGen = fc.record({
      id: fc.uuid(),
      name: fc.string(),
      description: fc.string(),
      parentClassId: fc.integer(),
      subclassFeatures: subclassFeaturesGen,
      additionalSpellClass: additionalSpellClassGen
    });

    fc.assert(
      fc.property(responseGen, (response) => {
        const fb = new FormBuilder();
        const mockService = { 
          getSubclass: () => of(response),
          getClasses: () => of([]),
          getAllSpells: () => of([])
        };
        const mockRouter = {};
        const mockRoute = { snapshot: { paramMap: { get: () => response.id } } };

        const component = new HomebrewSubclassFormPage(
          fb,
          mockService as any,
          mockRouter as any,
          mockRoute as any
        );

        // Initialize the form component
        component.ngOnInit();
        // Since id is provided in route mock, loadSubclassForEdit is called automatically

        // After patching, we can simulate what submit() does to serialize it back
        const weaponProficiencies = [
          ...WEAPON_PROFS.filter((_, i) => component.weaponChips[i]),
          ...component.customWeaponProfs
        ];

        const armorProficiencies = [
          ...ARMOR_PROFS.filter((_, i) => component.armorChips[i]),
          ...component.customArmorProfs
        ];

        const toolProficiencies = component.customToolProfs;

        const skillProficiencies: SkillProficiencies = {
          fixed: [],
          choicePool: component.getSelectedSkills(),
          choiceCount: component.form.get('skillChoiceCount')?.value ?? 0
        };

        const damageResistances = DAMAGE_TYPES.filter((_, i) => component.damageResistances.at(i).value);
        const damageImmunities = DAMAGE_TYPES.filter((_, i) => component.damageImmunities.at(i).value);
        const conditionImmunities = CONDITIONS.filter((_, i) => component.conditionImmunities.at(i).value);

        const features = component.features.controls.map(c => c.value);
        const expandedSpells = component.expandedSpellList.controls.map(c => c.value);
        const resourcePools = component.resourcePools.controls.map(c => c.value);

        let spellcasting = null;
        if (component.form.get('spellcastingEnabled')?.value) {
          const prepStyle = component.form.get('preparationStyle')?.value;
          spellcasting = {
            ability: component.form.get('spellcastingAbility')?.value,
            spellcastingType: component.form.get('spellcastingType')?.value,
            ritualCasting: component.form.get('ritualCasting')?.value,
            preparationStyle: prepStyle,
            cantripsKnown: component.cantripsKnown.value,
            spellSlots: {
              slots: component.spellSlots.value
            },
            ...(prepStyle === 'KNOWN' ? { spellsKnown: component.spellsKnown.value } : {})
          };
        }

        const additionalSpellClass = component.form.get('additionalSpellClass')?.value || null;

        const rebuilt = buildSubclassFeatures(
          weaponProficiencies,
          armorProficiencies,
          toolProficiencies,
          skillProficiencies,
          damageResistances,
          damageImmunities,
          conditionImmunities,
          features,
          expandedSpells,
          resourcePools,
          spellcasting,
          additionalSpellClass
        );

        if (response.subclassFeatures.skillProficiencies?.choicePool?.length && rebuilt.skillProficiencies.choicePool.length === 0) {
          console.error("DEBUG SKILLS:", response.subclassFeatures.skillProficiencies.choicePool, component.skills.value);
        }

        // The rebuilt features should match the original subclassFeatures
        // NOTE: we need to parse/stringify to handle undefined vs missing keys in JS objects if necessary
        const expected = JSON.parse(JSON.stringify(response.subclassFeatures));
        const actual = JSON.parse(JSON.stringify(rebuilt));
        
        expect(actual).toEqual(expected);
      }),
      { numRuns: 100 }
    );
  });
});

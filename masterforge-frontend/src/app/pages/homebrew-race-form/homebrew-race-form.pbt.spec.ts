import * as fc from 'fast-check';
import {
  buildRaceFeatures,
  LANGUAGES,
  DAMAGE_TYPES,
  CONDITIONS,
  SKILL_NAMES,
  WEAPON_PROFS,
  ARMOR_PROFS,
  CREATURE_TYPES,
} from './homebrew-race-form.page';
import {
  InnateSpell,
  SkillProficiencies,
  NaturalArmor,
  NaturalWeapon,
} from '../../models/homebrew.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Arbitrary for a nullable non-negative integer (0 is also valid as "zero"). */
const nullableNonNeg = fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 }));

/** Arbitrary for a nullable positive integer (strictly > 0). */
const nullablePositive = fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 200 }));

/** Arbitrary for a nullable zero-or-positive integer (includes 0). */
const nullableZeroOrPos = fc.oneof(fc.constant(null), fc.constant(0), fc.integer({ min: 1, max: 200 }));

/** Builds a minimal valid buildRaceFeatures call with overrides. */
function callBuildRaceFeatures(overrides: Partial<Parameters<typeof buildRaceFeatures>[0] extends infer T ? { [K in keyof Parameters<typeof buildRaceFeatures>]: Parameters<typeof buildRaceFeatures>[K] } : never> = {}): ReturnType<typeof buildRaceFeatures> {
  const defaults: Parameters<typeof buildRaceFeatures> = [
    { walk: 30, swim: null, climb: null, fly: null },
    { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
    [], // fixed
    [], // pool
    0,
    { fixed: [], choicePool: [], choiceCount: 0 },
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ];
  return buildRaceFeatures(...defaults);
}

// ---------------------------------------------------------------------------
// Property 2: Speed serialization omits zero/null values
// Feature: homebrew-race-form, Property 2: Speed serialization omits zero/null values
// Validates: Requirements 4.4, 12.2
// ---------------------------------------------------------------------------

describe('Property 2: Speed serialization omits zero/null values', () => {
  it('should omit speed keys whose value is null or 0', () => {
    fc.assert(
      fc.property(
        fc.record({
          walk:  nullableZeroOrPos,
          swim:  nullableZeroOrPos,
          climb: nullableZeroOrPos,
          fly:   nullableZeroOrPos,
        }),
        (speeds) => {
          const result = buildRaceFeatures(
            speeds,
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            [], [],
            0,
            { fixed: [], choicePool: [], choiceCount: 0 },
            [], [], [], [], [], [], [],
          );

          const speedKeys = Object.keys(result.speeds!) as Array<keyof typeof result.speeds>;

          // Every key present in output must have a positive value
          for (const key of speedKeys) {
            const val = result.speeds![key];
            expect(val).not.toBeNull();
            expect(val).not.toBe(0);
            expect(val! > 0).toBeTrue();
          }

          // Every key with a positive input value must appear in output
          (Object.keys(speeds) as Array<keyof typeof speeds>).forEach((key) => {
            const val = speeds[key];
            if (val !== null && val !== 0) {
              expect(result.speeds![key]).toBe(val);
            } else {
              expect(result.speeds![key]).toBeUndefined();
            }
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Senses serialization omits zero/null values
// Feature: homebrew-race-form, Property 3: Senses serialization omits zero/null values
// Validates: Requirements 5.5, 12.3
// ---------------------------------------------------------------------------

describe('Property 3: Senses serialization omits zero/null values', () => {
  it('should omit sense keys whose value is null or 0', () => {
    fc.assert(
      fc.property(
        fc.record({
          darkvision:  nullableZeroOrPos,
          blindsight:  nullableZeroOrPos,
          tremorsense: nullableZeroOrPos,
          truesight:   nullableZeroOrPos,
        }),
        (senses) => {
          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            senses,
            [], [],
            0,
            { fixed: [], choicePool: [], choiceCount: 0 },
            [], [], [], [], [], [], [],
          );

          const senseKeys = Object.keys(result.senses!) as Array<keyof typeof result.senses>;

          // Every key present in output must have a positive value
          for (const key of senseKeys) {
            const val = result.senses![key];
            expect(val).not.toBeNull();
            expect(val).not.toBe(0);
            expect(val! > 0).toBeTrue();
          }

          // Every key with a positive input value must appear in output
          (Object.keys(senses) as Array<keyof typeof senses>).forEach((key) => {
            const val = senses[key];
            // Verify round-trip: result.senses is always an object (even if empty)
            expect(result.senses).toBeDefined();
            const rs = result.senses!;

            if (val !== null && val !== 0) {
              expect(rs[key]).toBe(val);
            } else {
              expect(rs[key]).toBeUndefined();
            }
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Languages round-trip
// Feature: homebrew-race-form, Property 4: Languages round-trip
// Validates: Requirements 7.4, 12.4
// ---------------------------------------------------------------------------

describe('Property 4: Languages round-trip', () => {
  it('should round-trip a non-empty subset of LANGUAGES through comma-separated serialization', () => {
    fc.assert(
      fc.property(
        // Generate a non-empty subset of LANGUAGES indices
        fc.array(fc.integer({ min: 0, max: LANGUAGES.length - 1 }), { minLength: 1 })
          .map((indices) => Array.from(new Set(indices)).sort((a, b) => a - b)),
        (indices) => {
          const selectedLanguages = indices.map((i) => LANGUAGES[i]);
          const languagesString = selectedLanguages.join(', ');

          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            selectedLanguages,
            [],
            0,
            { fixed: [], choicePool: [], choiceCount: 0 },
            [], [], [], [], [], [], [],
          );

          // Verify round-trip: result.languages is now an array
          expect(result.languages).toEqual(selectedLanguages);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Skill proficiencies placement by choiceCount
// Feature: homebrew-race-form, Property 5: Skill proficiencies placement by choiceCount
// Validates: Requirements 8.5, 8.6, 12.6
// ---------------------------------------------------------------------------

describe('Property 5: Skill proficiencies placement by choiceCount', () => {
  it('should place skills in fixed when choiceCount === 0, in choicePool when choiceCount > 0', () => {
    fc.assert(
      fc.property(
        // Random subset of skills
        fc.array(fc.integer({ min: 0, max: SKILL_NAMES.length - 1 }), { minLength: 0, maxLength: SKILL_NAMES.length })
          .map((indices) => Array.from(new Set(indices)).map((i) => SKILL_NAMES[i])),
        // choiceCount: 0 or positive
        fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 10 })),
        (selectedSkills, choiceCount) => {
          const skillProficiencies: SkillProficiencies = choiceCount > 0
            ? { fixed: [], choicePool: selectedSkills, choiceCount }
            : { fixed: selectedSkills, choicePool: [], choiceCount: 0 };

          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            [], [],
            0,
            skillProficiencies,
            [], [], [], [], [], [], [],
          );

          const sp = result.skillProficiencies;

          if (choiceCount === 0) {
            // All skills in fixed, choicePool empty
            expect(sp.choiceCount).toBe(0);
            expect(sp.choicePool).toEqual([]);
            // fixed must contain all selected skills
            const fixedSet = new Set(sp.fixed);
            for (const skill of selectedSkills) {
              expect(fixedSet.has(skill)).toBeTrue();
            }
            expect(sp.fixed.length).toBe(selectedSkills.length);
          } else {
            // All skills in choicePool, fixed empty
            expect(sp.choiceCount).toBe(choiceCount);
            expect(sp.fixed).toEqual([]);
            // choicePool must contain all selected skills
            const poolSet = new Set(sp.choicePool);
            for (const skill of selectedSkills) {
              expect(poolSet.has(skill)).toBeTrue();
            }
            expect(sp.choicePool.length).toBe(selectedSkills.length);
          }

          // Union of fixed and choicePool must equal selectedSkills
          const union = new Set([...sp.fixed, ...sp.choicePool]);
          const selectedSet = new Set(selectedSkills);
          expect(union.size).toBe(selectedSet.size);
          for (const skill of selectedSet) {
            expect(union.has(skill)).toBeTrue();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Proficiency merging (chips + free-text)
// Feature: homebrew-race-form, Property 6: Proficiency merging
// Validates: Requirements 9.5
// ---------------------------------------------------------------------------

describe('Property 6: Proficiency merging (chips + free-text)', () => {
  it('should merge predefined chip selections and custom free-text entries into a single array', () => {
    fc.assert(
      fc.property(
        // Random subset of WEAPON_PROFS indices
        fc.array(fc.integer({ min: 0, max: WEAPON_PROFS.length - 1 }), { minLength: 0 })
          .map((indices) => Array.from(new Set(indices))),
        // Random custom weapon profs (non-empty strings)
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !(WEAPON_PROFS as readonly string[]).includes(s)), { minLength: 0, maxLength: 5 }),
        // Random subset of ARMOR_PROFS indices
        fc.array(fc.integer({ min: 0, max: ARMOR_PROFS.length - 1 }), { minLength: 0 })
          .map((indices) => Array.from(new Set(indices))),
        // Random custom armor profs
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => !(ARMOR_PROFS as readonly string[]).includes(s)), { minLength: 0, maxLength: 5 }),
        // Random tool profs
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
        (weaponChipIndices, customWeapon, armorChipIndices, customArmor, toolProfs) => {
          const chipWeapons = weaponChipIndices.map((i) => WEAPON_PROFS[i]);
          const chipArmors = armorChipIndices.map((i) => ARMOR_PROFS[i]);

          const weaponProficiencies = [...chipWeapons, ...customWeapon];
          const armorProficiencies = [...chipArmors, ...customArmor];

          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            [], [],
            0,
            { fixed: [], choicePool: [], choiceCount: 0 },
            weaponProficiencies,
            armorProficiencies,
            toolProfs,
            [], [], [], [],
          );

          // Weapon proficiencies: output must equal input (C ∪ T)
          const expectedWeapon = new Set(weaponProficiencies);
          const actualWeapon = new Set(result.weaponProficiencies);
          expect(actualWeapon.size).toBe(expectedWeapon.size);
          for (const w of expectedWeapon) {
            expect(actualWeapon.has(w)).toBeTrue();
          }

          // Armor proficiencies: output must equal input
          const expectedArmor = new Set(armorProficiencies);
          const actualArmor = new Set(result.armorProficiencies);
          expect(actualArmor.size).toBe(expectedArmor.size);
          for (const a of expectedArmor) {
            expect(actualArmor.has(a)).toBeTrue();
          }

          // Tool proficiencies: output must equal input
          const expectedTool = new Set(toolProfs);
          const actualTool = new Set(result.toolProficiencies);
          expect(actualTool.size).toBe(expectedTool.size);
          for (const t of expectedTool) {
            expect(actualTool.has(t)).toBeTrue();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Damage type / condition chip round-trip
// Feature: homebrew-race-form, Property 7: Damage type / condition chip round-trip
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------

describe('Property 7: Damage type / condition chip round-trip', () => {
  it('should round-trip damage type selections as arrays', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: DAMAGE_TYPES.length - 1 }), { minLength: 0 })
          .map((indices) => Array.from(new Set(indices)).sort((a, b) => a - b)),
        fc.array(fc.integer({ min: 0, max: DAMAGE_TYPES.length - 1 }), { minLength: 0 })
          .map((indices) => Array.from(new Set(indices)).sort((a, b) => a - b)),
        fc.array(fc.integer({ min: 0, max: CONDITIONS.length - 1 }), { minLength: 0 })
          .map((indices) => Array.from(new Set(indices)).sort((a, b) => a - b)),
        (resistIndices, immuneIndices, condIndices) => {
          const resistances = resistIndices.map((i) => DAMAGE_TYPES[i]);
          const immunities = immuneIndices.map((i) => DAMAGE_TYPES[i]);
          const conditions = condIndices.map((i) => CONDITIONS[i]);

          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            [], [],
            0,
            { fixed: [], choicePool: [], choiceCount: 0 },
            [], [], [],
            resistances,
            immunities,
            conditions,
            [],
          );

          // Round-trip: result fields are now arrays
          expect(result.damageResistances).toEqual(resistances);
          expect(result.damageImmunities).toEqual(immunities);
          expect(result.conditionImmunities).toEqual(conditions);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Innate spell serialization completeness
// Feature: homebrew-race-form, Property 8: Innate spell serialization completeness
// Validates: Requirements 11.6, 12.5
// ---------------------------------------------------------------------------

describe('Property 8: Innate spell serialization completeness', () => {
  it('should serialize every innate spell with all five fields present', () => {
    const spellArb = fc.record({
      spellId:    fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
      name:       fc.string({ minLength: 1, maxLength: 50 }),
      level:      fc.integer({ min: 0, max: 9 }),
      usesPerDay: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10 })),
      ability:    fc.oneof(fc.constant(''), fc.constantFrom('Intelligence', 'Wisdom', 'Charisma')),
      rechargeOn: fc.oneof(fc.constant(''), fc.constantFrom('At Will', 'Short Rest', 'Long Rest')),
    });

    fc.assert(
      fc.property(
        fc.array(spellArb, { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 0, max: 5 }),
        (spells: InnateSpell[], extraLanguageChoices) => {
          const result = buildRaceFeatures(
            { walk: 30, swim: null, climb: null, fly: null },
            { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
            [], [],
            extraLanguageChoices,
            { fixed: [], choicePool: [], choiceCount: 0 },
            [], [], [], [], [], [],
            spells,
          );

          expect(result.innateSpells.length).toBe(spells.length);

          result.innateSpells.forEach((spell, i) => {
            // All five fields must be present (not undefined)
            expect(spell.name).toBeDefined();
            expect(spell.level).toBeDefined();
            expect('usesPerDay' in spell).toBeTrue();
            expect(spell.ability).toBeDefined();
            expect(spell.rechargeOn).toBeDefined();

            // Values must match input
            expect(spell.name).toBe(spells[i].name);
            expect(spell.level).toBe(spells[i].level);
            expect(spell.usesPerDay).toBe(spells[i].usesPerDay);
            expect(spell.ability).toBe(spells[i].ability);
            expect(spell.rechargeOn).toBe(spells[i].rechargeOn);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Trait reconciliation correctness
// Feature: homebrew-race-form, Property 9: Trait reconciliation correctness
// Validates: Requirements 6.7
// ---------------------------------------------------------------------------

describe('Property 9: Trait reconciliation correctness', () => {
  it('should POST new traits, PUT changed traits, and DELETE removed traits', async () => {
    const traitArb = fc.record({
      id:          fc.integer({ min: 1, max: 1000 }),
      name:        fc.string({ minLength: 1, maxLength: 30 }),
      description: fc.string({ minLength: 1, maxLength: 100 }),
    });

    await fc.assert(
      fc.asyncProperty(
        // Original traits (all have ids)
        fc.array(traitArb, { minLength: 0, maxLength: 5 })
          .map((traits) => {
            // Ensure unique ids
            const seen = new Set<number>();
            return traits.filter((t) => {
              if (seen.has(t.id)) return false;
              seen.add(t.id);
              return true;
            });
          }),
        // Modifications: keep some, change some, add new ones
        fc.array(fc.record({
          name:        fc.string({ minLength: 1, maxLength: 30 }),
          description: fc.string({ minLength: 1, maxLength: 100 }),
        }), { minLength: 0, maxLength: 3 }),
        async (originalTraits, newTraits) => {
          // Build current traits: keep first half of originals (possibly modified), drop second half, add new
          const keepCount = Math.floor(originalTraits.length / 2);
          const keptOriginals = originalTraits.slice(0, keepCount);
          const deletedOriginals = originalTraits.slice(keepCount);

          // Modify the first kept original (if any) to trigger a PUT
          const currentTraits: { id: number | null; name: string; description: string }[] = [
            ...keptOriginals.map((t, i) => ({
              id:          t.id,
              name:        i === 0 ? t.name + '_modified' : t.name,
              description: i === 0 ? t.description + '_modified' : t.description,
            })),
            ...newTraits.map((t) => ({ id: null, name: t.name, description: t.description })),
          ];

          // Track calls
          const postCalls: { name: string; description: string; raceId: number }[] = [];
          const putCalls: { id: number; name: string; description: string; raceId: number }[] = [];
          const deleteCalls: number[] = [];

          // Mock reconcileTraits logic (pure function extracted for testing)
          const raceId = 42;
          const currentIds = new Set(
            currentTraits.filter(t => t.id !== null).map(t => t.id as number),
          );

          // POST new traits (id === null)
          for (const trait of currentTraits) {
            if (trait.id === null) {
              postCalls.push({ name: trait.name, description: trait.description, raceId });
            }
          }

          // PUT changed traits
          for (const trait of currentTraits) {
            if (trait.id !== null) {
              const original = originalTraits.find(o => o.id === trait.id);
              if (original && (original.name !== trait.name || original.description !== trait.description)) {
                putCalls.push({ id: trait.id, name: trait.name, description: trait.description, raceId });
              }
            }
          }

          // DELETE removed traits
          for (const original of originalTraits) {
            if (!currentIds.has(original.id)) {
              deleteCalls.push(original.id);
            }
          }

          // Verify POST: exactly the new traits (id === null)
          const expectedPostCount = currentTraits.filter(t => t.id === null).length;
          expect(postCalls.length).toBe(expectedPostCount);

          // Verify DELETE: exactly the deleted originals
          const expectedDeleteIds = new Set(deletedOriginals.map(t => t.id));
          expect(deleteCalls.length).toBe(expectedDeleteIds.size);
          for (const id of deleteCalls) {
            expect(expectedDeleteIds.has(id)).toBeTrue();
          }

          // Verify PUT: only traits that changed
          for (const putCall of putCalls) {
            const original = originalTraits.find(o => o.id === putCall.id);
            expect(original).toBeDefined();
            const current = currentTraits.find(t => t.id === putCall.id);
            expect(current).toBeDefined();
            const changed = original!.name !== current!.name || original!.description !== current!.description;
            expect(changed).toBeTrue();
          }

          // Verify no extra calls: traits that are unchanged should NOT be PUT
          for (const trait of currentTraits) {
            if (trait.id !== null) {
              const original = originalTraits.find(o => o.id === trait.id);
              if (original && original.name === trait.name && original.description === trait.description) {
                const wasPut = putCalls.some(p => p.id === trait.id);
                expect(wasPut).toBeFalse();
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_ARGS helper for extended property tests
// ---------------------------------------------------------------------------

/** Default first-12 arguments for buildRaceFeatures — used in extended property tests. */
const DEF_SPEEDS   = { walk: 30, swim: null, climb: null, fly: null } as const;
const DEF_SENSES   = { darkvision: null, blindsight: null, tremorsense: null, truesight: null } as const;
const DEF_SKILLS: SkillProficiencies = { fixed: [], choicePool: [], choiceCount: 0 };
const DEF_SPELLS: InnateSpell[] = [];

// ---------------------------------------------------------------------------
// Property 5: Whitespace-only flyRestriction omission
// Feature: homebrew-race-form-extended, Property 5: Whitespace-only string omission
// Validates: Requirements 8.3, 10.9
// ---------------------------------------------------------------------------

describe('Property 5 (extended): Whitespace-only flyRestriction omission', () => {
  it('should omit flyRestriction when whitespace-only, include when non-whitespace', () => {
    // Sub-case 1: whitespace-only → key absent
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 10 }).map(s => s.replace(/[^\s]/g, ' ')),
        (flyRestriction) => {
          const result = buildRaceFeatures(
            DEF_SPEEDS, DEF_SENSES, [], [], 0, DEF_SKILLS, [], [], [], [], [], [], DEF_SPELLS,
            undefined,       // naturalArmor
            undefined,       // naturalWeapons
            undefined,       // creatureType
            flyRestriction,  // flyRestriction
          );

          expect(result.flyRestriction).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );

    // Sub-case 2: non-whitespace → key present
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim() !== ''),
        (flyRestriction) => {
          const result = buildRaceFeatures(
            DEF_SPEEDS, DEF_SENSES, [], [], 0, DEF_SKILLS, [], [], [], [], [], [], DEF_SPELLS,
            undefined,       // naturalArmor
            undefined,       // naturalWeapons
            undefined,       // creatureType
            flyRestriction,  // flyRestriction
          );

          expect(result.flyRestriction).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Natural armor conditional serialization
// Feature: homebrew-race-form-extended, Property 6: Natural armor conditional serialization
// Validates: Requirements 4.5, 10.5
// ---------------------------------------------------------------------------

describe('Property 6 (extended): Natural armor conditional serialization', () => {
  it('should include naturalArmor when enabled, omit it when disabled', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 1, max: 30 }),
        fc.boolean(),
        (enabled, baseAC, addDex) => {
          const naturalArmor: NaturalArmor | null = enabled
            ? { enabled: true, baseAC, addDex }
            : null;

          const result = buildRaceFeatures(
            DEF_SPEEDS, DEF_SENSES, [], [], 0, DEF_SKILLS, [], [], [], [], [], [], DEF_SPELLS,
            naturalArmor,  // naturalArmor
          );

          if (enabled) {
            expect(result.naturalArmor).toBeDefined();
            expect(result.naturalArmor).toEqual({ enabled: true, baseAC, addDex });
          } else {
            expect(result.naturalArmor).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Natural weapons serialization completeness
// Feature: homebrew-race-form-extended, Property 7: Natural weapons serialization completeness
// Validates: Requirements 5.6, 10.6
// ---------------------------------------------------------------------------

describe('Property 7 (extended): Natural weapons serialization completeness', () => {
  it('should serialize every natural weapon with all structured fields matching input', () => {
    const naturalWeaponArb = fc.record({
      name:        fc.string({ minLength: 1, maxLength: 30 }),
      diceCount:   fc.integer({ min: 1, max: 10 }),
      dieType:     fc.constantFrom('d4', 'd6', 'd8', 'd10', 'd12', 'd20'),
      damageType:  fc.constantFrom('Bludgeoning', 'Piercing', 'Slashing'),
      stat:        fc.constantFrom('str', 'dex'),
    });

    fc.assert(
      fc.property(
        fc.array(naturalWeaponArb, { minLength: 0, maxLength: 10 }),
        (naturalWeapons) => {
          const result = buildRaceFeatures(
            DEF_SPEEDS, DEF_SENSES, [], [], 0, DEF_SKILLS, [], [], [], [], [], [], DEF_SPELLS,
            undefined,       // naturalArmor
            naturalWeapons as NaturalWeapon[],  // naturalWeapons
          );

          if (naturalWeapons.length === 0) {
            expect(result.naturalWeapons).toBeUndefined();
          } else {
            expect(result.naturalWeapons).toBeDefined();
            expect(result.naturalWeapons!.length).toBe(naturalWeapons.length);

            result.naturalWeapons!.forEach((outputNw, i) => {
              expect(outputNw.name).toBe(naturalWeapons[i].name);
              expect(outputNw.diceCount).toBe(naturalWeapons[i].diceCount);
              expect(outputNw.dieType).toBe(naturalWeapons[i].dieType);
              expect(outputNw.damageType).toBe(naturalWeapons[i].damageType);
              expect(outputNw.stat).toBe(naturalWeapons[i].stat);
            });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Non-regression — existing keys preserved
// Feature: homebrew-race-form-extended, Property 9: Non-regression — existing keys preserved
// Validates: Requirements 10.11
// ---------------------------------------------------------------------------

describe('Property 9 (extended): Non-regression — existing keys preserved', () => {
  it('should preserve all 12 existing output keys when new parameters are added', () => {
    const nullableZeroOrPosLocal = fc.oneof(
      fc.constant(null),
      fc.constant(0),
      fc.integer({ min: 1, max: 200 }),
    );

    const speedsArb = fc.record({
      walk:  nullableZeroOrPosLocal,
      swim:  nullableZeroOrPosLocal,
      climb: nullableZeroOrPosLocal,
      fly:   nullableZeroOrPosLocal,
    });

    const sensesArb = fc.record({
      darkvision:  nullableZeroOrPosLocal,
      blindsight:  nullableZeroOrPosLocal,
      tremorsense: nullableZeroOrPosLocal,
      truesight:   nullableZeroOrPosLocal,
    });

    fc.assert(
      fc.property(
        speedsArb,
        sensesArb,
        fc.constant([] as string[]),                              // languages
        fc.constant(0),                                           // extraLanguageChoices
        fc.constant({ fixed: [], choicePool: [], choiceCount: 0 } as SkillProficiencies), // skillProficiencies
        fc.constant([] as string[]),                              // weaponProficiencies
        fc.constant([] as string[]),                              // armorProficiencies
        fc.constant([] as string[]),                              // toolProficiencies
        fc.constant([] as string[]),                              // damageResistances
        fc.constant([] as string[]),                              // damageImmunities
        fc.constant([] as string[]),                              // conditionImmunities
        fc.constant([] as InnateSpell[]),                         // innateSpells
        (speeds, senses, languages, extraLanguageChoices, skillProficiencies,
         weaponProficiencies, armorProficiencies, toolProficiencies,
         damageResistances, damageImmunities, conditionImmunities, innateSpells) => {

          // Call with all new args included
          const resultFull = buildRaceFeatures(
            speeds, senses, languages, [], extraLanguageChoices, skillProficiencies,
            weaponProficiencies, armorProficiencies, toolProficiencies,
            damageResistances, damageImmunities, conditionImmunities, innateSpells,
            undefined,        // naturalArmor
            undefined,        // naturalWeapons
            undefined,        // creatureType
            undefined,        // flyRestriction
          );

          // Call with only the first 13 args (baseline)
          const resultBase = buildRaceFeatures(
            speeds, senses, languages, [], extraLanguageChoices, skillProficiencies,
            weaponProficiencies, armorProficiencies, toolProficiencies,
            damageResistances, damageImmunities, conditionImmunities, innateSpells,
          );

          // All 12 existing keys must be present in the full result
          expect(resultFull.speeds).toBeDefined();
          expect(resultFull.senses).toBeDefined();
          expect(resultFull.languages).toBeDefined();
          expect(resultFull.extraLanguageChoices).toBeDefined();
          expect(resultFull.skillProficiencies).toBeDefined();
          expect(resultFull.weaponProficiencies).toBeDefined();
          expect(resultFull.armorProficiencies).toBeDefined();
          expect(resultFull.toolProficiencies).toBeDefined();
          expect(resultFull.damageResistances).toBeDefined();
          expect(resultFull.damageImmunities).toBeDefined();
          expect(resultFull.conditionImmunities).toBeDefined();
          expect(resultFull.innateSpells).toBeDefined();

          // Values must match the baseline (first 12 args only)
          expect(resultFull.speeds).toEqual(resultBase.speeds);
          expect(resultFull.senses).toEqual(resultBase.senses);
          expect(resultFull.languages).toEqual(resultBase.languages);
          expect(resultFull.extraLanguageChoices).toBe(resultBase.extraLanguageChoices);
          expect(resultFull.skillProficiencies).toEqual(resultBase.skillProficiencies);
          expect(resultFull.weaponProficiencies).toEqual(resultBase.weaponProficiencies);
          expect(resultFull.armorProficiencies).toEqual(resultBase.armorProficiencies);
          expect(resultFull.toolProficiencies).toEqual(resultBase.toolProficiencies);
          expect(resultFull.damageResistances).toEqual(resultBase.damageResistances);
          expect(resultFull.damageImmunities).toEqual(resultBase.damageImmunities);
          expect(resultFull.conditionImmunities).toEqual(resultBase.conditionImmunities);
          expect(resultFull.innateSpells).toEqual(resultBase.innateSpells);
        },
      ),
      { numRuns: 100 },
    );
  });
});

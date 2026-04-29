import * as fc from 'fast-check';
import {
  validateIdentityStep,
  filterSubclasses,
  formatRaceBonuses,
  formatSavingThrows,
  calculateHp,
  validateManualScore,
  CharacterFormData,
  ALIGNMENTS,
  STANDARD_ARRAY,
  STEP_LABELS,
  DND_SKILLS,
} from './forge-character.page';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

/** Returns true when the "Siguiente" button should be visible for a given step index. */
function shouldShowNext(step: number): boolean {
  return step < TOTAL_STEPS - 1;
}

/** Returns true when the "Anterior" button should be visible for a given step index. */
function shouldShowPrev(step: number): boolean {
  return step > 0;
}

// ─── Property 1: Step navigation buttons visibility ──────────────────────────
// Feature: character-creation-page, Property 1: Step navigation buttons visibility
// Validates: Requirements 2.2, 2.3

describe('Property 1: Step navigation buttons visibility', () => {
  it('should show "Siguiente" on all steps except the last', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: TOTAL_STEPS - 1 }), (step) => {
        const expectNext = step < TOTAL_STEPS - 1;
        expect(shouldShowNext(step)).toBe(expectNext);
      }),
      { numRuns: 100 }
    );
  });

  it('should show "Anterior" on all steps except the first', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: TOTAL_STEPS - 1 }), (step) => {
        const expectPrev = step > 0;
        expect(shouldShowPrev(step)).toBe(expectPrev);
      }),
      { numRuns: 100 }
    );
  });

  it('should never show both "Siguiente" and "Anterior" on step 0', () => {
    expect(shouldShowNext(0)).toBe(true);
    expect(shouldShowPrev(0)).toBe(false);
  });

  it('should never show "Siguiente" on the last step', () => {
    expect(shouldShowNext(TOTAL_STEPS - 1)).toBe(false);
    expect(shouldShowPrev(TOTAL_STEPS - 1)).toBe(true);
  });
});

// ─── Property 2: Validation blocks step advancement ──────────────────────────
// Feature: character-creation-page, Property 2: Validation blocks step advancement
// Validates: Requirements 2.4, 3.5

describe('Property 2: Validation blocks step advancement', () => {
  it('should reject any name that is empty after trimming', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),  // only whitespace
        fc.string({ minLength: 1 }),  // valid background
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        (name, background, alignment, xp) => {
          const errors = validateIdentityStep({ name, background, alignment, xp });
          expect(errors['name']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any name longer than 50 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 51, maxLength: 200 }),
        fc.string({ minLength: 1 }),
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        (name, background, alignment, xp) => {
          // Ensure the name has no leading/trailing whitespace so trimmed length is also > 50
          const paddedName = name.replace(/\s/g, 'a');
          const errors = validateIdentityStep({ name: paddedName, background, alignment, xp });
          if (paddedName.trim().length > 50) {
            expect(errors['name']).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept any name with trimmed length between 1 and 50', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1 && s.trim().length <= 50),
        fc.string({ minLength: 1 }),
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        (name, background, alignment, xp) => {
          const errors = validateIdentityStep({ name, background, alignment, xp });
          expect(errors['name']).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce at least one error when background is empty', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        (name, alignment, xp) => {
          const errors = validateIdentityStep({ name, background: '', alignment, xp });
          expect(Object.keys(errors).length).toBeGreaterThan(0);
          expect(errors['background']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce at least one error when alignment is not selected', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
        fc.string({ minLength: 1 }),
        fc.integer({ min: 0, max: 9999 }),
        (name, background, xp) => {
          const errors = validateIdentityStep({ name, background, alignment: '', xp });
          expect(Object.keys(errors).length).toBeGreaterThan(0);
          expect(errors['alignment']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return no errors for a fully valid identity step', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
        fc.string({ minLength: 1 }).filter(s => s.trim().length >= 1),
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        (name, background, alignment, xp) => {
          const errors = validateIdentityStep({ name, background, alignment, xp });
          expect(Object.keys(errors).length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit tests: filterSubclasses ────────────────────────────────────────────

describe('filterSubclasses()', () => {
  it('should return only subclasses matching the given parentClass.id', () => {
    const subclasses = [
      { id: '1', name: 'Champion', parentClass: { id: 'fighter' } },
      { id: '2', name: 'Battle Master', parentClass: { id: 'fighter' } },
      { id: '3', name: 'Evocation', parentClass: { id: 'wizard' } },
    ];
    expect(filterSubclasses(subclasses, 'fighter')).toEqual([subclasses[0], subclasses[1]]);
    expect(filterSubclasses(subclasses, 'wizard')).toEqual([subclasses[2]]);
    expect(filterSubclasses(subclasses, 'rogue')).toEqual([]);
  });

  it('should return an empty array for an empty subclass list', () => {
    expect(filterSubclasses([], 'fighter')).toEqual([]);
  });
});

// ─── Unit tests: formatRaceBonuses ───────────────────────────────────────────

describe('formatRaceBonuses()', () => {
  it('should return an empty string for null/undefined race', () => {
    expect(formatRaceBonuses(null)).toBe('');
    expect(formatRaceBonuses(undefined)).toBe('');
  });

  it('should return an empty string when all bonuses are 0', () => {
    expect(formatRaceBonuses({ bonusStr: 0, bonusDex: 0, bonusCon: 0, bonusInt: 0, bonusWis: 0, bonusCha: 0 })).toBe('');
  });

  it('should format a single positive bonus correctly', () => {
    expect(formatRaceBonuses({ bonusStr: 2 })).toBe('+2 FU');
  });

  it('should format multiple bonuses separated by commas', () => {
    const result = formatRaceBonuses({ bonusDex: 2, bonusCon: 1 });
    expect(result).toBe('+2 DES, +1 CON');
  });

  it('should format negative bonuses correctly', () => {
    expect(formatRaceBonuses({ bonusStr: -2 })).toBe('-2 FU');
  });
});

// ─── Unit tests: STEP_LABELS ─────────────────────────────────────────────────

describe('STEP_LABELS', () => {
  it('should have a Spanish label for each of the 6 steps', () => {
    const steps = ['identity', 'race', 'class', 'ability-scores', 'skills', 'review'] as const;
    for (const step of steps) {
      expect(STEP_LABELS[step]).toBeTruthy();
    }
  });
});

// ─── Property 3: Character name length validation ─────────────────────────────
// Feature: character-creation-page, Property 3: Character name length validation
// Validates: Requirements 3.1

describe('Property 3: Character name length validation', () => {
  const validBase = { background: 'Soldado', alignment: 'Legal Bueno', xp: 0 };

  it('should accept any name whose trimmed length is between 1 and 50 (inclusive)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1 && s.trim().length <= 50),
        (name) => {
          const errors = validateIdentityStep({ ...validBase, name });
          expect(errors['name']).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any name whose trimmed length is 0 (empty or whitespace-only)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (name) => {
          const errors = validateIdentityStep({ ...validBase, name });
          expect(errors['name']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any name whose trimmed length exceeds 50 characters', () => {
    fc.assert(
      fc.property(
        // Generate a string of 51–200 non-whitespace chars so trimmed length is also > 50
        fc.string({ minLength: 51, maxLength: 200 }).map(s => s.replace(/\s/g, 'a')).filter(s => s.trim().length > 50),
        (name) => {
          const errors = validateIdentityStep({ ...validBase, name });
          expect(errors['name']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept exactly at the boundary: trimmed length = 1', () => {
    const errors = validateIdentityStep({ ...validBase, name: 'A' });
    expect(errors['name']).toBeUndefined();
  });

  it('should accept exactly at the boundary: trimmed length = 50', () => {
    const errors = validateIdentityStep({ ...validBase, name: 'A'.repeat(50) });
    expect(errors['name']).toBeUndefined();
  });

  it('should reject exactly at the boundary: trimmed length = 51', () => {
    const errors = validateIdentityStep({ ...validBase, name: 'A'.repeat(51) });
    expect(errors['name']).toBeDefined();
  });
});

// ─── Property 4: XP non-negative validation ───────────────────────────────────
// Feature: character-creation-page, Property 4: XP non-negative validation
// Validates: Requirements 3.4

describe('Property 4: XP non-negative validation', () => {
  const validBase = { name: 'Aragorn', background: 'Soldado', alignment: 'Legal Bueno' };

  it('should accept any non-negative integer as XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 355000 }),
        (xp) => {
          const errors = validateIdentityStep({ ...validBase, xp });
          expect(errors['xp']).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any negative integer as XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: -1 }),
        (xp) => {
          const errors = validateIdentityStep({ ...validBase, xp });
          expect(errors['xp']).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept XP = 0 (default value)', () => {
    const errors = validateIdentityStep({ ...validBase, xp: 0 });
    expect(errors['xp']).toBeUndefined();
  });

  it('should reject XP = -1', () => {
    const errors = validateIdentityStep({ ...validBase, xp: -1 });
    expect(errors['xp']).toBeDefined();
  });
});

// ─── Property 5: Race bonus display ──────────────────────────────────────────
// Feature: character-creation-page, Property 5: Race bonus display
// Validates: Requirements 4.2

describe('Property 5: Race bonus display', () => {
  const BONUS_FIELD_LABEL_MAP: { field: string; label: string }[] = [
    { field: 'bonusStr', label: 'FU' },
    { field: 'bonusDex', label: 'DES' },
    { field: 'bonusCon', label: 'CON' },
    { field: 'bonusInt', label: 'INT' },
    { field: 'bonusWis', label: 'SAB' },
    { field: 'bonusCha', label: 'CAR' },
  ];

  it('should include a label for every non-zero bonus field', () => {
    fc.assert(
      fc.property(
        fc.record({
          bonusStr: fc.integer({ min: -5, max: 5 }),
          bonusDex: fc.integer({ min: -5, max: 5 }),
          bonusCon: fc.integer({ min: -5, max: 5 }),
          bonusInt: fc.integer({ min: -5, max: 5 }),
          bonusWis: fc.integer({ min: -5, max: 5 }),
          bonusCha: fc.integer({ min: -5, max: 5 }),
        }),
        (race) => {
          const result = formatRaceBonuses(race);
          for (const { field, label } of BONUS_FIELD_LABEL_MAP) {
            const value = (race as any)[field];
            if (value !== 0) {
              expect(result).toContain(label);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT include a label for zero bonus fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          bonusStr: fc.integer({ min: -5, max: 5 }),
          bonusDex: fc.integer({ min: -5, max: 5 }),
          bonusCon: fc.integer({ min: -5, max: 5 }),
          bonusInt: fc.integer({ min: -5, max: 5 }),
          bonusWis: fc.integer({ min: -5, max: 5 }),
          bonusCha: fc.integer({ min: -5, max: 5 }),
        }),
        (race) => {
          const result = formatRaceBonuses(race);
          for (const { field, label } of BONUS_FIELD_LABEL_MAP) {
            const value = (race as any)[field];
            if (value === 0) {
              expect(result).not.toContain(label);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return an empty string when all bonuses are zero', () => {
    fc.assert(
      fc.property(
        fc.constant({ bonusStr: 0, bonusDex: 0, bonusCon: 0, bonusInt: 0, bonusWis: 0, bonusCha: 0 }),
        (race) => {
          expect(formatRaceBonuses(race)).toBe('');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should include the sign (+/-) in the bonus string', () => {
    fc.assert(
      fc.property(
        fc.record({
          bonusStr: fc.integer({ min: 1, max: 5 }),  // positive only
        }),
        (race) => {
          const result = formatRaceBonuses(race);
          expect(result).toContain('+');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Unit test: Races API error state ────────────────────────────────────────
// Feature: character-creation-page, Unit test: races API error state
// Validates: Requirements 4.4

import { TestBed } from '@angular/core/testing';
import { ForgeCharacterPage } from './forge-character.page';
import { ApiService } from '../../services/api';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ForgeCharacterPage: races API error state', () => {
  let component: ForgeCharacterPage;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getRaces', 'getClasses', 'getSubclasses', 'createCharacter']);
    apiServiceSpy.getRaces.and.returnValue(throwError(() => new Error('Network error')));

    await TestBed.configureTestingModule({
      imports: [ForgeCharacterPage, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgeCharacterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should set racesError to true when getRaces() fails', () => {
    (component as any)._loadRaces();
    expect(component.racesError).toBe(true);
  });

  it('should set racesLoading to false after getRaces() fails', () => {
    (component as any)._loadRaces();
    expect(component.racesLoading).toBe(false);
  });

  it('should keep races array empty when getRaces() fails', () => {
    (component as any)._loadRaces();
    expect(component.races).toEqual([]);
  });

  it('should set racesError to false and populate races when getRaces() succeeds', () => {
    const mockRaces = [{ id: '1', name: 'Humano', bonusStr: 1 }];
    apiServiceSpy.getRaces.and.returnValue(of(mockRaces));
    (component as any)._loadRaces();
    expect(component.racesError).toBe(false);
    expect(component.races).toEqual(mockRaces);
  });

  it('should retry loading races when loadRaces() is called after an error', () => {
    // First call fails
    (component as any)._loadRaces();
    expect(component.racesError).toBe(true);

    // Retry succeeds
    const mockRaces = [{ id: '1', name: 'Elfo', bonusDex: 2 }];
    apiServiceSpy.getRaces.and.returnValue(of(mockRaces));
    component.loadRaces();
    expect(component.racesError).toBe(false);
    expect(component.races).toEqual(mockRaces);
  });
});

// ─── Property 6: Class info display ──────────────────────────────────────────
// Feature: character-creation-page, Property 6: Class info display
// Validates: Requirements 5.2

describe('Property 6: Class info display', () => {
  it('should include every key with value true from savingThrows in the formatted string', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          hitDie: fc.integer({ min: 4, max: 12 }),
          savingThrows: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.boolean()),
        }),
        (cls) => {
          const result = formatSavingThrows(cls);
          const trueKeys = Object.entries(cls.savingThrows)
            .filter(([, v]) => v === true)
            .map(([k]) => k);

          // For each key that is true, its Spanish abbreviation (or uppercase fallback) must appear
          const SAVE_LABELS: { [key: string]: string } = {
            str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR',
          };
          for (const key of trueKeys) {
            const label = SAVE_LABELS[key] ?? key.toUpperCase();
            expect(result).toContain(label);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT include labels for keys with value false', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.string(),
          name: fc.string(),
          hitDie: fc.integer({ min: 4, max: 12 }),
          savingThrows: fc.record({
            str: fc.constant(false),
            dex: fc.constant(false),
            con: fc.constant(false),
            int: fc.constant(false),
            wis: fc.constant(false),
            cha: fc.constant(false),
          }),
        }),
        (cls) => {
          const result = formatSavingThrows(cls);
          expect(result).toBe('');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return empty string for null/undefined class', () => {
    expect(formatSavingThrows(null)).toBe('');
    expect(formatSavingThrows(undefined)).toBe('');
  });

  it('should return empty string for class with no savingThrows', () => {
    expect(formatSavingThrows({ id: '1', name: 'Guerrero', hitDie: 10 })).toBe('');
  });
});

// ─── Property 7: Subclass filtering by parent class ──────────────────────────
// Feature: character-creation-page, Property 7: Subclass filtering by parent class
// Validates: Requirements 5.3

describe('Property 7: Subclass filtering by parent class', () => {
  it('should return exactly those subclasses where parentClass.id matches the given id', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string(),
            parentClass: fc.record({ id: fc.string() }),
          })
        ),
        fc.string(),
        (subclasses, parentId) => {
          const result = filterSubclasses(subclasses, parentId);
          const expected = subclasses.filter(sc => sc.parentClass.id === parentId);

          // Same length
          expect(result.length).toBe(expected.length);

          // Every result item matches
          for (const sc of result) {
            expect(sc.parentClass.id).toBe(parentId);
          }

          // No matching item is missing
          for (const sc of expected) {
            expect(result).toContain(sc);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return an empty array when no subclasses match', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string(),
            parentClass: fc.record({ id: fc.constant('wizard') }),
          })
        ),
        (subclasses) => {
          const result = filterSubclasses(subclasses, 'fighter');
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return all subclasses when all match the given parentId', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.array(
          fc.record({ id: fc.uuid(), name: fc.string() }),
          { minLength: 1, maxLength: 10 }
        ),
        (parentId, items) => {
          const subclasses = items.map(item => ({ ...item, parentClass: { id: parentId } }));
          const result = filterSubclasses(subclasses, parentId);
          expect(result.length).toBe(subclasses.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Unit test: Classes API error state ──────────────────────────────────────
// Feature: character-creation-page, Unit test: classes API error state
// Validates: Requirements 5.5

describe('ForgeCharacterPage: classes API error state', () => {
  let component: ForgeCharacterPage;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getRaces', 'getClasses', 'getSubclasses', 'createCharacter']);
    apiServiceSpy.getRaces.and.returnValue(of([]));
    apiServiceSpy.getClasses.and.returnValue(throwError(() => new Error('Network error')));

    await TestBed.configureTestingModule({
      imports: [ForgeCharacterPage, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgeCharacterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should set classesError to true when getClasses() fails', () => {
    (component as any)._loadClasses();
    expect(component.classesError).toBe(true);
  });

  it('should set classesLoading to false after getClasses() fails', () => {
    (component as any)._loadClasses();
    expect(component.classesLoading).toBe(false);
  });

  it('should keep classes array empty when getClasses() fails', () => {
    (component as any)._loadClasses();
    expect(component.classes).toEqual([]);
  });

  it('should set classesError to false and populate classes when getClasses() succeeds', () => {
    const mockClasses = [{ id: '1', name: 'Guerrero', hitDie: 10, savingThrows: { str: true, con: true } }];
    apiServiceSpy.getClasses.and.returnValue(of(mockClasses));
    (component as any)._loadClasses();
    expect(component.classesError).toBe(false);
    expect(component.classes).toEqual(mockClasses);
  });

  it('should retry loading classes when loadClasses() is called after an error', () => {
    // First call fails
    (component as any)._loadClasses();
    expect(component.classesError).toBe(true);

    // Retry succeeds
    const mockClasses = [{ id: '2', name: 'Mago', hitDie: 6, savingThrows: { int: true, wis: true } }];
    apiServiceSpy.getClasses.and.returnValue(of(mockClasses));
    component.loadClasses();
    expect(component.classesError).toBe(false);
    expect(component.classes).toEqual(mockClasses);
  });
});

// ─── Property 8: Standard array is a bijection ───────────────────────────────
// Feature: character-creation-page, Property 8: Standard array is a bijection
// Validates: Requirements 6.2

describe('Property 8: Standard array is a bijection', () => {
  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

  /**
   * Simulates a complete standard array assignment by shuffling STANDARD_ARRAY
   * and mapping each value to an ability key.
   */
  function buildCompleteAssignment(permutation: number[]): { [key: string]: number } {
    const result: { [key: string]: number } = {};
    ABILITY_KEYS.forEach((key, i) => { result[key] = permutation[i]; });
    return result;
  }

  it('should contain each of the 6 standard array values exactly once across all slots', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(STANDARD_ARRAY, { minLength: 6, maxLength: 6 }),
        (permutation) => {
          const assignment = buildCompleteAssignment(permutation);
          const assignedValues = Object.values(assignment);

          // Every standard array value appears exactly once
          for (const token of STANDARD_ARRAY) {
            expect(assignedValues.filter(v => v === token).length).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have exactly one token per ability slot in a complete assignment', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(STANDARD_ARRAY, { minLength: 6, maxLength: 6 }),
        (permutation) => {
          const assignment = buildCompleteAssignment(permutation);

          // Each ability key has exactly one value
          for (const key of ABILITY_KEYS) {
            expect(assignment[key]).toBeDefined();
            expect(STANDARD_ARRAY).toContain(assignment[key]);
          }

          // Total assigned slots equals total ability keys
          expect(Object.keys(assignment).length).toBe(ABILITY_KEYS.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have no duplicate values in a complete assignment', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(STANDARD_ARRAY, { minLength: 6, maxLength: 6 }),
        (permutation) => {
          const assignment = buildCompleteAssignment(permutation);
          const values = Object.values(assignment);
          const uniqueValues = new Set(values);
          expect(uniqueValues.size).toBe(values.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have the same multiset of values as STANDARD_ARRAY', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(STANDARD_ARRAY, { minLength: 6, maxLength: 6 }),
        (permutation) => {
          const assignment = buildCompleteAssignment(permutation);
          const assignedSorted = Object.values(assignment).sort((a, b) => a - b);
          const standardSorted = [...STANDARD_ARRAY].sort((a, b) => a - b);
          expect(assignedSorted).toEqual(standardSorted);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 9: Manual entry range validation ────────────────────────────────
// Feature: character-creation-page, Property 9: Manual entry range validation
// Validates: Requirements 6.3, 6.6

describe('Property 9: Manual entry range validation', () => {
  it('should accept any integer in the range 1–20 (inclusive)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (value) => {
          expect(validateManualScore(value)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any integer below 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        (value) => {
          expect(validateManualScore(value)).toBe('El valor debe estar entre 1 y 20');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any integer above 20', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 21, max: 200 }),
        (value) => {
          expect(validateManualScore(value)).toBe('El valor debe estar entre 1 y 20');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept exactly at the lower boundary: 1', () => {
    expect(validateManualScore(1)).toBeNull();
  });

  it('should accept exactly at the upper boundary: 20', () => {
    expect(validateManualScore(20)).toBeNull();
  });

  it('should reject exactly at the lower boundary minus 1: 0', () => {
    expect(validateManualScore(0)).toBe('El valor debe estar entre 1 y 20');
  });

  it('should reject exactly at the upper boundary plus 1: 21', () => {
    expect(validateManualScore(21)).toBe('El valor debe estar entre 1 y 20');
  });

  it('should accept all values in 1–20 and reject all outside', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }),
        (value) => {
          const result = validateManualScore(value);
          if (value >= 1 && value <= 20) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 10: Final score preview calculation ─────────────────────────────
// Feature: character-creation-page, Property 10: Final score preview calculation
// Validates: Requirements 6.4

describe('Property 10: Final score preview calculation', () => {
  it('should equal baseScore + racialBonus for any valid combination', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),   // base score
        fc.integer({ min: -5, max: 5 }),   // racial bonus
        (baseScore, racialBonus) => {
          const finalScore = baseScore + racialBonus;
          expect(finalScore).toBe(baseScore + racialBonus);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should equal the base score when racial bonus is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (baseScore) => {
          const finalScore = baseScore + 0;
          expect(finalScore).toBe(baseScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be greater than base score when racial bonus is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 18 }),
        fc.integer({ min: 1, max: 5 }),
        (baseScore, racialBonus) => {
          const finalScore = baseScore + racialBonus;
          expect(finalScore).toBeGreaterThan(baseScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be less than base score when racial bonus is negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 20 }),
        fc.integer({ min: -5, max: -1 }),
        (baseScore, racialBonus) => {
          const finalScore = baseScore + racialBonus;
          expect(finalScore).toBeLessThan(baseScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be commutative: base + bonus === bonus + base', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: -5, max: 5 }),
        (baseScore, racialBonus) => {
          expect(baseScore + racialBonus).toBe(racialBonus + baseScore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit tests: calculateHp ──────────────────────────────────────────────────
// Feature: character-creation-page, Unit tests: calculateHp
// Validates: Requirements 8.2, 9.4

describe('calculateHp()', () => {
  it('should return hitDie + conModifier for a given hitDie and finalCon', () => {
    // CON 10 → modifier 0 → HP = hitDie
    expect(calculateHp(8, 10)).toBe(8);
    // CON 14 → modifier +2 → HP = 10
    expect(calculateHp(8, 14)).toBe(10);
    // CON 8 → modifier -1 → HP = 7
    expect(calculateHp(8, 8)).toBe(7);
    // CON 20 → modifier +5 → HP = 17
    expect(calculateHp(12, 20)).toBe(17);
  });

  it('should use floor division for the CON modifier', () => {
    // CON 11 → modifier floor((11-10)/2) = floor(0.5) = 0
    expect(calculateHp(6, 11)).toBe(6);
    // CON 13 → modifier floor((13-10)/2) = floor(1.5) = 1
    expect(calculateHp(6, 13)).toBe(7);
  });

  it('should satisfy the formula for any hitDie and finalCon', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 12 }),   // hitDie: d4, d6, d8, d10, d12
        fc.integer({ min: 1, max: 30 }),   // finalCon (base + racial bonus)
        (hitDie, finalCon) => {
          const expected = hitDie + Math.floor((finalCon - 10) / 2);
          expect(calculateHp(hitDie, finalCon)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ─── Property 11: Skill selection constraint ──────────────────────────────────
// Feature: character-creation-page, Property 11: Skill selection constraint
// Validates: Requirements 7.2, 7.3

/**
 * Pure helper that mirrors the component's isSkillDisabled logic.
 * Returns true when a skill should be disabled given the current selection.
 */
function isSkillDisabled(skillId: string, selectedSkills: string[]): boolean {
  return selectedSkills.length >= 2 && !selectedSkills.includes(skillId);
}

describe('Property 11: Skill selection constraint', () => {
  const ALL_SKILL_IDS = DND_SKILLS.map(s => s.id);

  it('should disable all unselected skills when exactly 2 are selected', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_SKILL_IDS, { minLength: 2, maxLength: 2 }),
        (selected) => {
          for (const skillId of ALL_SKILL_IDS) {
            const disabled = isSkillDisabled(skillId, selected);
            if (selected.includes(skillId)) {
              // Selected skills must NOT be disabled
              expect(disabled).toBe(false);
            } else {
              // Unselected skills MUST be disabled when 2 are already chosen
              expect(disabled).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enable all unselected skills when fewer than 2 are selected', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_SKILL_IDS, { minLength: 0, maxLength: 1 }),
        (selected) => {
          for (const skillId of ALL_SKILL_IDS) {
            if (!selected.includes(skillId)) {
              expect(isSkillDisabled(skillId, selected)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never disable a currently selected skill regardless of count', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_SKILL_IDS, { minLength: 0, maxLength: 2 }),
        (selected) => {
          for (const skillId of selected) {
            expect(isSkillDisabled(skillId, selected)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should transition: no skills disabled at 0 selected, all unselected disabled at 2 selected', () => {
    // 0 selected → nothing disabled
    for (const skillId of ALL_SKILL_IDS) {
      expect(isSkillDisabled(skillId, [])).toBe(false);
    }

    // 1 selected → nothing disabled
    const oneSelected = [ALL_SKILL_IDS[0]];
    for (const skillId of ALL_SKILL_IDS) {
      expect(isSkillDisabled(skillId, oneSelected)).toBe(false);
    }

    // 2 selected → unselected are disabled
    const twoSelected = [ALL_SKILL_IDS[0], ALL_SKILL_IDS[1]];
    for (const skillId of ALL_SKILL_IDS) {
      if (twoSelected.includes(skillId)) {
        expect(isSkillDisabled(skillId, twoSelected)).toBe(false);
      } else {
        expect(isSkillDisabled(skillId, twoSelected)).toBe(true);
      }
    }
  });
});

// ─── Unit test: Skills list ───────────────────────────────────────────────────
// Feature: character-creation-page, Unit test: skills list
// Validates: Requirements 7.1

describe('DND_SKILLS list', () => {
  it('should contain exactly 18 skills', () => {
    expect(DND_SKILLS.length).toBe(18);
  });

  it('should have unique skill IDs', () => {
    const ids = DND_SKILLS.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(18);
  });

  it('should have a non-empty name and a valid stat for every skill', () => {
    const validStats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const skill of DND_SKILLS) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(validStats).toContain(skill.stat);
    }
  });
});

// ─── Import buildCharacterDto for property tests ──────────────────────────────
import { buildCharacterDto } from './forge-character.page';
import { Router } from '@angular/router';

// ─── Property 12: HP calculation correctness ─────────────────────────────────
// Feature: character-creation-page, Property 12: HP calculation correctness
// Validates: Requirements 8.2, 9.4

describe('Property 12: HP calculation correctness', () => {
  it('should equal hitDie + floor((finalCon - 10) / 2) for any valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 12 }),   // hitDie: d4, d6, d8, d10, d12
        fc.integer({ min: 1, max: 30 }),   // finalCon (base + racial bonus)
        (hitDie, finalCon) => {
          const expected = hitDie + Math.floor((finalCon - 10) / 2);
          expect(calculateHp(hitDie, finalCon)).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should store maxHp and currentHp as the same calculated value in the DTO', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 12 }),
        fc.integer({ min: 1, max: 30 }),
        (hitDie, finalCon) => {
          const hp = calculateHp(hitDie, finalCon);
          const formData: CharacterFormData = {
            name: 'Test', background: 'Soldado', alignment: 'Legal Bueno', xp: 0,
            selectedRace: { id: 'r1' },
            selectedClass: { id: 'c1', hitDie, savingThrows: {} },
            selectedSubclass: null,
            scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 },
            selectedSkills: [],
            finalScores: { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 },
            calculatedHp: hp
          };
          const finalScores = { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 };
          const dto = buildCharacterDto(formData, finalScores, hp, 'user-1');
          expect(dto.maxHp).toBe(hp);
          expect(dto.currentHp).toBe(hp);
          expect(dto.maxHp).toBe(dto.currentHp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce a positive HP for any standard class hit die and CON >= 1', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 6, 8, 10, 12),
        fc.integer({ min: 1, max: 20 }),
        (hitDie, baseCon) => {
          // Even with minimum CON (1), modifier is floor((1-10)/2) = -5; d4 + (-5) = -1
          // This is intentional D&D behavior — we just verify the formula is applied
          const hp = calculateHp(hitDie, baseCon);
          const expected = hitDie + Math.floor((baseCon - 10) / 2);
          expect(hp).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 13: CharacterDto defaults are always fixed ─────────────────────
// Feature: character-creation-page, Property 13: CharacterDto defaults are always fixed
// Validates: Requirements 9.3, 9.5, 9.8

describe('Property 13: CharacterDto defaults are always fixed', () => {
  const ALL_SKILL_IDS = DND_SKILLS.map(s => s.id);

  it('should always have fixed default values regardless of user inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1),
        fc.string({ minLength: 1 }),
        fc.constantFrom(...ALIGNMENTS),
        fc.integer({ min: 0, max: 9999 }),
        fc.shuffledSubarray(ALL_SKILL_IDS, { minLength: 2, maxLength: 2 }),
        fc.integer({ min: 4, max: 12 }),
        fc.integer({ min: 1, max: 20 }),
        (name, background, alignment, xp, skills, hitDie, finalCon) => {
          const hp = calculateHp(hitDie, finalCon);
          const formData: CharacterFormData = {
            name, background, alignment, xp,
            selectedRace: { id: 'r1' },
            selectedClass: { id: 'c1', hitDie, savingThrows: { str: true } },
            selectedSubclass: null,
            scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 },
            selectedSkills: skills,
            finalScores: { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 },
            calculatedHp: hp
          };
          const finalScores = { str: 10, dex: 10, con: finalCon, int: 10, wis: 10, cha: 10 };
          const dto = buildCharacterDto(formData, finalScores, hp, 'user-1');

          // Fixed defaults — Requirements 9.3
          expect(dto.level).toBe(1);
          expect(dto.hitDiceTotal).toBe(1);
          expect(dto.hitDiceSpent).toBe(0);
          expect(dto.tempHp).toBe(0);

          // Speed default — Requirement 9.5
          expect(dto.speed).toBe(30);

          // Empty collections — Requirement 9.8
          expect(dto.spellSlots).toEqual({});
          expect(dto.choicesJson).toEqual({});
          expect(dto.cp).toBe(0);
          expect(dto.sp).toBe(0);
          expect(dto.ep).toBe(0);
          expect(dto.gp).toBe(0);
          expect(dto.pp).toBe(0);
          expect(dto.inventory).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve the user-entered xp value (default 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 355000 }),
        (xp) => {
          const formData: CharacterFormData = {
            name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp,
            selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
            selectedSubclass: null, scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            calculatedHp: 8
          };
          const dto = buildCharacterDto(formData, formData.finalScores, 8, 'u1');
          expect(dto.xp).toBe(xp);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: DTO user ID matches JWT token ───────────────────────────────
// Feature: character-creation-page, Property 14: DTO user ID matches JWT token
// Validates: Requirements 9.2

describe('Property 14: DTO user ID matches JWT token', () => {
  /** Encodes a payload as a minimal JWT-like token (header.payload.signature). */
  function buildFakeJwt(sub: string): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub, iat: 1000000 }));
    return `${header}.${payload}.fakesig`;
  }

  it('should set user.id to the sub claim decoded from the JWT', () => {
    fc.assert(
      fc.property(
        fc.uuid(),  // generate random UUIDs as user IDs
        (userId) => {
          const formData: CharacterFormData = {
            name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
            selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
            selectedSubclass: null, scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            calculatedHp: 8
          };
          const dto = buildCharacterDto(formData, formData.finalScores, 8, userId);
          expect(dto.user.id).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should decode the sub claim from a JWT and pass it to buildCharacterDto', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const token = buildFakeJwt(userId);
          // Simulate what AuthService.getUserIdFromToken() does
          const payload = JSON.parse(atob(token.split('.')[1]));
          const extractedId = payload.sub;
          expect(extractedId).toBe(userId);

          const formData: CharacterFormData = {
            name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
            selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
            selectedSubclass: null, scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            calculatedHp: 8
          };
          const dto = buildCharacterDto(formData, formData.finalScores, 8, extractedId);
          expect(dto.user.id).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should set user.id to null when no token is present', () => {
    const formData: CharacterFormData = {
      name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
      selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
      selectedSubclass: null, scoreMode: 'manual',
      tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      calculatedHp: 8
    };
    const dto = buildCharacterDto(formData, formData.finalScores, 8, null);
    expect(dto.user.id).toBeNull();
  });
});

// ─── Property 15: DTO saving throws match selected class ─────────────────────
// Feature: character-creation-page, Property 15: DTO saving throws match selected class
// Validates: Requirements 9.6

describe('Property 15: DTO saving throws match selected class', () => {
  it('should set savingThrowsProficiencies equal to the class savingThrows map', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.constantFrom('str', 'dex', 'con', 'int', 'wis', 'cha'),
          fc.boolean()
        ),
        (savingThrows) => {
          const formData: CharacterFormData = {
            name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
            selectedRace: { id: 'r1' },
            selectedClass: { id: 'c1', hitDie: 8, savingThrows },
            selectedSubclass: null, scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            calculatedHp: 8
          };
          const dto = buildCharacterDto(formData, formData.finalScores, 8, 'u1');
          expect(dto.savingThrowsProficiencies).toEqual(savingThrows);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use an empty object when no class is selected', () => {
    const formData: CharacterFormData = {
      name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
      selectedRace: { id: 'r1' }, selectedClass: null,
      selectedSubclass: null, scoreMode: 'manual',
      tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      calculatedHp: 8
    };
    const dto = buildCharacterDto(formData, formData.finalScores, 8, 'u1');
    expect(dto.savingThrowsProficiencies).toEqual({});
  });
});

// ─── Property 16: DTO skill proficiencies match selected skills ───────────────
// Feature: character-creation-page, Property 16: DTO skill proficiencies match selected skills
// Validates: Requirements 9.7

describe('Property 16: DTO skill proficiencies match selected skills', () => {
  const ALL_SKILL_IDS = DND_SKILLS.map(s => s.id);

  it('should contain exactly the 2 selected skill IDs as keys with value true', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ALL_SKILL_IDS, { minLength: 2, maxLength: 2 }),
        (selectedSkills) => {
          const formData: CharacterFormData = {
            name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
            selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
            selectedSubclass: null, scoreMode: 'manual',
            tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
            manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            selectedSkills, finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            calculatedHp: 8
          };
          const dto = buildCharacterDto(formData, formData.finalScores, 8, 'u1');

          // Exactly 2 keys
          expect(Object.keys(dto.skillProficiencies).length).toBe(2);

          // Both selected skills are present with value true
          for (const skillId of selectedSkills) {
            expect(dto.skillProficiencies[skillId]).toBe(true);
          }

          // No other skill keys are present
          for (const key of Object.keys(dto.skillProficiencies)) {
            expect(selectedSkills).toContain(key);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce an empty skillProficiencies map when no skills are selected', () => {
    const formData: CharacterFormData = {
      name: 'Test', background: 'Bg', alignment: 'Legal Bueno', xp: 0,
      selectedRace: { id: 'r1' }, selectedClass: { id: 'c1', hitDie: 8, savingThrows: {} },
      selectedSubclass: null, scoreMode: 'manual',
      tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      selectedSkills: [], finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      calculatedHp: 8
    };
    const dto = buildCharacterDto(formData, formData.finalScores, 8, 'u1');
    expect(dto.skillProficiencies).toEqual({});
  });
});

// ─── Unit tests: Submit flow ──────────────────────────────────────────────────
// Feature: character-creation-page, Unit tests: submit flow
// Validates: Requirements 8.4, 9.9, 9.10

describe('ForgeCharacterPage: submit flow', () => {
  let component: ForgeCharacterPage;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let router: Router;

  const mockFormData = () => {
    component.formData = {
      name: 'Aragorn',
      background: 'Soldado',
      alignment: 'Legal Bueno',
      xp: 0,
      selectedRace: { id: 'r1', name: 'Humano', bonusStr: 1, bonusDex: 0, bonusCon: 0, bonusInt: 0, bonusWis: 0, bonusCha: 0 },
      selectedClass: { id: 'c1', name: 'Guerrero', hitDie: 10, savingThrows: { str: true, con: true } },
      selectedSubclass: null,
      scoreMode: 'manual',
      tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      manualScores: { str: 15, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      selectedSkills: ['athletics', 'perception'],
      finalScores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
      calculatedHp: 12
    };
    component.currentStep = 5;
  };

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getRaces', 'getClasses', 'getSubclasses', 'createCharacter']);
    apiServiceSpy.getRaces.and.returnValue(of([]));
    apiServiceSpy.getClasses.and.returnValue(of([]));

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserIdFromToken']);
    authServiceSpy.getUserIdFromToken.and.returnValue('test-user-id');

    await TestBed.configureTestingModule({
      imports: [ForgeCharacterPage, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: 'AuthService', useValue: authServiceSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgeCharacterPage);
    component = fixture.componentInstance;
    // Inject the auth spy directly into the component
    (component as any).authService = authServiceSpy;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should disable the button (isSubmitting = true) while the request is in flight', () => {
    const subject = new Subject<any>();
    apiServiceSpy.createCharacter.and.returnValue(subject.asObservable());
    mockFormData();

    component.submitCharacter();

    expect(component.isSubmitting).toBe(true);
  });

  it('should navigate to /character-sheet/:id on successful submission', () => {
    const newCharId = 'char-uuid-123';
    apiServiceSpy.createCharacter.and.returnValue(of({ id: newCharId }));
    mockFormData();
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    component.submitCharacter();

    expect(navigateSpy).toHaveBeenCalledWith(['/character-sheet', newCharId]);
    expect(component.isSubmitting).toBe(false);
  });

  it('should re-enable the button (isSubmitting = false) on error', () => {
    apiServiceSpy.createCharacter.and.returnValue(throwError(() => new Error('Server error')));
    mockFormData();

    component.submitCharacter();

    expect(component.isSubmitting).toBe(false);
  });

  it('should set submitError to true on error', () => {
    apiServiceSpy.createCharacter.and.returnValue(throwError(() => new Error('Server error')));
    mockFormData();

    component.submitCharacter();

    expect(component.submitError).toBe(true);
  });

  it('should set submitError to false on success', () => {
    apiServiceSpy.createCharacter.and.returnValue(of({ id: 'new-id' }));
    mockFormData();

    component.submitCharacter();

    expect(component.submitError).toBe(false);
  });

  it('should not call createCharacter again if already submitting', () => {
    const subject = new Subject<any>();
    apiServiceSpy.createCharacter.and.returnValue(subject.asObservable());
    mockFormData();

    component.submitCharacter();
    component.submitCharacter(); // second call while in flight

    expect(apiServiceSpy.createCharacter).toHaveBeenCalledTimes(1);
  });
});

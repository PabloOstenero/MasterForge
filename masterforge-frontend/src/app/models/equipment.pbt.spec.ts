import * as fc from 'fast-check';
import {
  isStructuredEquipment,
  serializeEquipment,
  deserializeEquipment,
  resolveInventory,
  StructuredEquipment,
  ItemSummary,
} from './equipment.models';

// ---------------------------------------------------------------------------
// Helper functions (mirrors component logic for pure-function testing)
// ---------------------------------------------------------------------------

// Helper: mirrors ForgeCharacterPage.activeSteps getter logic
function computeActiveSteps(selectedClass: any): string[] {
  const equipment = selectedClass?.classFeatures?.startingEquipment;
  const hasChoiceSets = isStructuredEquipment(equipment) && equipment.choiceSets.length > 0;
  if (hasChoiceSets) {
    return ['identity', 'race', 'class', 'equipment', 'ability-scores', 'skills', 'review'];
  }
  return ['identity', 'race', 'class', 'ability-scores', 'skills', 'review'];
}

// Helper: mirrors ForgeCharacterPage._validateEquipmentStep() logic
function validateEquipmentStep(
  equipment: StructuredEquipment,
  selections: Record<number, number>
): Record<string, string> {
  for (let i = 0; i < equipment.choiceSets.length; i++) {
    if (selections[i] == null) {
      return { equipment: 'Debes seleccionar una opción para cada conjunto de equipamiento.' };
    }
  }
  return {};
}

// Helper: mirrors StartingEquipmentPickerComponent.onSearchInput() filter logic
function filterItems(catalog: ItemSummary[], query: string): ItemSummary[] {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  return catalog.filter(item => item.name.toLowerCase().includes(lower));
}

// Helper: mirrors quantity validator (Validators.min(1))
function validateQuantity(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

// Helper: mirrors label validator (Validators.required + Validators.maxLength(100))
function validateLabel(label: string): boolean {
  return label.trim().length > 0 && label.length <= 100;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Item ID generator: short alphanumeric strings starting with a letter
const itemIdArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

// ItemSummary generator
const itemSummaryArb = fc.record({
  id: itemIdArb,
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom('weapon', 'armor', 'tool', 'gear'),
  weight: fc.integer({ min: 0, max: 50 }),
});

// FixedGrant generator
const fixedGrantArb = fc.record({
  itemId: itemIdArb,
  itemName: fc.string({ minLength: 1, maxLength: 20 }),
  itemType: fc.constantFrom('weapon', 'armor', 'tool', 'gear'),
  quantity: fc.integer({ min: 1, max: 99 }),
});

// EquipmentOption generator
const equipmentOptionArb = fc.record({
  lines: fc.array(
    fc.record({
      itemId: itemIdArb,
      itemName: fc.string({ minLength: 1, maxLength: 20 }),
      itemType: fc.constantFrom('weapon', 'armor', 'tool', 'gear'),
      quantity: fc.integer({ min: 1, max: 99 }),
    }),
    { minLength: 1, maxLength: 3 }
  ),
});

// ChoiceSet generator
const choiceSetArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  options: fc.array(equipmentOptionArb, { minLength: 2, maxLength: 4 }),
});

// StructuredEquipment generator
const structuredEquipmentArb = fc.record({
  version: fc.constant('structured' as const),
  fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 5 }),
  choiceSets: fc.array(choiceSetArb, { minLength: 0, maxLength: 3 }),
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('Starting Equipment Picker — Property-Based Tests', () => {

  // ─── Property 1: Serialization round-trip ──────────────────────────────────

  describe('Property 1: Serialization round-trip', () => {
    it('serializeEquipment then deserializeEquipment produces structurally equivalent object', () => {
      // Feature: starting-equipment-picker, Property 1: Serialization round-trip preserves structured equipment
      expect(() =>
        fc.assert(
          fc.property(structuredEquipmentArb, (equipment) => {
            // Build catalog from all item IDs present in the equipment
            const allIds = new Set<string>();
            for (const g of equipment.fixedGrants) {
              allIds.add(g.itemId);
            }
            for (const cs of equipment.choiceSets) {
              for (const opt of cs.options) {
                for (const line of opt.lines) {
                  allIds.add(line.itemId);
                }
              }
            }

            const catalog: ItemSummary[] = Array.from(allIds).map(id => ({
              id,
              name: `Item-${id}`,
              type: 'gear',
              weight: 1,
            }));

            const serialized = serializeEquipment(equipment);
            const deserialized = deserializeEquipment(serialized, catalog);

            // Must not be null
            if (deserialized === null) return false;

            // version must match
            if (deserialized.version !== equipment.version) return false;

            // fixedGrants: same length, same itemId and quantity
            if (deserialized.fixedGrants.length !== equipment.fixedGrants.length) return false;
            for (let i = 0; i < equipment.fixedGrants.length; i++) {
              if (deserialized.fixedGrants[i].itemId !== equipment.fixedGrants[i].itemId) return false;
              if (deserialized.fixedGrants[i].quantity !== equipment.fixedGrants[i].quantity) return false;
            }

            // choiceSets: same length, same labels and nested itemId/quantity
            if (deserialized.choiceSets.length !== equipment.choiceSets.length) return false;
            for (let csIdx = 0; csIdx < equipment.choiceSets.length; csIdx++) {
              const origCs = equipment.choiceSets[csIdx];
              const deserCs = deserialized.choiceSets[csIdx];
              if (deserCs.label !== origCs.label) return false;
              if (deserCs.options.length !== origCs.options.length) return false;
              for (let optIdx = 0; optIdx < origCs.options.length; optIdx++) {
                const origOpt = origCs.options[optIdx];
                const deserOpt = deserCs.options[optIdx];
                if (deserOpt.lines.length !== origOpt.lines.length) return false;
                for (let lineIdx = 0; lineIdx < origOpt.lines.length; lineIdx++) {
                  if (deserOpt.lines[lineIdx].itemId !== origOpt.lines[lineIdx].itemId) return false;
                  if (deserOpt.lines[lineIdx].quantity !== origOpt.lines[lineIdx].quantity) return false;
                }
              }
            }

            return true;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 2: isStructuredEquipment classification ──────────────────────

  describe('Property 2: isStructuredEquipment classification', () => {
    it('returns true for any StructuredEquipment object', () => {
      // Feature: starting-equipment-picker, Property 2: isStructuredEquipment correctly classifies values
      expect(() =>
        fc.assert(
          fc.property(structuredEquipmentArb, (equipment) => {
            return isStructuredEquipment(equipment) === true;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('returns false for any arbitrary string', () => {
      // Feature: starting-equipment-picker, Property 2: isStructuredEquipment correctly classifies values
      expect(() =>
        fc.assert(
          fc.property(fc.string(), (str) => {
            return isStructuredEquipment(str) === false;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('returns false for null', () => {
      // Feature: starting-equipment-picker, Property 2: isStructuredEquipment correctly classifies values
      expect(isStructuredEquipment(null)).toBeFalse();
    });

    it('returns false for undefined', () => {
      // Feature: starting-equipment-picker, Property 2: isStructuredEquipment correctly classifies values
      expect(isStructuredEquipment(undefined)).toBeFalse();
    });
  });

  // ─── Property 3: Fixed grants fully in resolved inventory ──────────────────

  describe('Property 3: Fixed grants in resolved inventory', () => {
    it('every fixed grant appears in resolveInventory output with matching itemId and quantity', () => {
      // Feature: starting-equipment-picker, Property 3: Fixed grants are fully included in resolved inventory
      const equipmentWithGrantsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 1, maxLength: 5 }),
        choiceSets: fc.array(choiceSetArb, { minLength: 0, maxLength: 3 }),
      });

      expect(() =>
        fc.assert(
          fc.property(
            equipmentWithGrantsArb,
            fc.dictionary(fc.nat({ max: 10 }).map(String), fc.nat({ max: 10 })),
            (equipment, rawSelections) => {
              // Convert string-keyed dict to number-keyed
              const selections: Record<number, number> = {};
              for (const [k, v] of Object.entries(rawSelections)) {
                selections[Number(k)] = v;
              }

              const result = resolveInventory(equipment, selections);

              // Every fixed grant must appear in the result
              for (const grant of equipment.fixedGrants) {
                const found = result.some(
                  line => line.itemId === grant.itemId && line.quantity === grant.quantity
                );
                if (!found) return false;
              }
              return true;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 4: Selected option lines fully in resolved inventory ──────────

  describe('Property 4: Selected option lines in resolved inventory', () => {
    it('every line of each selected option appears in resolveInventory output', () => {
      // Feature: starting-equipment-picker, Property 4: Selected option lines are fully included in resolved inventory
      const equipmentWithChoiceSetsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 3 }),
        choiceSets: fc.array(choiceSetArb, { minLength: 1, maxLength: 3 }),
      });

      expect(() =>
        fc.assert(
          fc.property(equipmentWithChoiceSetsArb, (equipment) => {
            // Build a complete selections map: for each choice set, pick option 0
            const selections: Record<number, number> = {};
            for (let i = 0; i < equipment.choiceSets.length; i++) {
              selections[i] = 0; // always select first option
            }

            const result = resolveInventory(equipment, selections);

            // Every line of each selected option must appear in the result
            for (let setIdx = 0; setIdx < equipment.choiceSets.length; setIdx++) {
              const selectedOptIdx = selections[setIdx];
              const selectedOption = equipment.choiceSets[setIdx].options[selectedOptIdx];
              for (const line of selectedOption.lines) {
                const found = result.some(
                  r => r.itemId === line.itemId && r.quantity === line.quantity
                );
                if (!found) return false;
              }
            }
            return true;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 5: Duplicate item IDs produce separate slots ─────────────────

  describe('Property 5: Duplicate item IDs produce separate slots', () => {
    it('resolveInventory does not merge duplicate item IDs — produces separate ResolvedInventoryLine entries', () => {
      // Feature: starting-equipment-picker, Property 5: Duplicate item IDs produce separate inventory slots
      expect(() =>
        fc.assert(
          fc.property(
            itemIdArb,
            fc.integer({ min: 2, max: 5 }),
            fc.integer({ min: 1, max: 99 }),
            (sharedId, count, quantity) => {
              // Build equipment with `count` fixed grants all using the same itemId
              const fixedGrants = Array.from({ length: count }, () => ({
                itemId: sharedId,
                itemName: 'Duplicate Item',
                itemType: 'gear',
                quantity,
              }));

              const equipment: StructuredEquipment = {
                version: 'structured',
                fixedGrants,
                choiceSets: [],
              };

              const result = resolveInventory(equipment, {});

              // Must have exactly `count` entries, not merged
              return result.length === count;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 6: Item search filtering ─────────────────────────────────────

  describe('Property 6: Item search filtering', () => {
    it('filterItems returns exactly the subset of catalog items whose name contains the query (case-insensitive)', () => {
      // Feature: starting-equipment-picker, Property 6: Item search filtering is case-insensitive and substring-based
      expect(() =>
        fc.assert(
          fc.property(
            fc.array(itemSummaryArb, { minLength: 0, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 10 }),
            (catalog, query) => {
              const result = filterItems(catalog, query);

              // If query is whitespace-only, result must be empty
              if (!query.trim()) {
                return result.length === 0;
              }

              const lower = query.toLowerCase();

              // Every item in result must have name containing query (case-insensitive)
              const allMatch = result.every(item =>
                item.name.toLowerCase().includes(lower)
              );

              // Every catalog item whose name contains query must be in result
              const expectedCount = catalog.filter(item =>
                item.name.toLowerCase().includes(lower)
              ).length;

              return allMatch && result.length === expectedCount;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('filterItems returns empty array for whitespace-only query', () => {
      // Feature: starting-equipment-picker, Property 6: Item search filtering is case-insensitive and substring-based
      expect(() =>
        fc.assert(
          fc.property(
            fc.array(itemSummaryArb, { minLength: 1, maxLength: 10 }),
            fc.stringMatching(/^\s+$/),
            (catalog, whitespaceQuery) => {
              return filterItems(catalog, whitespaceQuery).length === 0;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 7: Quantity validation ───────────────────────────────────────

  describe('Property 7: Quantity validation', () => {
    it('validateQuantity returns false for any integer < 1', () => {
      // Feature: starting-equipment-picker, Property 7: Fixed grant quantity validation rejects non-positive values
      expect(() =>
        fc.assert(
          fc.property(fc.integer({ max: 0 }), (value) => {
            return validateQuantity(value) === false;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('validateQuantity returns true for any integer >= 1', () => {
      // Feature: starting-equipment-picker, Property 7: Fixed grant quantity validation rejects non-positive values
      expect(() =>
        fc.assert(
          fc.property(fc.integer({ min: 1, max: 10000 }), (value) => {
            return validateQuantity(value) === true;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('validateQuantity returns false for non-integer numbers', () => {
      // Feature: starting-equipment-picker, Property 7: Fixed grant quantity validation rejects non-positive values
      expect(() =>
        fc.assert(
          fc.property(
            fc.float({ min: 1, max: 100, noNaN: true }).filter(n => !Number.isInteger(n)),
            (value) => {
              return validateQuantity(value) === false;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 8: Label validation ──────────────────────────────────────────

  describe('Property 8: Label validation', () => {
    it('validateLabel returns false for empty string', () => {
      // Feature: starting-equipment-picker, Property 8: Choice set label validation rejects empty and oversized labels
      expect(validateLabel('')).toBeFalse();
    });

    it('validateLabel returns false for whitespace-only strings', () => {
      // Feature: starting-equipment-picker, Property 8: Choice set label validation rejects empty and oversized labels
      expect(() =>
        fc.assert(
          fc.property(fc.stringMatching(/^\s+$/), (whitespace) => {
            return validateLabel(whitespace) === false;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('validateLabel returns false for strings with length > 100', () => {
      // Feature: starting-equipment-picker, Property 8: Choice set label validation rejects empty and oversized labels
      expect(() =>
        fc.assert(
          fc.property(
            fc.string({ minLength: 101, maxLength: 200 }),
            (longLabel) => {
              return validateLabel(longLabel) === false;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('validateLabel returns true for non-empty, non-whitespace, length <= 100 strings', () => {
      // Feature: starting-equipment-picker, Property 8: Choice set label validation rejects empty and oversized labels
      expect(() =>
        fc.assert(
          fc.property(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            (validLabel) => {
              return validateLabel(validLabel) === true;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 9: Equipment step insertion ──────────────────────────────────

  describe('Property 9: Equipment step insertion', () => {
    it('activeSteps includes "equipment" when class has >= 1 choice set', () => {
      // Feature: starting-equipment-picker, Property 9: Equipment step is inserted if and only if the class has choice sets
      const equipmentWithChoiceSetsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 3 }),
        choiceSets: fc.array(choiceSetArb, { minLength: 1, maxLength: 5 }),
      });

      expect(() =>
        fc.assert(
          fc.property(equipmentWithChoiceSetsArb, (equipment) => {
            const selectedClass = {
              classFeatures: { startingEquipment: equipment },
            };
            const steps = computeActiveSteps(selectedClass);
            return steps.includes('equipment');
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('activeSteps does NOT include "equipment" when class has 0 choice sets (fixed grants only)', () => {
      // Feature: starting-equipment-picker, Property 9: Equipment step is inserted if and only if the class has choice sets
      const equipmentNoChoiceSetsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 5 }),
        choiceSets: fc.constant([] as StructuredEquipment['choiceSets']),
      });

      expect(() =>
        fc.assert(
          fc.property(equipmentNoChoiceSetsArb, (equipment) => {
            const selectedClass = {
              classFeatures: { startingEquipment: equipment },
            };
            const steps = computeActiveSteps(selectedClass);
            return !steps.includes('equipment');
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('activeSteps does NOT include "equipment" for legacy string equipment', () => {
      // Feature: starting-equipment-picker, Property 9: Equipment step is inserted if and only if the class has choice sets
      expect(() =>
        fc.assert(
          fc.property(fc.string(), (legacyEquipment) => {
            const selectedClass = {
              classFeatures: { startingEquipment: legacyEquipment },
            };
            const steps = computeActiveSteps(selectedClass);
            return !steps.includes('equipment');
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('activeSteps does NOT include "equipment" when equipment is null', () => {
      // Feature: starting-equipment-picker, Property 9: Equipment step is inserted if and only if the class has choice sets
      const steps = computeActiveSteps({ classFeatures: { startingEquipment: null } });
      expect(steps.includes('equipment')).toBeFalse();
    });

    it('activeSteps does NOT include "equipment" when selectedClass is null', () => {
      // Feature: starting-equipment-picker, Property 9: Equipment step is inserted if and only if the class has choice sets
      const steps = computeActiveSteps(null);
      expect(steps.includes('equipment')).toBeFalse();
    });
  });

  // ─── Property 10: Single selection per choice set ──────────────────────────

  describe('Property 10: Single selection per choice set', () => {
    it('applying a sequence of selections always results in exactly one selection per choice set index', () => {
      // Feature: starting-equipment-picker, Property 10: At most one option is selected per choice set at any time
      expect(() =>
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 4 }),  // setIndex
            fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 10 }),  // sequence of option indices
            (setIndex, optionSequence) => {
              let selections: Record<number, number> = {};

              for (const optionIndex of optionSequence) {
                // Simulate selectEquipmentOption: replaces any previous selection for this set
                selections = { ...selections, [setIndex]: optionIndex };
              }

              // After all selections, there must be exactly one entry for setIndex
              const keysForSet = Object.keys(selections).filter(k => k === String(setIndex));
              if (keysForSet.length !== 1) return false;

              // The final selection must be the last one applied
              const lastOption = optionSequence[optionSequence.length - 1];
              return selections[setIndex] === lastOption;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('selecting a new option for a set replaces the previous selection', () => {
      // Feature: starting-equipment-picker, Property 10: At most one option is selected per choice set at any time
      expect(() =>
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 4 }),  // setIndex
            fc.integer({ min: 0, max: 4 }),  // first option
            fc.integer({ min: 0, max: 4 }),  // second option
            (setIndex, firstOption, secondOption) => {
              let selections: Record<number, number> = {};

              // Apply first selection
              selections = { ...selections, [setIndex]: firstOption };
              // Apply second selection (replacement)
              selections = { ...selections, [setIndex]: secondOption };

              // Only one entry for setIndex
              const keysForSet = Object.keys(selections).filter(k => k === String(setIndex));
              return keysForSet.length === 1 && selections[setIndex] === secondOption;
            }
          ),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

  // ─── Property 11: Equipment step validation ─────────────────────────────────

  describe('Property 11: Equipment step validation', () => {
    it('validateEquipmentStep returns non-empty error map when selections are incomplete', () => {
      // Feature: starting-equipment-picker, Property 11: Equipment step validation blocks advancement with incomplete selections
      const equipmentWithChoiceSetsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 3 }),
        choiceSets: fc.array(choiceSetArb, { minLength: 1, maxLength: 5 }),
      });

      expect(() =>
        fc.assert(
          fc.property(equipmentWithChoiceSetsArb, (equipment) => {
            const n = equipment.choiceSets.length;

            // Build an incomplete selections map: provide fewer entries than choice sets
            // Use 0 to n-1 entries (at least one missing)
            const numSelections = Math.max(0, n - 1);
            const incompleteSelections: Record<number, number> = {};
            for (let i = 0; i < numSelections; i++) {
              incompleteSelections[i] = 0;
            }

            const errors = validateEquipmentStep(equipment, incompleteSelections);
            return Object.keys(errors).length > 0;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });

    it('validateEquipmentStep returns empty error map when all choice sets have a selection', () => {
      // Feature: starting-equipment-picker, Property 11: Equipment step validation blocks advancement with incomplete selections
      const equipmentWithChoiceSetsArb = fc.record({
        version: fc.constant('structured' as const),
        fixedGrants: fc.array(fixedGrantArb, { minLength: 0, maxLength: 3 }),
        choiceSets: fc.array(choiceSetArb, { minLength: 1, maxLength: 5 }),
      });

      expect(() =>
        fc.assert(
          fc.property(equipmentWithChoiceSetsArb, (equipment) => {
            const n = equipment.choiceSets.length;

            // Build a complete selections map: all N choice sets have a valid option index
            const completeSelections: Record<number, number> = {};
            for (let i = 0; i < n; i++) {
              completeSelections[i] = 0;
            }

            const errors = validateEquipmentStep(equipment, completeSelections);
            return Object.keys(errors).length === 0;
          }),
          { numRuns: 25 }
        )
      ).not.toThrow();
    });
  });

});

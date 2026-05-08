import {
  isStructuredEquipment,
  serializeEquipment,
  deserializeEquipment,
  resolveInventory,
  StructuredEquipment,
  ItemSummary,
} from './equipment.models';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStructured(
  fixedGrants: StructuredEquipment['fixedGrants'] = [],
  choiceSets: StructuredEquipment['choiceSets'] = []
): StructuredEquipment {
  return { version: 'structured', fixedGrants, choiceSets };
}

const CATALOG: ItemSummary[] = [
  { id: 'sword', name: 'Longsword', type: 'weapon', weight: 3 },
  { id: 'shield', name: 'Shield', type: 'armor', weight: 6 },
  { id: 'bow', name: 'Shortbow', type: 'weapon', weight: 2 },
];

// ---------------------------------------------------------------------------
// isStructuredEquipment
// ---------------------------------------------------------------------------

describe('isStructuredEquipment', () => {
  it('returns true for a structured object with version: "structured"', () => {
    const value: unknown = { version: 'structured', fixedGrants: [], choiceSets: [] };
    expect(isStructuredEquipment(value)).toBeTrue();
  });

  it('returns false for a plain string', () => {
    expect(isStructuredEquipment('Longsword, Shield')).toBeFalse();
  });

  it('returns false for null', () => {
    expect(isStructuredEquipment(null)).toBeFalse();
  });

  it('returns false for undefined', () => {
    expect(isStructuredEquipment(undefined)).toBeFalse();
  });

  it('returns false for an object missing the version field', () => {
    expect(isStructuredEquipment({ fixedGrants: [], choiceSets: [] })).toBeFalse();
  });

  it('returns false for an object with a wrong version value', () => {
    expect(isStructuredEquipment({ version: 'legacy', fixedGrants: [], choiceSets: [] })).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// serializeEquipment
// ---------------------------------------------------------------------------

describe('serializeEquipment', () => {
  it('output JSON contains version: "structured"', () => {
    const eq = makeStructured();
    const parsed = JSON.parse(serializeEquipment(eq));
    expect(parsed.version).toBe('structured');
  });

  it('output JSON contains correct itemId and quantity for fixed grants', () => {
    const eq = makeStructured([
      { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 },
      { itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 2 },
    ]);
    const parsed = JSON.parse(serializeEquipment(eq));
    expect(parsed.fixedGrants).toEqual([
      { itemId: 'sword', quantity: 1 },
      { itemId: 'shield', quantity: 2 },
    ]);
  });

  it('output JSON does NOT include itemName or itemType in fixed grants', () => {
    const eq = makeStructured([
      { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 },
    ]);
    const parsed = JSON.parse(serializeEquipment(eq));
    const grant = parsed.fixedGrants[0];
    expect(grant.itemName).toBeUndefined();
    expect(grant.itemType).toBeUndefined();
  });

  it('output JSON contains correct choice set structure (label, options, lines with itemId/quantity)', () => {
    const eq = makeStructured([], [
      {
        label: 'Weapon choice',
        options: [
          { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
          { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
        ],
      },
    ]);
    const parsed = JSON.parse(serializeEquipment(eq));
    expect(parsed.choiceSets.length).toBe(1);
    expect(parsed.choiceSets[0].label).toBe('Weapon choice');
    expect(parsed.choiceSets[0].options.length).toBe(2);
    expect(parsed.choiceSets[0].options[0].lines).toEqual([{ itemId: 'sword', quantity: 1 }]);
    expect(parsed.choiceSets[0].options[1].lines).toEqual([{ itemId: 'bow', quantity: 1 }]);
  });

  it('choice set option lines do NOT include itemName or itemType', () => {
    const eq = makeStructured([], [
      {
        label: 'Weapon choice',
        options: [
          { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
          { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
        ],
      },
    ]);
    const parsed = JSON.parse(serializeEquipment(eq));
    const line = parsed.choiceSets[0].options[0].lines[0];
    expect(line.itemName).toBeUndefined();
    expect(line.itemType).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deserializeEquipment
// ---------------------------------------------------------------------------

describe('deserializeEquipment', () => {
  it('valid structured JSON returns hydrated StructuredEquipment with itemName/itemType from catalog', () => {
    const raw = JSON.stringify({
      version: 'structured',
      fixedGrants: [{ itemId: 'sword', quantity: 1 }],
      choiceSets: [],
    });
    const result = deserializeEquipment(raw, CATALOG);
    expect(result).not.toBeNull();
    expect(result!.fixedGrants[0].itemName).toBe('Longsword');
    expect(result!.fixedGrants[0].itemType).toBe('weapon');
  });

  it('malformed JSON string returns null', () => {
    expect(deserializeEquipment('{not valid json', CATALOG)).toBeNull();
  });

  it('legacy plain string (no version field) returns null', () => {
    const raw = JSON.stringify({ fixedGrants: [], choiceSets: [] });
    expect(deserializeEquipment(raw, CATALOG)).toBeNull();
  });

  it('empty string returns null', () => {
    expect(deserializeEquipment('', CATALOG)).toBeNull();
  });

  it('item ID not in catalog falls back to itemName = itemId and itemType = ""', () => {
    const raw = JSON.stringify({
      version: 'structured',
      fixedGrants: [{ itemId: 'unknown-item', quantity: 3 }],
      choiceSets: [],
    });
    const result = deserializeEquipment(raw, CATALOG);
    expect(result).not.toBeNull();
    expect(result!.fixedGrants[0].itemName).toBe('unknown-item');
    expect(result!.fixedGrants[0].itemType).toBe('');
  });

  it('valid JSON with multiple fixed grants and choice sets hydrates all correctly', () => {
    const raw = JSON.stringify({
      version: 'structured',
      fixedGrants: [
        { itemId: 'sword', quantity: 1 },
        { itemId: 'shield', quantity: 1 },
      ],
      choiceSets: [
        {
          label: 'Ranged weapon',
          options: [
            { lines: [{ itemId: 'bow', quantity: 1 }] },
            { lines: [{ itemId: 'unknown-item', quantity: 2 }] },
          ],
        },
      ],
    });
    const result = deserializeEquipment(raw, CATALOG);
    expect(result).not.toBeNull();
    expect(result!.fixedGrants.length).toBe(2);
    expect(result!.fixedGrants[0].itemName).toBe('Longsword');
    expect(result!.fixedGrants[1].itemName).toBe('Shield');
    expect(result!.choiceSets.length).toBe(1);
    expect(result!.choiceSets[0].label).toBe('Ranged weapon');
    expect(result!.choiceSets[0].options[0].lines[0].itemName).toBe('Shortbow');
    expect(result!.choiceSets[0].options[1].lines[0].itemName).toBe('unknown-item');
    expect(result!.choiceSets[0].options[1].lines[0].itemType).toBe('');
  });
});

// ---------------------------------------------------------------------------
// resolveInventory
// ---------------------------------------------------------------------------

describe('resolveInventory', () => {
  it('fixed grants only (no choice sets) returns one line per grant with correct itemId/quantity', () => {
    const eq = makeStructured([
      { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 },
      { itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 2 },
    ]);
    const result = resolveInventory(eq, {});
    expect(result).toEqual([
      { itemId: 'sword', quantity: 1 },
      { itemId: 'shield', quantity: 2 },
    ]);
  });

  it('choice sets only (no fixed grants), all selections provided returns lines for selected options', () => {
    const eq = makeStructured([], [
      {
        label: 'Weapon',
        options: [
          { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
          { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
        ],
      },
    ]);
    const result = resolveInventory(eq, { 0: 1 });
    expect(result).toEqual([{ itemId: 'bow', quantity: 1 }]);
  });

  it('mixed fixed grants + choice sets returns all fixed grants + selected option lines', () => {
    const eq = makeStructured(
      [{ itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 1 }],
      [
        {
          label: 'Weapon',
          options: [
            { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
            { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
          ],
        },
      ]
    );
    const result = resolveInventory(eq, { 0: 0 });
    expect(result).toEqual([
      { itemId: 'shield', quantity: 1 },
      { itemId: 'sword', quantity: 1 },
    ]);
  });

  it('duplicate item IDs in fixed grants produces separate ResolvedInventoryLine entries (no merging)', () => {
    const eq = makeStructured([
      { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 },
      { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 2 },
    ]);
    const result = resolveInventory(eq, {});
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ itemId: 'sword', quantity: 1 });
    expect(result[1]).toEqual({ itemId: 'sword', quantity: 2 });
  });

  it('duplicate item IDs across fixed grant and selected option produces separate entries', () => {
    const eq = makeStructured(
      [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }],
      [
        {
          label: 'Extra',
          options: [
            { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 3 }] },
            { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
          ],
        },
      ]
    );
    const result = resolveInventory(eq, { 0: 0 });
    expect(result.length).toBe(2);
    expect(result[0]).toEqual({ itemId: 'sword', quantity: 1 });
    expect(result[1]).toEqual({ itemId: 'sword', quantity: 3 });
  });

  it('missing selection for a choice set skips that choice set (no lines added)', () => {
    const eq = makeStructured([], [
      {
        label: 'Weapon',
        options: [
          { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
          { lines: [{ itemId: 'bow', itemName: 'Shortbow', itemType: 'weapon', quantity: 1 }] },
        ],
      },
    ]);
    // No selection provided for choice set 0
    const result = resolveInventory(eq, {});
    expect(result).toEqual([]);
  });

  it('empty equipment (no grants, no choice sets) returns empty array', () => {
    const eq = makeStructured();
    const result = resolveInventory(eq, {});
    expect(result).toEqual([]);
  });
});

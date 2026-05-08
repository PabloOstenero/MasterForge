/** A single item line within an option or fixed grant. */
export interface EquipmentItemLine {
  itemId: string;
  itemName: string;   // denormalized for display; not sent to backend
  itemType: string;   // denormalized for display; not sent to backend
  quantity: number;   // positive integer >= 1
}

/** A single selectable alternative within a ChoiceSet. */
export interface EquipmentOption {
  lines: EquipmentItemLine[];  // at least one line required
}

/** A choice the player must resolve during character creation. */
export interface ChoiceSet {
  label: string;               // non-empty, <= 100 chars
  options: EquipmentOption[];  // at least two options required
}

/** An item that every character of the class always receives. */
export interface FixedGrant {
  itemId: string;
  itemName: string;   // denormalized for display
  itemType: string;   // denormalized for display
  quantity: number;   // positive integer >= 1
}

/**
 * The structured starting equipment object stored in classFeatures.startingEquipment.
 * The `version` discriminator distinguishes it from legacy plain strings.
 */
export interface StructuredEquipment {
  version: 'structured';
  fixedGrants: FixedGrant[];
  choiceSets: ChoiceSet[];
}

/** Lightweight item summary returned by GET /api/items. */
export interface ItemSummary {
  id: string;
  name: string;
  type: string;
  weight: number;
}

/** Resolved inventory line ready to be sent to the backend. */
export interface ResolvedInventoryLine {
  itemId: string;
  quantity: number;
}

/**
 * Type guard: returns true when `value` is a StructuredEquipment object.
 * A plain string (legacy) or null/undefined returns false.
 */
export function isStructuredEquipment(value: unknown): value is StructuredEquipment {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>)['version'] === 'structured'
  );
}

/**
 * Serializes a StructuredEquipment to the JSON string stored in
 * classFeatures.startingEquipment.
 * Strips denormalized display fields (itemName, itemType) before persisting.
 */
export function serializeEquipment(equipment: StructuredEquipment): string {
  const payload = {
    version: equipment.version,
    fixedGrants: equipment.fixedGrants.map(g => ({
      itemId: g.itemId,
      quantity: g.quantity,
    })),
    choiceSets: equipment.choiceSets.map(cs => ({
      label: cs.label,
      options: cs.options.map(opt => ({
        lines: opt.lines.map(l => ({ itemId: l.itemId, quantity: l.quantity })),
      })),
    })),
  };
  return JSON.stringify(payload);
}

/**
 * Deserializes the JSON string from classFeatures.startingEquipment back into
 * a StructuredEquipment, re-hydrating display fields from the item catalog.
 * Returns null if the string is not valid structured equipment.
 */
export function deserializeEquipment(
  raw: string,
  catalog: ItemSummary[]
): StructuredEquipment | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isStructuredEquipment(parsed)) return null;

  const lookup = new Map(catalog.map(i => [i.id, i]));

  return {
    version: 'structured',
    fixedGrants: ((parsed as StructuredEquipment).fixedGrants ?? []).map((g: FixedGrant) => {
      const item = lookup.get(g.itemId);
      return {
        itemId: g.itemId,
        itemName: item?.name ?? g.itemId,
        itemType: item?.type ?? '',
        quantity: g.quantity,
      };
    }),
    choiceSets: ((parsed as StructuredEquipment).choiceSets ?? []).map((cs: ChoiceSet) => ({
      label: cs.label,
      options: (cs.options ?? []).map((opt: EquipmentOption) => ({
        lines: (opt.lines ?? []).map((l: EquipmentItemLine) => {
          const item = lookup.get(l.itemId);
          return {
            itemId: l.itemId,
            itemName: item?.name ?? l.itemId,
            itemType: item?.type ?? '',
            quantity: l.quantity,
          };
        }),
      })),
    })),
  };
}

/**
 * Resolves a StructuredEquipment + player selections into a flat list of
 * inventory lines ready to be sent to the backend.
 *
 * @param equipment  The structured equipment from the class
 * @param selections  Map of choiceSet index → selected option index
 */
export function resolveInventory(
  equipment: StructuredEquipment,
  selections: Record<number, number>
): ResolvedInventoryLine[] {
  const lines: ResolvedInventoryLine[] = [];

  for (const grant of equipment.fixedGrants) {
    lines.push({ itemId: grant.itemId, quantity: grant.quantity });
  }

  equipment.choiceSets.forEach((cs, setIdx) => {
    const optIdx = selections[setIdx];
    if (optIdx == null) return;
    const option = cs.options[optIdx];
    if (!option) return;
    for (const line of option.lines) {
      lines.push({ itemId: line.itemId, quantity: line.quantity });
    }
  });

  return lines;
}

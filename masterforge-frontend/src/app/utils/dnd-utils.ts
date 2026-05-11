/**
 * Centralized D&D 5e utility functions for MasterForge.
 */

/**
 * Calculates the Proficiency Bonus based on character level.
 * @param level 1-20
 */
export function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Calculates the ability modifier from a score.
 * @param score 1-30
 */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Maps a long ability name to its standard 3-letter abbreviation.
 */
export function getAbilityAbbr(ability: string): string {
  const mapping: Record<string, string> = {
    'Strength': 'str',
    'Dexterity': 'dex',
    'Constitution': 'con',
    'Intelligence': 'int',
    'Wisdom': 'wis',
    'Charisma': 'cha',
    'Fuerza': 'str',
    'Destreza': 'dex',
    'Constitución': 'con',
    'Inteligencia': 'int',
    'Sabiduría': 'wis',
    'Carisma': 'cha'
  };
  return mapping[ability] || ability.toLowerCase().substring(0, 3);
}

/**
 * Calculates the passive value for a skill (10 + modifier + proficiency).
 */
export function calculatePassive(mod: number, proficiencyBonus: number, isProficient: boolean): number {
  return 10 + mod + (isProficient ? proficiencyBonus : 0);
}

/**
 * Calculates the total HP for a character considering multiclassing.
 * Formula: (Primary Hit Die + CON) + Sum(Other Level Hit Dice + CON)
 */
export function calculateMulticlassHp(
  primaryHitDie: number,
  conModifier: number,
  primaryLevel: number,
  multiclasses: { hitDie: number, level: number }[],
  mode: 'average' | 'roll',
  totalRollValue: number = 0 // Sum of rolls for levels 2+
): number {
  // Level 1: Primary Hit Die + CON
  let hp = primaryHitDie + conModifier;

  const totalLevel = primaryLevel + multiclasses.reduce((sum, mc) => sum + mc.level, 0);

  if (mode === 'average') {
    // Primary class levels 2 to primaryLevel
    if (primaryLevel > 1) {
      const avg = Math.floor(primaryHitDie / 2) + 1;
      hp += (primaryLevel - 1) * (avg + conModifier);
    }
    // Multiclass levels
    multiclasses.forEach(mc => {
      const avg = Math.floor(mc.hitDie / 2) + 1;
      hp += mc.level * (avg + conModifier);
    });
  } else {
    // Manual roll: 1st Level + totalRollValue + (TotalLevel - 1) * conModifier
    hp = (primaryHitDie + conModifier) + totalRollValue + (totalLevel - 1) * conModifier;
  }

  return hp;
}

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

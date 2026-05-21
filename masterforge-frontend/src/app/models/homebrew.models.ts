
export interface SkillProficiencies {
  fixed: string[];
  choicePool: string[];
  choiceCount: number;
}

export interface LanguageProficiencies {
  fixed: string[];
  choicePool: string[];
  choiceCount: number;
}

export const SKILL_DATA: Record<string, string> = {
  'Acrobatics': 'Dexterity',
  'Animal Handling': 'Wisdom',
  'Arcana': 'Intelligence',
  'Athletics': 'Strength',
  'Deception': 'Charisma',
  'History': 'Intelligence',
  'Insight': 'Wisdom',
  'Intimidation': 'Charisma',
  'Investigation': 'Intelligence',
  'Medicine': 'Wisdom',
  'Nature': 'Intelligence',
  'Perception': 'Wisdom',
  'Performance': 'Charisma',
  'Persuasion': 'Charisma',
  'Religion': 'Intelligence',
  'Sleight of Hand': 'Dexterity',
  'Stealth': 'Dexterity',
  'Survival': 'Wisdom',
};

export interface SpeedObject {
  walk?: number;
  swim?: number;
  climb?: number;
  fly?: number;
  burrow?: number;
}

export interface SenseObject {
  darkvision?: number;
  blindsight?: number;
  tremorsense?: number;
  truesight?: number;
  passivePerception?: number;
}

export interface FeatureProgression {
  level: number;
  additionalChoices?: number;
  resourceMax?: number | string;
  bonus?: number;
  diceCount?: number;
  diceType?: string;
  description?: string;
}

export interface FeatureOptionPool {
  type?: 'SELECT_ONE' | 'SELECT_MANY' | 'BOOLEAN';
  count?: number;
  choices?: { id?: string; label: string; description: string; effects?: any[] }[];
}

export interface FeatureEntry {
  id?: number | null;
  name: string;
  description: string;
  levelRequired: number;
  actionType?: 'PASSIVE' | 'ACTION' | 'BONUS_ACTION' | 'REACTION' | 'SPECIAL' | 'NO_ACTION';
  options?: FeatureOptionPool;
  progression?: FeatureProgression[];
  properties?: {
    statModifiers?: {
      str?: number;
      dex?: number;
      con?: number;
      int?: number;
      wis?: number;
      cha?: number;
    };
    acCalculation?: {
      base: number;
      stats: string[];
      requiresNoArmor?: boolean;
      requiresNoShield?: boolean;
    };
    acBonus?: number;
    acBonusArmorOnly?: boolean;
    resourcePool?: {
      name: string;
      max: number | string;
      reset: 'SHORT_REST' | 'LONG_REST' | 'DAWN' | 'NONE';
    };
    innateSpells?: any[]; // Array of InnateSpell objects
    effects?: any[];
    progression?: FeatureProgression[];
  };
}

/**
 * Common features that can be granted by a Race, Class, or Subclass.
 */
export interface CommonHomebrewFeatures {
  weaponProficiencies: string[];
  armorProficiencies: string[];
  toolProficiencies: string[];
  skillProficiencies: SkillProficiencies;
  languageProficiencies?: LanguageProficiencies;
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  speeds?: SpeedObject;
  senses?: SenseObject;
  features?: FeatureEntry[];
}

export interface NaturalArmor {
  enabled: boolean;
  baseAC: number;
  addDex: boolean;
}

export interface NaturalWeapon {
  name: string;
  diceCount: number;
  dieType: string;
  damageType: string;
  stat: string;
}

export interface SpellSlotTable {
  slots: number[][];
}

export interface Spellcasting {
  ability: string;
  spellcastingType: string;
  ritualCasting: boolean;
  preparationStyle: 'PREPARED' | 'KNOWN';
  knowledgeStyle?: 'ALL_LIST' | 'LEARNED';
  cantripsKnown: number[];
  spellsKnown?: number[];
  spellSlots: SpellSlotTable;
  recharge?: 'SHORT_REST' | 'LONG_REST';
}

export interface MulticlassingPrerequisite {
  ability: string;
  minScore: number;
}

export interface MulticlassingPrerequisites {
  requirements: MulticlassingPrerequisite[];
  logic: 'AND' | 'OR';
}

export interface MulticlassingProficiencies {
  armor: string[];
  weapons: string[];
  tools: string[];
}

export interface ClassFeatures extends CommonHomebrewFeatures {
  primaryAbility: string;
  subclassLevel: number;
  startingEquipment?: any; // Can be string or StructuredEquipment
  multiclassingPrerequisites?: MulticlassingPrerequisites;
  multiclassingProficiencies?: MulticlassingProficiencies;
  spellcasting?: Spellcasting;
  asiLevels?: number[];
}

export interface ExpandedSpellEntry {
  name: string;
  level: number;
  preparationType: 'ALWAYS_PREPARED' | 'ALWAYS_KNOWN';
}

export interface ResourcePool {
  name: string;
  dieType: string;
  count: number;
  rechargeOn: string;
}

export interface SubclassFeatures extends CommonHomebrewFeatures {
  expandedSpellList: ExpandedSpellEntry[];
  resourcePools: ResourcePool[];
  spellcasting?: Spellcasting;
  additionalSpellClass?: string; // e.g. "Cleric" for Divine Soul Sorcerer
  subclassFeatureEntries?: FeatureEntry[]; // Legacy support
}

export interface InnateSpell {
  spellId: string | null;
  name: string;
  level: number;
  usesPerDay: number | null;
  ability: string;
  rechargeOn: string;
}

export interface FlexibleAsi {
  choicesCount: number;
  bonusValue: number;
  allowAbilityOverlap: boolean;
}

export interface RaceFeatures extends CommonHomebrewFeatures {
  languages?: string[]; // Deprecated: use languageProficiencies
  extraLanguageChoices?: number; // Deprecated: use languageProficiencies
  innateSpells: InnateSpell[];
  naturalArmor?: NaturalArmor;
  naturalWeapons?: NaturalWeapon[];
  creatureType?: string;
  flyRestriction?: string;
  flexibleAsi?: FlexibleAsi;
  bonusStr?: number;
  bonusDex?: number;
  bonusCon?: number;
  bonusInt?: number;
  bonusWis?: number;
  bonusCha?: number;
}

export interface AttackEntry {
  name: string;
  attackBonus: number | null;
  damageDice: string;
  damageType: string;
  reach: string;
  description?: string;
}

export interface MonsterSkillEntry {
  name: string;
  bonus: number;
}

export interface MonsterSavingThrows {
  str: number | null;
  dex: number | null;
  con: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
}

export interface CombatMechanics {
  description: string;
  savingThrows: Partial<Record<keyof MonsterSavingThrows, number>>;
  skills: MonsterSkillEntry[];
  damageResistances: string[];
  damageImmunities: string[];
  damageVulnerabilities: string[];
  conditionImmunities: string[];
  senses: SenseObject;
  attacks: AttackEntry[];
  abilities: FeatureEntry[];
  languages?: string[];
  speeds?: SpeedObject;
  legendaryActions?: any[];
}

// Legacy aliases for tests
export type SubclassFeatureEntry = FeatureEntry;
export type Senses = SenseObject;
export type SpecialAbilityEntry = FeatureEntry;
export type AbilityEntry = FeatureEntry;

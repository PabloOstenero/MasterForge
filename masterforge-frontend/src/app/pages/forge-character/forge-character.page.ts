import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton,
  IonIcon, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonGrid, IonRow, IonCol, IonSpinner, IonBadge, IonList,
  IonSegment, IonSegmentButton, IonModal
} from '@ionic/angular/standalone';
import { 
  informationCircleOutline, sparkles, flashOutline, shield, flaskOutline, briefcase, bookOutline,
  checkmarkCircle, peopleOutline, ribbonOutline, addOutline, addCircleOutline, removeCircleOutline, trashOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { getProficiencyBonus, getModifier, calculatePassive, calculateMulticlassHp } from '../../utils/dnd-utils';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { isStructuredEquipment, resolveInventory, StructuredEquipment, ResolvedInventoryLine, ItemSummary, deserializeEquipment } from '../../models/equipment.models';
import { HomebrewService } from '../../services/homebrew.service';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// ─── Step definitions ────────────────────────────────────────────────────────
const BASE_STEPS = ['identity', 'race', 'class', 'ability-scores', 'skills', 'review'] as const;
type BaseStep = typeof BASE_STEPS[number];
type Step = BaseStep | 'subclass' | 'equipment' | 'spells' | 'languages' | 'feature-options' | 'multiclass';

export const STEP_LABELS: Record<Step, string> = {
  'identity': 'Identidad',
  'race': 'Raza',
  'languages': 'Idiomas',
  'class': 'Clase',
  'subclass': 'Subclase',
  'equipment': 'Equipamiento',
  'ability-scores': 'Puntuaciones',
  'skills': 'Habilidades',
  'spells': 'Conjuros',
  'feature-options': 'Rasgos',
  'multiclass': 'Multiclase',
  'review': 'Revisión'
};

// ─── Alignment options ────────────────────────────────────────────────────────
export const ALIGNMENTS = [
  'Legal Bueno', 'Neutral Bueno', 'Caótico Bueno',
  'Legal Neutral', 'Neutral Verdadero', 'Caótico Neutral',
  'Legal Malvado', 'Neutral Malvado', 'Caótico Malvado'
];

// ─── Standard array tokens ────────────────────────────────────────────────────
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// ─── Ability key definitions ──────────────────────────────────────────────────
export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type AbilityKey = typeof ABILITY_KEYS[number];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'FU', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR'
};

// ─── D&D 5e Skills ───────────────────────────────────────────────────────────
export const DND_SKILLS: { id: string; name: string; stat: AbilityKey }[] = [
  { id: 'acrobatics', name: 'Acrobacias', stat: 'dex' },
  { id: 'animal_handling', name: 'Trato con Animales', stat: 'wis' },
  { id: 'arcana', name: 'Arcanos', stat: 'int' },
  { id: 'athletics', name: 'Atletismo', stat: 'str' },
  { id: 'deception', name: 'Engaño', stat: 'cha' },
  { id: 'history', name: 'Historia', stat: 'int' },
  { id: 'insight', name: 'Perspicacia', stat: 'wis' },
  { id: 'intimidation', name: 'Intimidación', stat: 'cha' },
  { id: 'investigation', name: 'Investigación', stat: 'int' },
  { id: 'medicine', name: 'Medicina', stat: 'wis' },
  { id: 'nature', name: 'Naturaleza', stat: 'int' },
  { id: 'perception', name: 'Percepción', stat: 'wis' },
  { id: 'performance', name: 'Interpretación', stat: 'cha' },
  { id: 'persuasion', name: 'Persuasión', stat: 'cha' },
  { id: 'religion', name: 'Religión', stat: 'int' },
  { id: 'sleight_of_hand', name: 'Juego de Manos', stat: 'dex' },
  { id: 'stealth', name: 'Sigilo', stat: 'dex' },
  { id: 'survival', name: 'Supervivencia', stat: 'wis' }
];

/**
 * Maps English skill names (as stored in the backend choicePool) to DND_SKILLS ids.
 * This bridges the gap between the homebrew forms (which save English names)
 * and the character forge (which uses snake_case ids internally).
 */
const ENGLISH_SKILL_TO_ID: Record<string, string> = {
  'acrobatics': 'acrobatics',
  'animal handling': 'animal_handling',
  'arcana': 'arcana',
  'athletics': 'athletics',
  'deception': 'deception',
  'history': 'history',
  'insight': 'insight',
  'intimidation': 'intimidation',
  'investigation': 'investigation',
  'medicine': 'medicine',
  'nature': 'nature',
  'perception': 'perception',
  'performance': 'performance',
  'persuasion': 'persuasion',
  'religion': 'religion',
  'sleight of hand': 'sleight_of_hand',
  'stealth': 'stealth',
  'survival': 'survival',
};

/** Converts an English skill name from the choicePool to a DND_SKILLS id. */
function poolNameToSkillId(poolEntry: string): string | undefined {
  return ENGLISH_SKILL_TO_ID[poolEntry.toLowerCase()];
}

export const LANGUAGES = [
  'Común', 'Enano', 'Élfico', 'Gigante', 'Gnomo', 'Goblin',
  'Mediano', 'Orco', 'Abisal', 'Celestial', 'Dracónico', 'Habla Profunda',
  'Infernal', 'Primordial', 'Silvano', 'Infracomún',
] as const;

// ─── CharacterFormData interface ──────────────────────────────────────────────
export interface MulticlassEntry {
  classId: number;
  subclassId: number | null;
  subclass?: any | null;
  level: number;
  dndClass: any;
}

export interface CharacterFormData {
  // Step 0: Identity
  name: string;
  background: string;
  alignment: string;
  xp: number;
  level: number;

  // Step 1: Race
  selectedRace: any | null;

  // Step (dynamic): Languages
  selectedLanguages: string[];

  // Step 2: Class
  selectedClass: any | null;
  selectedSubclass: any | null;
  multiclasses: MulticlassEntry[];

  // Step 3 (dynamic): Equipment — maps choiceSet index → selected option index
  equipmentSelections: Record<number, number>;

  // Step 3/4: Ability Scores
  scoreMode: 'standard' | 'manual';
  tokenAssignments: { [abilityKey: string]: number | null };
  manualScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  hpGenerationMode: 'average' | 'roll';
  hpRolledValue: number;

  // Step 4/5: Skills
  selectedSkills: string[];

  // Step (dynamic): Spells
  selectedSpells: string[];

  // Step (dynamic): Feature Options
  featureSelections: Record<string, string[]>;

  // Derived (computed at review/submit)
  finalScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  calculatedHp: number;
}

/**
 * Basic HP calculation for Level 1 characters.
 * @param hitDie The hit die of the class (e.g. 8, 10, 12).
 * @param con The Constitution score (e.g. 14, 16).
 */
export function calculateHp(hitDie: number, con: number): number {
  return hitDie + getModifier(con);
}

@Component({
  selector: 'app-forge-character',
  templateUrl: './forge-character.page.html',
  styleUrls: ['./forge-character.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonBackButton,
    IonIcon, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonGrid, IonRow, IonCol, IonSpinner, IonBadge, IonList,
    IonSegment, IonSegmentButton, IonModal
  ],
  encapsulation: ViewEncapsulation.None
})
export class ForgeCharacterPage implements OnInit {

  // ─── Detail Modal state ───────────────────────────────────────────────────
  isDetailModalOpen = false;
  selectedDetail: any = null;
  detailType: 'SPELL' | 'ITEM' | 'FEATURE' | 'CLASS' | 'SUBCLASS' | 'RACE' = 'SPELL';

  // ─── Step state ─────────────────────────────────────────────────────────────
  currentStep: number = 0;

  /** Dynamically computed step list — inserts 'equipment' after 'class' when needed. */
  get activeSteps(): string[] {
    const steps: string[] = ['identity', 'race'];

    if (this.extraLanguageChoicesCount > 0) {
      steps.push('languages');
    }

    steps.push('class');

    const cls = this.formData.selectedClass;
    if (cls && cls.classFeatures?.subclassLevel && this.formData.level >= cls.classFeatures.subclassLevel) {
      steps.push('subclass');
    }

    const structEq = this.structuredEquipment;
    const hasEquipment = structEq && (structEq.choiceSets.length > 0 || structEq.fixedGrants.length > 0);
    if (hasEquipment) {
      steps.push('equipment');
    }

    steps.push('ability-scores');

    if (this.formData.level > 1) {
      steps.push('multiclass');
    }

    steps.push('skills');

    if (cls?.classFeatures?.spellcasting || this.formData.selectedSubclass?.subclassFeatures?.spellcasting) {
      steps.push('spells');
    }

    if (this.availableFeatureChoices.length > 0) {
      steps.push('feature-options');
    }

    steps.push('review');
    return steps;
  }

  /** Features at current level that grant choices. */
  get availableFeatureChoices(): any[] {
    const choices: any[] = [];
    
    const findChoices = (features: any[], level: number, sourceName: string) => {
      if (!features) return;
      features.forEach(f => {
        if (f.levelRequired <= level && f.options) {
          const max = this.calculateMaxChoices(f, level);
          const optsArray = this.getFeatureOptionsArray(f);
          const filteredOptions = optsArray.filter((opt: any) => {
            const req = opt.levelRequired ?? f.levelRequired;
            return parseInt(req, 10) <= level;
          });

          if (filteredOptions.length > 0) {
            choices.push({
              ...f,
              sourceName, // To show which class/race provides the feature
              calculatedMaxChoices: max,
              filteredOptions: filteredOptions
            });
          }
        }
      });
    };

    // Race traits
    if (this.formData.selectedRace?.traits) {
      findChoices(this.formData.selectedRace.traits, this.formData.level, this.formData.selectedRace.name);
    }

    // Primary Class
    const mcTotal = this.formData.multiclasses.reduce((sum, mc) => sum + mc.level, 0);
    const primaryLevel = this.formData.level - mcTotal;
    
    if (this.formData.selectedClass?.features) {
      findChoices(this.formData.selectedClass.features, primaryLevel, this.formData.selectedClass.name);
    }
    const sf = this.formData.selectedSubclass?.subclassFeatures;
    if (sf?.features) {
      findChoices(sf.features, primaryLevel, this.formData.selectedSubclass?.name || 'Subclase');
    }

    // Multiclasses
    this.formData.multiclasses.forEach(mc => {
      const cls = this.classes.find(c => c.id === mc.classId);
      if (cls?.features) {
        findChoices(cls.features, mc.level, cls.name);
      }
      const mcsf = mc.subclass?.subclassFeatures;
      if (mcsf?.features) {
        findChoices(mcsf.features, mc.level, mc.subclass?.name || 'Subclase');
      }
    });

    return choices;
  }

  /** Calculates total allowed choices for a feature based on progression. */
  calculateMaxChoices(feature: any, level?: number): number {
    const lvl = level || this.formData.level;
    const options = feature.options;
    if (!options) return 0;

    let total = options.choiceCount || 0;

    if (options.progression && Array.isArray(options.progression)) {
      const applicable = options.progression
        .filter((p: any) => lvl >= p.level)
        .reduce((sum: number, p: any) => sum + (p.additionalChoices || 0), 0);
      total += applicable;
    }

    // Fallback: if there are options but total is 0, assume at least 1 choice is allowed
    if (total === 0 && this.getFeatureOptionsArray(feature).length > 0) return 1;

    return total;
  }

  getFeatureOptionsArray(feature: any): any[] {
    if (!feature) return [];
    if (Array.isArray(feature.choices)) return feature.choices;
    if (Array.isArray(feature.options)) return feature.options;

    const opt = feature.options;
    if (!opt || typeof opt !== 'object') return [];

    if (Array.isArray(opt.options)) return opt.options;
    if (Array.isArray(opt.choices)) return opt.choices;
    if (Array.isArray(opt.choicePool)) return opt.choicePool;
    if (Array.isArray(opt.choice_pool)) return opt.choice_pool;
    if (Array.isArray(opt.pool)) return opt.pool;

    for (const key of Object.keys(opt)) {
      if (Array.isArray(opt[key]) && opt[key].length > 0) {
        return opt[key];
      }
    }
    return [];
  }

  // ─── Form data ──────────────────────────────────────────────────────────────
  formData: CharacterFormData = {
    name: '',
    background: '',
    alignment: '',
    xp: 0,
    level: 1,
    selectedRace: null,
    selectedLanguages: [],
    selectedClass: null,
    selectedSubclass: null,
    multiclasses: [],
    equipmentSelections: {},
    scoreMode: 'standard',
    tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
    manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hpGenerationMode: 'average',
    hpRolledValue: 0,
    selectedSkills: [],
    selectedSpells: [],
    featureSelections: {},
    finalScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    calculatedHp: 0
  };

  // ─── Validation errors ──────────────────────────────────────────────────────
  validationErrors: { [key: string]: string } = {};

  // ─── Race step state ────────────────────────────────────────────────────────
  races: any[] = [];
  racesLoading: boolean = false;
  racesError: boolean = false;
  private _racesLoaded: boolean = false;

  // ─── Class step state ────────────────────────────────────────────────────────
  classes: any[] = [];
  classesLoading: boolean = false;
  classesError: boolean = false;
  private _classesLoaded: boolean = false;

  // ─── Subclass step state ─────────────────────────────────────────────────────
  subclasses: any[] = [];
  subclassesLoading: boolean = false;
  filteredSubclasses: any[] = [];

  // ─── Submission state ───────────────────────────────────────────────────────
  isSubmitting: boolean = false;

  // ─── Ability scores step state ───────────────────────────────────────────────
  /** The token value currently "picked up" and waiting to be placed in a slot. */
  selectedToken: number | null = null;

  // ─── Exposed constants for template ─────────────────────────────────────────
  readonly alignments = ALIGNMENTS;
  readonly standardArray = STANDARD_ARRAY;
  readonly abilityKeys = ABILITY_KEYS;
  readonly abilityLabels = ABILITY_LABELS;
  readonly dndSkills = DND_SKILLS;
  readonly languagesPool = LANGUAGES;

  // ─── Submit error state ──────────────────────────────────────────────────────
  submitError: boolean = false;

  // ─── Spells step state ───────────────────────────────────────────────────────
  allSpells: any[] = [];
  spellsLoading: boolean = false;
  spellsError: boolean = false;

  // ─── Equipment step state ───────────────────────────────────────────────────
  itemCatalog: ItemSummary[] = [];
  catalogLoading: boolean = false;
  catalogError: boolean = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private homebrewService: HomebrewService,
    private router: Router
  ) {
    addIcons({
      'information-circle-outline': informationCircleOutline,
      'sparkles': sparkles,
      'flash-outline': flashOutline,
      'shield': shield,
      'flask-outline': flaskOutline,
      'briefcase': briefcase,
      'book-outline': bookOutline,
      'checkmark-circle': checkmarkCircle,
      'people-outline': peopleOutline,
      'ribbon-outline': ribbonOutline,
      'add-outline': addOutline,
      'add-circle-outline': addCircleOutline,
      'remove-circle-outline': removeCircleOutline,
      'trash-outline': trashOutline
    });
  }

  ngOnInit(): void {
    this.loadSpells();
    this.loadCatalog();
  }

  // ─── Detail Modal helpers ─────────────────────────────────────────────────

  openDetail(event: Event, data: any, type: 'SPELL' | 'ITEM' | 'FEATURE' | 'CLASS' | 'SUBCLASS' | 'RACE') {
    event.stopPropagation();
    
    this.detailType = type;

    // If it's a minimal item/spell (e.g. from the catalog or selection list), 
    // we should try to get the full version if properties are missing.
    if (type === 'ITEM' && !data.properties && data.id) {
      this.homebrewService.getItem(data.id).subscribe(fullItem => {
        this.selectedDetail = {
          ...fullItem,
          quantity: data.quantity || 1,
          weight: fullItem.weight
        };
        this.isDetailModalOpen = true;
      });
    } else if (type === 'SPELL' && !data.description && data.id) {
       this.homebrewService.getSpell(data.id).subscribe(fullSpell => {
        this.selectedDetail = { spell: fullSpell };
        this.isDetailModalOpen = true;
      });
    } else {
      // Already has data (or is a spell object that needs to be wrapped)
      this.selectedDetail = type === 'SPELL' && !data.spell ? { spell: data } : data;
      this.isDetailModalOpen = true;
    }
  }

  closeDetail() {
    this.isDetailModalOpen = false;
    this.selectedDetail = null;
  }

  getDetailSubtitle(): string {
    if (!this.selectedDetail) return '';
    if (this.detailType === 'SPELL') {
      const level = this.selectedDetail.spell.level === 0 ? 'Truco' : `Nivel ${this.selectedDetail.spell.level}`;
      return `${level} - ${this.selectedDetail.spell.school}`;
    }
    if (this.detailType === 'RACE') return `Raza - ${this.selectedDetail.size || 'Mediano'}`;
    if (this.detailType === 'CLASS') return `Clase - d${this.selectedDetail.hitDie}`;
    if (this.detailType === 'SUBCLASS') return `Subclase`;

    const rarity = this.selectedDetail.rarity || this.selectedDetail.properties?.rarity || 'Común';
    return `${this.selectedDetail.type} - ${rarity}`;
  }

  getDetailIcon(): string {
    if (this.detailType === 'SPELL') return 'sparkles';
    if (this.detailType === 'RACE') return 'people-outline';
    if (this.detailType === 'CLASS' || this.detailType === 'SUBCLASS') return 'ribbon-outline';
    if (this.detailType === 'ITEM') {
      const type = (this.selectedDetail?.type || '').toUpperCase();
      if (type === 'WEAPON') return 'flash-outline';
      if (type === 'ARMOR' || type === 'SHIELD') return 'shield';
      if (type === 'POTION') return 'flask-outline';
      return 'briefcase';
    }
    return 'book-outline';
  }

  hasAbilityBonuses(): boolean {
    if (!this.selectedDetail || this.detailType !== 'ITEM') return false;
    const p = this.selectedDetail.properties;
    if (!p) return false;
    return !!(
      p.bonusStr || p.bonusDex || p.bonusCon || p.bonusInt || p.bonusWis || p.bonusCha || p.bonusMaxHp ||
      p.overrideStr || p.overrideDex || p.overrideCon || p.overrideInt || p.overrideWis || p.overrideCha
    );
  }

  getAbilityBonuses(): string[] {
    if (!this.hasAbilityBonuses()) return [];
    const p = this.selectedDetail.properties;
    const list: string[] = [];

    if (p.overrideStr) list.push(`FU fijada en ${p.overrideStr}`);
    if (p.overrideDex) list.push(`DES fijada en ${p.overrideDex}`);
    if (p.overrideCon) list.push(`CON fijada en ${p.overrideCon}`);
    if (p.overrideInt) list.push(`INT fijada en ${p.overrideInt}`);
    if (p.overrideWis) list.push(`SAB fijada en ${p.overrideWis}`);
    if (p.overrideCha) list.push(`CAR fijada en ${p.overrideCha}`);

    if (p.bonusStr) list.push(`+${p.bonusStr} FU`);
    if (p.bonusDex) list.push(`+${p.bonusDex} DES`);
    if (p.bonusCon) list.push(`+${p.bonusCon} CON`);
    if (p.bonusInt) list.push(`+${p.bonusInt} INT`);
    if (p.bonusWis) list.push(`+${p.bonusWis} SAB`);
    if (p.bonusCha) list.push(`+${p.bonusCha} CAR`);
    if (p.bonusMaxHp) list.push(`+${p.bonusMaxHp} PG Máx`);
    return list;
  }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = false;
    this.homebrewService.getAllItems().subscribe({
      next: (data) => {
        this.itemCatalog = data;
        this.catalogLoading = false;
      },
      error: () => {
        this.catalogLoading = false;
        this.catalogError = true;
      }
    });
  }

  loadSpells(): void {
    this.spellsLoading = true;
    this.spellsError = false;
    this.homebrewService.getAllSpells().subscribe({
      next: (data) => {
        this.allSpells = data.sort((a, b) => a.name.localeCompare(b.name));
        this.spellsLoading = false;
      },
      error: () => {
        this.spellsLoading = false;
        this.spellsError = true;
      }
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  nextStep(): void {
    this.validationErrors = {};

    const errors = this._validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      this.validationErrors = errors;
      return;
    }

    if (this.currentStep < this.activeSteps.length - 1) {
      this.currentStep++;
      this._loadDataForStep(this.currentStep);
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  // ─── Lazy data loading ───────────────────────────────────────────────────────

  private _loadDataForStep(stepIndex: number): void {
    const stepName = this.activeSteps[stepIndex];
    if (stepName === 'race' && !this._racesLoaded) {
      this._loadRaces();
    }
    if (stepName === 'class' && !this._classesLoaded) {
      this._loadClasses();
    }
  }

  loadRaces(): void {
    this._racesLoaded = false;
    this._loadRaces();
  }

  private _loadRaces(): void {
    this.racesLoading = true;
    this.racesError = false;
    this.apiService.getRaces().subscribe({
      next: (data) => {
        this.races = data;
        this.racesLoading = false;
        this._racesLoaded = true;
      },
      error: () => {
        this.racesLoading = false;
        this.racesError = true;
      }
    });
  }

  selectRace(race: any): void {
    this.formData.selectedRace = race;
    this.formData.selectedLanguages = []; // Reset language choices
    if (this.validationErrors['race']) {
      delete this.validationErrors['race'];
    }
  }

  // ─── Languages step logic ───────────────────────────────────────────────────

  get languagesGrantedByRace(): string[] {
    const rf = this.formData.selectedRace?.raceFeatures;
    if (!rf) return [];
    if (rf.languageProficiencies?.fixed) return rf.languageProficiencies.fixed;
    const langs = rf.languages;
    if (Array.isArray(langs)) return langs;
    if (typeof langs === 'string') return langs.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }

  get extraLanguageChoicesCount(): number {
    const rf = this.formData.selectedRace?.raceFeatures;
    return rf?.languageProficiencies?.choiceCount ?? rf?.extraLanguageChoices ?? 0;
  }

  get availableExtraLanguages(): string[] {
    const rf = this.formData.selectedRace?.raceFeatures;
    const pool = rf?.languageProficiencies?.choicePool;
    if (pool && pool.length > 0) {
      return pool;
    }
    
    // If we have choices but no pool (or empty pool), fallback to standard LANGUAGES
    // excluding those already granted by the race fixed list.
    const granted = new Set(this.languagesGrantedByRace.map(l => l.toLowerCase()));
    return LANGUAGES.filter(l => !granted.has(l.toLowerCase()));
  }

  toggleLanguage(lang: string): void {
    const idx = this.formData.selectedLanguages.indexOf(lang);
    if (idx !== -1) {
      this.formData.selectedLanguages.splice(idx, 1);
    } else if (this.formData.selectedLanguages.length < this.extraLanguageChoicesCount) {
      this.formData.selectedLanguages.push(lang);
    }
    if (this.validationErrors['languages']) {
      delete this.validationErrors['languages'];
    }
  }

  loadClasses(): void {
    this._classesLoaded = false;
    this._loadClasses();
  }

  private _loadClasses(): void {
    this.classesLoading = true;
    this.classesError = false;
    this.apiService.getClasses().subscribe({
      next: (data) => {
        this.classes = data;
        this.classesLoading = false;
        this._classesLoaded = true;
      },
      error: () => {
        this.classesLoading = false;
        this.classesError = true;
        this.classes = [];
      }
    });
  }

  selectClass(cls: any): void {
    this.formData.selectedClass = cls;
    this.formData.selectedSubclass = null;
    this.formData.equipmentSelections = {};
    this.filteredSubclasses = [];
    if (this.validationErrors['class']) {
      delete this.validationErrors['class'];
    }
    this.subclassesLoading = true;
    this.apiService.getSubclasses().subscribe({
      next: (data) => {
        this.subclasses = data;
        this.filteredSubclasses = filterSubclasses(data, cls.id);
        this.subclassesLoading = false;
      },
      error: (err) => {
        console.error('Error loading subclasses:', err);
        this.subclassesLoading = false;
        this.filteredSubclasses = [];
      }
    });
  }

  selectSubclass(sc: any): void {
    if (this.formData.selectedSubclass?.id === sc.id) {
      this.formData.selectedSubclass = null;
    } else {
      this.formData.selectedSubclass = sc;
    }
  }

  // ─── Multiclassing helpers ────────────────────────────────────────────────
  
  get totalAssignedLevels(): number {
    let total = 1; // Start with 1 for primary class
    this.formData.multiclasses.forEach(m => total += m.level);
    return total;
  }

  get remainingLevels(): number {
    return this.formData.level - this.totalAssignedLevels;
  }

  canAddMulticlass(): boolean {
    return this.remainingLevels > 0;
  }

  addMulticlass(cls: any): void {
    if (!this.canAddMulticlass()) return;
    
    // Check if already present
    if (this.formData.selectedClass?.id === cls.id || this.formData.multiclasses.some(m => m.classId === cls.id)) {
      return;
    }

    this.formData.multiclasses.push({
      classId: cls.id,
      subclassId: null,
      level: 1,
      dndClass: cls
    });
  }

  removeMulticlass(index: number): void {
    this.formData.multiclasses.splice(index, 1);
  }

  updateMulticlassLevel(index: number, delta: number): void {
    const m = this.formData.multiclasses[index];
    const newVal = m.level + delta;
    if (newVal >= 1 && (delta < 0 || this.remainingLevels > 0)) {
      m.level = newVal;
    }
  }

  isClassAvailableForMulticlass(classId: number): boolean {
    if (!this.formData.selectedClass) return true;
    if (this.formData.selectedClass.id === classId) return false;
    return !this.formData.multiclasses.some((m: MulticlassEntry) => m.classId === classId);
  }

  checkSinglePrereq(cls: any, scores: any): { met: boolean; text: string } {
    const prereqs = cls.classFeatures?.multiclassingPrerequisites;
    if (!prereqs || !prereqs.requirements || prereqs.requirements.length === 0) {
      return { met: true, text: 'Sin requisitos' };
    }

    const requirements = prereqs.requirements;
    const logic = prereqs.logic || 'AND';

    const results = requirements.map((req: any) => {
      const ability = (req.ability || '').toUpperCase();
      const minScore = req.minScore || 13;
      const key = ability.substring(0, 3).toLowerCase() as AbilityKey;
      const score = scores[key] || 0;
      return { 
        ability: ABILITY_LABELS[key] || ability, 
        met: score >= minScore, 
        current: score, 
        required: minScore 
      };
    });

    const metCount = results.filter((r: any) => r.met).length;
    const isMet = logic === 'OR' ? metCount > 0 : metCount === results.length;
    
    const text = results.map((r: any) => `${r.ability} ${r.required}`).join(logic === 'OR' ? ' o ' : ' y ');
    return { met: isMet, text };
  }

  validatePrereq(cls: any): { met: boolean; text: string } {
    const scores = this.calculateFinalScores();

    // 1. Check prerequisites of the new class being entered
    const targetResult = this.checkSinglePrereq(cls, scores);
    if (!targetResult.met) {
      return targetResult;
    }

    // 2. Check prerequisites of the current primary class (if different from target)
    if (this.formData.selectedClass && this.formData.selectedClass.id !== cls.id) {
      const primaryResult = this.checkSinglePrereq(this.formData.selectedClass, scores);
      if (!primaryResult.met) {
        return {
          met: false,
          text: `Falta req. de clase actual (${this.formData.selectedClass.name}): ${primaryResult.text}`
        };
      }
    }

    // 3. Check prerequisites of all other existing secondary classes
    const secondaryClasses = this.formData.multiclasses || [];
    for (const mc of secondaryClasses) {
      if (mc.dndClass && mc.dndClass.id !== cls.id) {
        const secResult = this.checkSinglePrereq(mc.dndClass, scores);
        if (!secResult.met) {
          return {
            met: false,
            text: `Falta req. de clase actual (${mc.dndClass.name}): ${secResult.text}`
          };
        }
      }
    }

    return targetResult;
  }

  calculateFinalScores(): { str: number; dex: number; con: number; int: number; wis: number; cha: number } {
    const scores = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    for (const key of ABILITY_KEYS) {
      const base = this.getBaseScore(key) || 10;
      scores[key] = base + this.getRacialBonus(key);
    }
    return scores;
  }

  // ─── Equipment step ──────────────────────────────────────────────────────────

  /** Returns the structured equipment for the selected class, or null. */
  get structuredEquipment(): StructuredEquipment | null {
    const equipment = this.formData.selectedClass?.classFeatures?.startingEquipment;
    if (!equipment) return null;

    if (typeof equipment === 'string') {
      return deserializeEquipment(equipment, this.itemCatalog);
    }

    return isStructuredEquipment(equipment) ? equipment : null;
  }

  /** Selects an option for a given choice set, replacing any previous selection. */
  selectEquipmentOption(setIndex: number, optionIndex: number): void {
    this.formData.equipmentSelections = {
      ...this.formData.equipmentSelections,
      [setIndex]: optionIndex
    };
    if (this.validationErrors['equipment']) {
      delete this.validationErrors['equipment'];
    }
  }

  // ─── Template helpers ────────────────────────────────────────────────────────

  formatRaceBonuses(race: any): string {
    return formatRaceBonuses(race);
  }

  formatSavingThrows(cls: any): string {
    return formatSavingThrows(cls);
  }

  // ─── Ability scores step ─────────────────────────────────────────────────────

  /** Returns the racial bonus for a given ability key from the selected race. */
  getRacialBonus(key: AbilityKey): number {
    const race = this.formData.selectedRace;
    if (!race) return 0;
    const fieldMap: Record<AbilityKey, string> = {
      str: 'bonusStr', dex: 'bonusDex', con: 'bonusCon',
      int: 'bonusInt', wis: 'bonusWis', cha: 'bonusCha'
    };
    return race[fieldMap[key]] ?? 0;
  }

  /** Returns the base score for a given ability key based on current mode. */
  getBaseScore(key: AbilityKey): number | null {
    if (this.formData.scoreMode === 'standard') {
      return this.formData.tokenAssignments[key] ?? null;
    }
    return this.formData.manualScores[key];
  }

  /** Returns the final score (base + racial bonus) for preview. */
  getFinalScore(key: AbilityKey): number | null {
    const base = this.getBaseScore(key);
    if (base === null) return null;
    return base + this.getRacialBonus(key);
  }

  /** Returns the preview string for a given ability, e.g. "15+2=17". */
  getScorePreview(key: AbilityKey): string {
    const base = this.getBaseScore(key);
    if (base === null) return '—';
    const bonus = this.getRacialBonus(key);
    const final = base + bonus;
    if (bonus === 0) return `${base}`;
    return `${base}${bonus >= 0 ? '+' : ''}${bonus}=${final}`;
  }

  /**
   * Standard array: handle token selection and slot assignment.
   * Clicking a token selects it (or deselects if already selected).
   * Clicking a slot assigns the selected token to that slot.
   */
  onTokenClick(tokenValue: number): void {
    // If this token is already assigned to a slot, unassign it first
    const assignedKey = this._findSlotForToken(tokenValue);
    if (assignedKey) {
      this.formData.tokenAssignments[assignedKey] = null;
    }
    // Toggle selection
    this.selectedToken = this.selectedToken === tokenValue ? null : tokenValue;
  }

  onSlotClick(key: AbilityKey): void {
    if (this.selectedToken !== null) {
      // Assign selected token to this slot (previous value is freed)
      this.formData.tokenAssignments[key] = this.selectedToken;
      this.selectedToken = null;
    } else {
      // No token selected: clicking a filled slot unassigns it
      if (this.formData.tokenAssignments[key] !== null) {
        this.formData.tokenAssignments[key] = null;
      }
    }
  }

  isTokenAssigned(tokenValue: number): boolean {
    return Object.values(this.formData.tokenAssignments).includes(tokenValue);
  }

  private _findSlotForToken(tokenValue: number): AbilityKey | null {
    for (const key of ABILITY_KEYS) {
      if (this.formData.tokenAssignments[key] === tokenValue) return key;
    }
    return null;
  }

  onScoreModeChange(event: any): void {
    this.formData.scoreMode = event.detail.value;
    // Reset assignments when switching modes
    this.selectedToken = null;
    this.formData.tokenAssignments = { str: null, dex: null, con: null, int: null, wis: null, cha: null };
    this.formData.manualScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    for (const key of ABILITY_KEYS) {
      delete this.validationErrors[key];
    }
  }

  onManualScoreChange(key: AbilityKey, event: any): void {
    const val = parseInt(event.detail.value, 10);
    this.formData.manualScores[key] = isNaN(val) ? 0 : val;
    if (val >= 1 && val <= 20) {
      delete this.validationErrors[key];
    }
  }

  onHpGenerationModeChange(event: any): void {
    this.formData.hpGenerationMode = event.detail.value;
    if (this.validationErrors['hpRolledValue']) {
      delete this.validationErrors['hpRolledValue'];
    }
  }

  // ─── Skills step ─────────────────────────────────────────────────────────────

  /**
   * Returns the total number of skills the character must choose from pools, 
   * aggregating from both the selected class AND selected race.
   */
  getSkillName(skillId: string): string {
    return DND_SKILLS.find(s => s.id === skillId)?.name || skillId;
  }

  get requiredSkillCount(): number {
    let count = 0;
    
    // Class skills choice count
    const classChoices = this.formData.selectedClass?.classFeatures?.skillProficiencies?.choiceCount;
    if (classChoices != null) {
      count += classChoices;
    } else if (this.formData.selectedClass) {
      // Fallback for legacy classes that might not have the structured field yet
      count += 2;
    }
    
    // Race skills choice count
    const raceChoices = this.formData.selectedRace?.raceFeatures?.skillProficiencies?.choiceCount;
    if (raceChoices != null) {
      count += raceChoices;
    }

    // Subclass skills choice count
    const subclassChoices = this.formData.selectedSubclass?.subclassFeatures?.skillProficiencies?.choiceCount;
    if (subclassChoices != null) {
      count += subclassChoices;
    }
    
    return count;
  }

  /**
   * Returns the list of fixed skills granted by race and class.
   */
  get fixedSkills(): string[] {
    const fixed = new Set<string>();
    
    // Class fixed skills
    const classFixed = this.formData.selectedClass?.classFeatures?.skillProficiencies?.fixed;
    if (Array.isArray(classFixed)) {
      classFixed.forEach(s => {
        const id = poolNameToSkillId(s);
        if (id) fixed.add(id);
      });
    }

    // Race fixed skills
    const raceFixed = this.formData.selectedRace?.raceFeatures?.skillProficiencies?.fixed;
    if (Array.isArray(raceFixed)) {
      raceFixed.forEach(s => {
        const id = poolNameToSkillId(s);
        if (id) fixed.add(id);
      });
    }

    // Subclass fixed skills
    const subclassFixed = this.formData.selectedSubclass?.subclassFeatures?.skillProficiencies?.fixed;
    if (Array.isArray(subclassFixed)) {
      subclassFixed.forEach(s => {
        const id = poolNameToSkillId(s);
        if (id) fixed.add(id);
      });
    }

    return Array.from(fixed);
  }

  /**
   * Returns the list of skills available for selection, filtered by the aggregated
   * choice pools of the selected class and race.
   */
  get availableSkills(): { id: string; name: string; stat: AbilityKey }[] {
    const classPool: string[] | undefined = this.formData.selectedClass?.classFeatures?.skillProficiencies?.choicePool;
    const racePool: string[] | undefined = this.formData.selectedRace?.raceFeatures?.skillProficiencies?.choicePool;
    const subclassPool: string[] | undefined = this.formData.selectedSubclass?.subclassFeatures?.skillProficiencies?.choicePool;
    
    const classChoices = this.formData.selectedClass?.classFeatures?.skillProficiencies?.choiceCount;
    const raceChoices = this.formData.selectedRace?.raceFeatures?.skillProficiencies?.choiceCount;
    const subclassChoices = this.formData.selectedSubclass?.subclassFeatures?.skillProficiencies?.choiceCount;

    // If all are undefined, fallback to all skills (legacy support)
    if (classChoices === undefined && raceChoices === undefined && subclassChoices === undefined) return DND_SKILLS;

    const aggregatePoolIds = new Set<string>();
    let useAllSkills = false;

    // Handle Class Pool
    if (classPool && classPool.length > 0) {
      classPool.forEach(p => {
        const id = poolNameToSkillId(p);
        if (id) aggregatePoolIds.add(id);
      });
    } else if (this.formData.selectedClass && classChoices > 0) {
      // If class has choices > 0 but no pool, it means any skill
      useAllSkills = true;
    }

    // Handle Race Pool
    if (racePool && racePool.length > 0) {
      racePool.forEach(p => {
        const id = poolNameToSkillId(p);
        if (id) aggregatePoolIds.add(id);
      });
    } else if (this.formData.selectedRace && (raceChoices ?? 0) > 0) {
      // If race has choices > 0 but no pool, it means any skill
      useAllSkills = true;
    }

    // Handle Subclass Pool
    if (subclassPool && subclassPool.length > 0) {
      subclassPool.forEach(p => {
        const id = poolNameToSkillId(p);
        if (id) aggregatePoolIds.add(id);
      });
    } else if (this.formData.selectedSubclass && (subclassChoices ?? 0) > 0) {
      // If subclass has choices > 0 but no pool, it means any skill
      useAllSkills = true;
    }

    let skills = useAllSkills ? DND_SKILLS : DND_SKILLS.filter(skill => aggregatePoolIds.has(skill.id));
    
    // If we have an aggregate pool but it's empty (and not useAllSkills), return all as fallback for safety
    if (!useAllSkills && aggregatePoolIds.size === 0 && ( (classChoices ?? 0) > 0 || (raceChoices ?? 0) > 0 || (subclassChoices ?? 0) > 0 ) ) {
        return DND_SKILLS;
    }

    // Exclude fixed skills from the selection list to avoid confusion
    const fixed = new Set(this.fixedSkills);
    return skills.filter(s => !fixed.has(s.id));
  }

  /**
   * Toggles a skill selection.
   */
  toggleSkill(skillId: string): void {
    const idx = this.formData.selectedSkills.indexOf(skillId);
    if (idx !== -1) {
      this.formData.selectedSkills = this.formData.selectedSkills.filter(id => id !== skillId);
    } else if (this.formData.selectedSkills.length < this.requiredSkillCount) {
      this.formData.selectedSkills = [...this.formData.selectedSkills, skillId];
    }
    if (this.validationErrors['skills']) {
      delete this.validationErrors['skills'];
    }
  }

  /**
   * Returns true when a skill option should be disabled.
   */
  isSkillDisabled(skillId: string): boolean {
    // Aggregated pool check
    const classPool: string[] | undefined = this.formData.selectedClass?.classFeatures?.skillProficiencies?.choicePool;
    const racePool: string[] | undefined = this.formData.selectedRace?.raceFeatures?.skillProficiencies?.choicePool;
    
    const hasClassPool = classPool && classPool.length > 0;
    const hasRacePool = racePool && racePool.length > 0;

    if (hasClassPool || hasRacePool) {
      const poolIds = new Set<string>();
      if (hasClassPool) classPool?.forEach(p => { const id = poolNameToSkillId(p); if(id) poolIds.add(id); });
      if (hasRacePool) racePool?.forEach(p => { const id = poolNameToSkillId(p); if(id) poolIds.add(id); });
      
      // If a pool is defined but doesn't contain the skill, disable it
      // UNLESS the other one allows ALL skills
      const classAllowsAll = this.formData.selectedClass && !hasClassPool && (this.formData.selectedClass.classFeatures?.skillProficiencies?.choiceCount > 0);
      const raceAllowsAll = this.formData.selectedRace && !hasRacePool && (this.formData.selectedRace.raceFeatures?.skillProficiencies?.choiceCount > 0);
      
      if (!poolIds.has(skillId) && !classAllowsAll && !raceAllowsAll) {
        return true;
      }
    }

    // Disable skills beyond requiredSkillCount once max selections reached
    return this.formData.selectedSkills.length >= this.requiredSkillCount &&
      !this.formData.selectedSkills.includes(skillId);
  }

  /** Computed HP preview using the selected class hit die and final CON. */
  get previewHp(): number | null {
    if (!this.formData.selectedClass) return null;
    const finalCon = this.getFinalScore('con');
    if (finalCon === null) return null;
    const conMod = getModifier(finalCon);

    const rawHitDie = this.formData.selectedClass.hitDie;
    const primaryHitDie = typeof rawHitDie === 'string' ? parseInt(rawHitDie.replace('d', ''), 10) : (rawHitDie ?? 8);

    const multiclassLevels = this.formData.multiclasses.reduce((sum, mc) => sum + mc.level, 0);
    const primaryLevel = this.formData.level - multiclassLevels;

    const mcData = this.formData.multiclasses.map(mc => ({
      hitDie: typeof mc.dndClass.hitDie === 'string' ? parseInt(mc.dndClass.hitDie.replace('d', ''), 10) : (mc.dndClass.hitDie ?? 8),
      level: mc.level
    }));

    return calculateMulticlassHp(
      primaryHitDie,
      conMod,
      primaryLevel,
      mcData,
      this.formData.hpGenerationMode,
      this.formData.hpRolledValue
    );
  }

  // ─── Spells step logic ───────────────────────────────────────────────────────

  get availableCantrips(): any[] {
    const className = this.formData.selectedClass?.name;
    const additionalClass = this.formData.selectedSubclass?.subclassFeatures?.additionalSpellClass;
    const expandedSpells = (this.formData.selectedSubclass?.subclassFeatures?.expandedSpellList || [])
      .map((s: any) => s.name);

    if (!className) return [];
    return this.allSpells.filter(s => 
      s.level === 0 && 
      (
        s.spellClasses?.split(',').map((c: string) => c.trim()).includes(className) ||
        (additionalClass && s.spellClasses?.split(',').map((c: string) => c.trim()).includes(additionalClass)) ||
        expandedSpells.includes(s.name)
      )
    );
  }

  get availableNonCantrips(): any[] {
    const className = this.formData.selectedClass?.name;
    const additionalClass = this.formData.selectedSubclass?.subclassFeatures?.additionalSpellClass;
    const expandedSpells = (this.formData.selectedSubclass?.subclassFeatures?.expandedSpellList || [])
      .map((s: any) => s.name);

    if (!className) return [];

    const maxLevel = this.maxSpellLevel;

    return this.allSpells.filter(s => 
      s.level > 0 && 
      s.level <= maxLevel &&
      (
        s.spellClasses?.split(',').map((c: string) => c.trim()).includes(className) ||
        (additionalClass && s.spellClasses?.split(',').map((c: string) => c.trim()).includes(additionalClass)) ||
        expandedSpells.includes(s.name)
      )
    );
  }

  get maxSpellLevel(): number {
    const cls = this.formData.selectedClass;
    const sc = this.formData.selectedSubclass?.subclassFeatures?.spellcasting || cls?.classFeatures?.spellcasting;
    if (!sc || !sc.spellSlots?.slots) return 9; // Fallback to level 9 if no slot table (should not happen for casters)

    const level = this.formData.level;
    const idx = Math.min(Math.max(level - 1, 0), 19);
    const slotsAtLevel = sc.spellSlots.slots[idx] || [];

    // Find the highest index that has a non-zero slot value
    let highest = 0;
    for (let i = 0; i < slotsAtLevel.length; i++) {
      if (slotsAtLevel[i] > 0) {
        highest = i + 1;
      }
    }
    return highest || 1; // At least level 1 if they have spellcasting
  }

  get cantripsAllowed(): number {
    const cls = this.formData.selectedClass;
    const sc = this.formData.selectedSubclass?.subclassFeatures?.spellcasting || cls?.classFeatures?.spellcasting;
    if (!sc) return 0;
    const idx = Math.min(Math.max(this.formData.level - 1, 0), 19);
    return sc.cantripsKnown?.[idx] || 0;
  }

  get spellsAllowed(): number {
    const cls = this.formData.selectedClass;
    const sc = this.formData.selectedSubclass?.subclassFeatures?.spellcasting || cls?.classFeatures?.spellcasting;
    if (!sc) return 0;

    const level = this.formData.level;
    const idx = Math.min(Math.max(level - 1, 0), 19);

    // Wizard / Book Caster formula: 6 at lvl 1, +2 per level thereafter
    // In D&D, Prepared casters usually 'know' their whole list, 
    // but Wizards have a Spellbook with this specific progression.
    if (cls?.name?.toLowerCase() === 'wizard' || sc.preparationStyle === 'PREPARED') {
      return 6 + (level - 1) * 2;
    }

    // Known Casters: Check the spellsKnown table from the JSON
    return sc.spellsKnown?.[idx] || 0;
  }

  get selectedCantripsCount(): number {
    return this.formData.selectedSpells.filter(id => this.allSpells.find(s => s.id === id)?.level === 0).length;
  }

  get selectedNonCantripsCount(): number {
    return this.formData.selectedSpells.filter(id => this.allSpells.find(s => s.id === id)?.level > 0).length;
  }

  isSpellSelected(spellId: string): boolean {
    return this.formData.selectedSpells.includes(spellId);
  }

  getSpellById(spellId: string): any {
    return this.allSpells.find(s => s.id === spellId);
  }

  isSpellDisabled(spellId: string, isCantrip: boolean): boolean {
    if (this.formData.selectedSpells.includes(spellId)) return false; 
    if (isCantrip && this.selectedCantripsCount >= this.cantripsAllowed) return true;
    if (!isCantrip && this.selectedNonCantripsCount >= this.spellsAllowed) return true;
    return false;
  }

  toggleSpell(spellId: string): void {
    const idx = this.formData.selectedSpells.indexOf(spellId);
    if (idx !== -1) {
      this.formData.selectedSpells.splice(idx, 1);
    } else {
      this.formData.selectedSpells.push(spellId);
    }
  }

  /** Submit the character to the backend. */
  submitCharacter(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.submitError = false;

    const finalCon = this.getFinalScore('con') ?? 10;
    const finalScores = {
      str: this.getFinalScore('str') ?? 10,
      dex: this.getFinalScore('dex') ?? 10,
      con: finalCon,
      int: this.getFinalScore('int') ?? 10,
      wis: this.getFinalScore('wis') ?? 10,
      cha: this.getFinalScore('cha') ?? 10,
    };
    const conMod = getModifier(finalCon);
    const rawHitDie = this.formData.selectedClass?.hitDie;
    const primaryHitDie = typeof rawHitDie === 'string' ? parseInt(rawHitDie.replace('d', ''), 10) : (rawHitDie ?? 8);

    const multiclassLevels = this.formData.multiclasses.reduce((sum, mc) => sum + mc.level, 0);
    const primaryLevel = this.formData.level - multiclassLevels;

    const mcData = this.formData.multiclasses.map(mc => ({
      hitDie: typeof mc.dndClass.hitDie === 'string' ? parseInt(mc.dndClass.hitDie.replace('d', ''), 10) : (mc.dndClass.hitDie ?? 8),
      level: mc.level
    }));

    const hp = calculateMulticlassHp(
      primaryHitDie,
      conMod,
      primaryLevel,
      mcData,
      this.formData.hpGenerationMode,
      this.formData.hpRolledValue
    );

    // Resolve inventory from structured equipment + player selections
    const equipment = this.structuredEquipment;
    const inventory: ResolvedInventoryLine[] = equipment
      ? resolveInventory(equipment, this.formData.equipmentSelections)
      : [];

    const dto = buildCharacterDto(this.formData, finalScores, hp, this.authService.getUserIdFromToken(), inventory);

    this.apiService.createCharacter(dto).pipe(
      switchMap((response: any) => {
        const charId = response.id;
        if (this.formData.selectedSpells.length > 0) {
          const spellRequests = this.formData.selectedSpells.map(spellId => 
            this.apiService.createCharacterSpell({
              characterId: charId,
              spellId: spellId,
              isPrepared: true
            })
          );
          return forkJoin(spellRequests).pipe(
             switchMap(() => of(response))
          );
        }
        return of(response);
      })
    ).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.router.navigate(['/character-sheet', response.id]);
      },
      error: () => {
        this.isSubmitting = false;
        this.submitError = true;
      }
    });
  }

  // ─── Per-step validation ─────────────────────────────────────────────────────

  private _validateCurrentStep(): { [key: string]: string } {
    const stepName = this.activeSteps[this.currentStep];
    switch (stepName) {
      case 'identity': return validateIdentityStep(this.formData);
      case 'race': return this.formData.selectedRace ? {} : { race: 'Selecciona una raza para continuar.' };
      case 'languages': return this.formData.selectedLanguages.length === this.extraLanguageChoicesCount ? {} : { languages: `Selecciona exactamente ${this.extraLanguageChoicesCount} idiomas.` };
      case 'class': return this.formData.selectedClass ? {} : { class: 'Selecciona una clase para continuar.' };
      case 'subclass': return this.formData.selectedSubclass ? {} : { subclass: 'Selecciona una subclase para continuar.' };
      case 'equipment': return this._validateEquipmentStep();
      case 'ability-scores': return this._validateAbilityScoresStep();
      case 'skills': return this.formData.selectedSkills.length === this.requiredSkillCount ? {} : { skills: `Selecciona exactamente ${this.requiredSkillCount} habilidades.` };
      case 'spells': {
        const cantripDiff = this.cantripsAllowed - this.selectedCantripsCount;
        const spellDiff = this.spellsAllowed - this.selectedNonCantripsCount;
        if (cantripDiff > 0 || spellDiff > 0) {
          return { spells: `Te faltan elegir ${cantripDiff > 0 ? cantripDiff + ' trucos' : ''}${cantripDiff > 0 && spellDiff > 0 ? ' y ' : ''}${spellDiff > 0 ? spellDiff + ' conjuros' : ''}.` };
        }
        return {};
      }
      default: return {};
    }
  }

  private _validateEquipmentStep(): { [key: string]: string } {
    const equipment = this.structuredEquipment;
    if (!equipment) return {};
    for (let i = 0; i < equipment.choiceSets.length; i++) {
      if (this.formData.equipmentSelections[i] == null) {
        return { equipment: 'Debes seleccionar una opción para cada conjunto de equipamiento.' };
      }
    }
    return {};
  }

  private _validateAbilityScoresStep(): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    if (this.formData.scoreMode === 'standard') {
      const allAssigned = Object.values(this.formData.tokenAssignments).every(v => v !== null);
      if (!allAssigned) errors['scores'] = 'Asigna todos los valores de habilidad.';
    } else {
      const scores = this.formData.manualScores;
      const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
      for (const key of keys) {
        if (scores[key] < 1 || scores[key] > 20) {
          errors[key] = 'El valor debe estar entre 1 y 20';
        }
      }
    }
    if (this.formData.hpGenerationMode === 'roll' && this.formData.level > 1) {
      const maxRoll = (this.formData.level - 1) * (this.formData.selectedClass?.hitDie ?? 8);
      const minRoll = this.formData.level - 1;
      if (this.formData.hpRolledValue < minRoll || this.formData.hpRolledValue > maxRoll) {
         errors['hpRolledValue'] = `El valor de HP debe estar entre ${minRoll} y ${maxRoll}`;
      }
    }
    return errors;
  }

  toggleFeatureOption(featureName: string, optionName: string, maxChoices: number): void {
    const current = this.formData.featureSelections[featureName] || [];
    if (current.includes(optionName)) {
      this.formData.featureSelections[featureName] = current.filter(o => o !== optionName);
    } else {
      if (current.length < maxChoices) {
        this.formData.featureSelections[featureName] = [...current, optionName];
      }
    }
  }

  isFeatureOptionSelected(featureName: string, optionName: string): boolean {
    return (this.formData.featureSelections[featureName] || []).includes(optionName);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  get currentStepName(): Step {
    return this.activeSteps[this.currentStep] as Step;
  }

  get currentStepLabel(): string {
    return STEP_LABELS[this.currentStepName];
  }
}

// ─── Pure helper functions ────────────────────────────────────────────────────

/**
 * Validates the identity step fields.
 * Returns a map of field → error message; empty map means valid.
 */
export function validateIdentityStep(formData: Pick<CharacterFormData, 'name' | 'background' | 'alignment' | 'xp' | 'level'>): { [key: string]: string } {
  const errors: { [key: string]: string } = {};

  const trimmedName = formData.name.trim();
  if (trimmedName.length === 0) {
    errors['name'] = 'El nombre es obligatorio';
  } else if (trimmedName.length > 50) {
    errors['name'] = 'El nombre no puede superar 50 caracteres';
  }

  if (formData.background.trim().length === 0) {
    errors['background'] = 'El trasfondo es obligatorio';
  }

  if (!formData.alignment) {
    errors['alignment'] = 'Selecciona un alineamiento';
  }

  if (formData.xp < 0) {
    errors['xp'] = 'La experiencia no puede ser negativa';
  }

  if (formData.level < 1 || formData.level > 20) {
    errors['level'] = 'El nivel debe estar entre 1 y 20';
  }

  return errors;
}

/**
 * Filters a list of subclasses to only those belonging to the given parent class id.
 */
export function filterSubclasses(subclasses: any[], parentClassId: string): any[] {
  return subclasses.filter(sc => sc?.parentClass?.id === parentClassId);
}

/**
 * Formats the saving throws map of a class into a human-readable string.
 * e.g. { str: true, con: true } → "FUE, CON"
 * Only includes keys where value is true.
 */
export function formatSavingThrows(cls: any): string {
  if (!cls || !cls.savingThrows) return '';

  const SAVE_LABELS: { [key: string]: string } = {
    str: 'FUE',
    dex: 'DES',
    con: 'CON',
    int: 'INT',
    wis: 'SAB',
    cha: 'CAR',
  };

  const parts = Object.entries(cls.savingThrows as { [key: string]: boolean })
    .filter(([, value]) => value === true)
    .map(([key]) => SAVE_LABELS[key] ?? key.toUpperCase());

  return parts.join(', ');
}

/**
 * Formats the racial ability-score bonuses into a human-readable string.
 * e.g. "+2 FU, +1 CON"
 * Returns an empty string if the race has no bonuses.
 */
export function formatRaceBonuses(race: any): string {
  if (!race) return '';

  const BONUS_LABELS: { field: string; label: string }[] = [
    { field: 'bonusStr', label: 'FU' },
    { field: 'bonusDex', label: 'DES' },
    { field: 'bonusCon', label: 'CON' },
    { field: 'bonusInt', label: 'INT' },
    { field: 'bonusWis', label: 'SAB' },
    { field: 'bonusCha', label: 'CAR' },
  ];

  const parts = BONUS_LABELS
    .filter(({ field }) => race[field] && race[field] !== 0)
    .map(({ field, label }) => {
      const val: number = race[field];
      return `${val > 0 ? '+' : ''}${val} ${label}`;
    });

  return parts.join(', ');
}


/**
 * Validates a single manual ability score value.
 * Returns an error message if invalid, or null if valid.
 */
export function validateManualScore(value: number): string | null {
  if (value < 1 || value > 20) {
    return 'El valor debe estar entre 1 y 20';
  }
  return null;
}

/**
 * Builds the CharacterDto from the completed form data.
 * This is a pure function — all inputs are explicit parameters.
 *
 * @param formData  The completed CharacterFormData
 * @param finalScores  The final ability scores (base + racial bonus) for each ability
 * @param hp  The calculated starting HP (hitDie + conModifier)
 * @param userId  The authenticated user's ID from the JWT token
 * @param inventory  Resolved inventory lines from structured equipment (empty array for legacy/no equipment)
 */
export function buildCharacterDto(
  formData: CharacterFormData,
  finalScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  hp: number,
  userId: string | null,
  inventory: ResolvedInventoryLine[] = []
): any {
  // Initialize ALL 6 saving throws as false to avoid backend null-to-boolean errors
  const savingThrowsProficiencies: { [key: string]: boolean } = {
    str: false, dex: false, con: false, int: false, wis: false, cha: false
  };
  const classSaves = formData.selectedClass?.savingThrows ?? {};
  const SAVE_MAPPING: { [key: string]: string } = {
    'Strength': 'str', 'Dexterity': 'dex', 'Constitution': 'con',
    'Intelligence': 'int', 'Wisdom': 'wis', 'Charisma': 'cha',
    'str': 'str', 'dex': 'dex', 'con': 'con', 'int': 'int', 'wis': 'wis', 'cha': 'cha'
  };
  Object.entries(classSaves).forEach(([key, value]) => {
    const normalizedKey = SAVE_MAPPING[key] || key.toLowerCase();
    if (value) savingThrowsProficiencies[normalizedKey] = true;
  });

  // Initialize ALL 18 skills as false to avoid backend null-to-boolean errors
  const skillProficiencies: { [key: string]: boolean } = {};
  DND_SKILLS.forEach(s => skillProficiencies[s.id] = false);
  
  // Include fixed skills
  const classFixed = formData.selectedClass?.classFeatures?.skillProficiencies?.fixed;
  if (Array.isArray(classFixed)) {
    classFixed.forEach(s => {
      const id = ENGLISH_SKILL_TO_ID[s.toLowerCase().trim()];
      if (id) skillProficiencies[id] = true;
    });
  }
  const raceFixed = formData.selectedRace?.raceFeatures?.skillProficiencies?.fixed;
  if (Array.isArray(raceFixed)) {
    raceFixed.forEach(s => {
      const id = ENGLISH_SKILL_TO_ID[s.toLowerCase().trim()];
      if (id) skillProficiencies[id] = true;
    });
  }
  const subclassFixed = formData.selectedSubclass?.subclassFeatures?.skillProficiencies?.fixed;
  if (Array.isArray(subclassFixed)) {
    subclassFixed.forEach(s => {
      const id = ENGLISH_SKILL_TO_ID[s.toLowerCase().trim()];
      if (id) skillProficiencies[id] = true;
    });
  }

  // Include selected skills from pools
  for (const skillId of formData.selectedSkills) {
    skillProficiencies[skillId] = true;
  }

  return {
    user: { id: userId },
    name: formData.name,
    background: formData.background,
    alignment: formData.alignment,
    xp: formData.xp,
    level: formData.level,
    maxHp: hp,
    currentHp: hp,
    tempHp: 0,
    speed: formData.selectedRace?.raceFeatures?.speeds?.walk || 30,
    hitDiceTotal: formData.level,
    hitDiceSpent: 0,
    baseStr: finalScores.str,
    baseDex: finalScores.dex,
    baseCon: finalScores.con,
    baseInt: finalScores.int,
    baseWis: finalScores.wis,
    baseCha: finalScores.cha,
    savingThrowsProficiencies,
    skillProficiencies,
    spellSlots: {},
    choicesJson: {
      ...(formData.selectedLanguages?.length > 0 ? { languages: formData.selectedLanguages } : {}),
      ...(Object.keys(formData.featureSelections || {}).length > 0 ? { featureOptions: formData.featureSelections } : {})
    },
    cp: 0, sp: 0, ep: 0, gp: 0, pp: 0,
    dndRace: { id: Number(formData.selectedRace?.id) },
    dndClass: { id: Number(formData.selectedClass?.id) },
    subclassId: formData.selectedSubclass ? Number(formData.selectedSubclass.id) : null,
    classLevels: [
      { 
        classId: Number(formData.selectedClass?.id), 
        subclassId: formData.selectedSubclass ? Number(formData.selectedSubclass.id) : null, 
        level: formData.level - formData.multiclasses.reduce((sum, m) => sum + m.level, 0)
      },
      ...formData.multiclasses.map(m => ({ 
        classId: m.classId, 
        subclassId: m.subclassId, 
        level: m.level 
      }))
    ],
    inventory: inventory.map(line => ({
      item: { id: line.itemId },
      quantity: line.quantity,
      isEquipped: false,
      isAttuned: false,
      characterId: '00000000-0000-0000-0000-000000000000' 
    }))
  };
}

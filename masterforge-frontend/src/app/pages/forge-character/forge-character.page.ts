import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonBackButton,
  IonIcon, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonGrid, IonRow, IonCol, IonSpinner, IonBadge, IonList,
  IonSegment, IonSegmentButton, IonFooter
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = ['identity', 'race', 'class', 'ability-scores', 'skills', 'review'] as const;
type Step = typeof STEPS[number];

export const STEP_LABELS: Record<Step, string> = {
  'identity': 'Identidad',
  'race': 'Raza',
  'class': 'Clase',
  'ability-scores': 'Puntuaciones',
  'skills': 'Habilidades',
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

// ─── CharacterFormData interface ──────────────────────────────────────────────
export interface CharacterFormData {
  // Step 0: Identity
  name: string;
  background: string;
  alignment: string;
  xp: number;

  // Step 1: Race
  selectedRace: any | null;

  // Step 2: Class
  selectedClass: any | null;
  selectedSubclass: any | null;

  // Step 3: Ability Scores
  scoreMode: 'standard' | 'manual';
  tokenAssignments: { [abilityKey: string]: number | null };
  manualScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };

  // Step 4: Skills
  selectedSkills: string[];

  // Derived (computed at review/submit)
  finalScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  calculatedHp: number;
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
    IonSegment, IonSegmentButton, IonFooter
  ],
  encapsulation: ViewEncapsulation.None
})
export class ForgeCharacterPage implements OnInit {

  // ─── Step state ─────────────────────────────────────────────────────────────
  readonly steps = STEPS;
  currentStep: number = 0;

  // ─── Form data ──────────────────────────────────────────────────────────────
  formData: CharacterFormData = {
    name: '',
    background: '',
    alignment: '',
    xp: 0,
    selectedRace: null,
    selectedClass: null,
    selectedSubclass: null,
    scoreMode: 'standard',
    tokenAssignments: { str: null, dex: null, con: null, int: null, wis: null, cha: null },
    manualScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    selectedSkills: [],
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

  // ─── Submit error state ──────────────────────────────────────────────────────
  submitError: boolean = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialization logic will be added in later tasks
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  nextStep(): void {
    this.validationErrors = {};

    const errors = this._validateCurrentStep();
    if (Object.keys(errors).length > 0) {
      this.validationErrors = errors;
      return;
    }

    if (this.currentStep < STEPS.length - 1) {
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

  private _loadDataForStep(step: number): void {
    if (step === 1 && !this._racesLoaded) {
      this._loadRaces();
    }
    if (step === 2 && !this._classesLoaded) {
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
    if (this.validationErrors['race']) {
      delete this.validationErrors['race'];
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

  // ─── Skills step ─────────────────────────────────────────────────────────────

  /**
   * Toggles a skill selection. If the skill is already selected, deselects it.
   * If fewer than 2 skills are selected, selects it.
   * Does nothing if 2 skills are already selected and this skill is not one of them.
   */
  toggleSkill(skillId: string): void {
    const idx = this.formData.selectedSkills.indexOf(skillId);
    if (idx !== -1) {
      // Deselect
      this.formData.selectedSkills = this.formData.selectedSkills.filter(id => id !== skillId);
    } else if (this.formData.selectedSkills.length < 2) {
      // Select
      this.formData.selectedSkills = [...this.formData.selectedSkills, skillId];
    }
    if (this.validationErrors['skills']) {
      delete this.validationErrors['skills'];
    }
  }

  /** Returns true when a skill option should be disabled (2 already selected and this one isn't). */
  isSkillDisabled(skillId: string): boolean {
    return this.formData.selectedSkills.length >= 2 && !this.formData.selectedSkills.includes(skillId);
  }

  /** Computed HP preview using the selected class hit die and final CON. */
  get previewHp(): number | null {
    if (!this.formData.selectedClass) return null;
    const finalCon = this.getFinalScore('con');
    if (finalCon === null) return null;
    return calculateHp(this.formData.selectedClass.hitDie, finalCon);
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
    const hp = calculateHp(this.formData.selectedClass?.hitDie ?? 8, finalCon);

    const dto = buildCharacterDto(this.formData, finalScores, hp, this.authService.getUserIdFromToken());

    this.apiService.createCharacter(dto).subscribe({
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
    switch (this.currentStep) {
      case 0: return validateIdentityStep(this.formData);
      case 1: return this.formData.selectedRace ? {} : { race: 'Selecciona una raza para continuar.' };
      case 2: return this.formData.selectedClass ? {} : { class: 'Selecciona una clase para continuar.' };
      case 3: return this._validateAbilityScoresStep();
      case 4: return this.formData.selectedSkills.length === 2 ? {} : { skills: 'Selecciona exactamente 2 habilidades.' };
      default: return {};
    }
  }

  private _validateAbilityScoresStep(): { [key: string]: string } {
    if (this.formData.scoreMode === 'standard') {
      const allAssigned = Object.values(this.formData.tokenAssignments).every(v => v !== null);
      return allAssigned ? {} : { scores: 'Asigna todos los valores de habilidad.' };
    }
    const scores = this.formData.manualScores;
    const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
    const errors: { [key: string]: string } = {};
    for (const key of keys) {
      if (scores[key] < 1 || scores[key] > 20) {
        errors[key] = 'El valor debe estar entre 1 y 20';
      }
    }
    return errors;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  get currentStepName(): Step {
    return STEPS[this.currentStep];
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
export function validateIdentityStep(formData: Pick<CharacterFormData, 'name' | 'background' | 'alignment' | 'xp'>): { [key: string]: string } {
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
 * Calculates the starting HP for a level-1 character.
 * Formula: hitDie + Math.floor((finalCon - 10) / 2)
 * @param hitDie  The class hit die value (e.g. 8 for d8)
 * @param finalCon  The final Constitution score (base + racial bonus)
 */
export function calculateHp(hitDie: number, finalCon: number): number {
  const conModifier = Math.floor((finalCon - 10) / 2);
  return hitDie + conModifier;
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
 */
export function buildCharacterDto(
  formData: CharacterFormData,
  finalScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number },
  hp: number,
  userId: string | null
): any {
  const skillProficiencies: { [key: string]: boolean } = {};
  for (const skillId of formData.selectedSkills) {
    skillProficiencies[skillId] = true;
  }

  return {
    name: formData.name,
    background: formData.background,
    alignment: formData.alignment,
    xp: formData.xp,
    level: 1,
    maxHp: hp,
    currentHp: hp,
    tempHp: 0,
    speed: 30,
    hitDiceTotal: 1,
    hitDiceSpent: 0,
    baseStr: finalScores.str,
    baseDex: finalScores.dex,
    baseCon: finalScores.con,
    baseInt: finalScores.int,
    baseWis: finalScores.wis,
    baseCha: finalScores.cha,
    savingThrowsProficiencies: formData.selectedClass?.savingThrows ?? {},
    skillProficiencies,
    spellSlots: {},
    choicesJson: {},
    cp: 0, sp: 0, ep: 0, gp: 0, pp: 0,
    user: { id: userId },
    dndRace: { id: formData.selectedRace?.id },
    dndClass: { id: formData.selectedClass?.id },
    subclassId: formData.selectedSubclass?.id ?? null,
    inventory: []
  };
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonButton, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import {
  SpeedObject,
  SenseObject,
  SenseObject as Senses,
  FeatureEntry,
  AttackEntry,
  MonsterSkillEntry as SkillEntry,
  MonsterSavingThrows as SavingThrows,
  CombatMechanics,
  SKILL_DATA
} from '../../models/homebrew.models';

/** Valid size options for a D&D monster. */
export const MONSTER_SIZES = ['Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

/** Valid creature types in D&D 5e. */
export const MONSTER_TYPES = [
  'Aberration',
  'Beast',
  'Celestial',
  'Construct',
  'Dragon',
  'Elemental',
  'Fey',
  'Fiend',
  'Giant',
  'Humanoid',
  'Monstrosity',
  'Ooze',
  'Plant',
  'Undead',
] as const;
  
/** Valid alignments in D&D 5e. */
export const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
  'Unaligned', 'Any Alignment'
] as const;

/** All damage types in D&D 5e. */
export const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
] as const;

/** All conditions in D&D 5e. */
export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;

/** All skills in D&D 5e. */
export const SKILL_NAMES = Object.keys(SKILL_DATA).sort() as string[];

export const ABILITY_ABBREVIATIONS: Record<string, string> = {
  'Strength': 'FUE',
  'Dexterity': 'DES',
  'Constitution': 'CON',
  'Intelligence': 'INT',
  'Wisdom': 'SAB',
  'Charisma': 'CAR'
};

/** The six base ability score fields for a monster. */
export const MONSTER_ABILITY_KEYS = ['str', 'dex', 'con', 'intStat', 'wis', 'cha'] as const;



// ---------------------------------------------------------------------------
// Pure serialization function
// ---------------------------------------------------------------------------

/**
 * Builds the `combatMechanics` object from the individual form values.
 *
 * - `savingThrows`: only keys with a numeric (non-null) value are included.
 * - `senses`: only keys with a non-null, non-empty-string value are included.
 *
 * This function is exported so it can be tested without mounting the component.
 */
export function buildCombatMechanics(
  description: string,
  savingThrows: SavingThrows,
  skills: SkillEntry[],
  damageResistances: string | string[],
  damageImmunities: string | string[],
  damageVulnerabilities: string | string[],
  conditionImmunities: string | string[],
  senses: SenseObject,
  attacks: AttackEntry[],
  abilities: FeatureEntry[],
  languages?: string | string[],
  speeds?: SpeedObject,
  legendaryActions?: any[],
): CombatMechanics {
  // Filter savingThrows: keep only keys whose value is a non-null number
  const filteredSavingThrows: Partial<Record<keyof SavingThrows, number>> = {};
  (Object.keys(savingThrows) as Array<keyof SavingThrows>).forEach((key) => {
    const val = savingThrows[key];
    if (val !== null && typeof val === 'number') {
      filteredSavingThrows[key] = val;
    }
  });

  // Filter senses: keep only keys whose value is not null and not ""
  const filteredSenses: Partial<Senses> = {};
  (Object.keys(senses) as Array<keyof Senses>).forEach((key) => {
    if (key === ('languages' as any)) return; // Don't include languages in senses
    const val = (senses as any)[key];
    if (val !== null && val !== '') {
      (filteredSenses as any)[key] = val;
    }
  });

  const toArray = (val: string | string[] | undefined): string[] => {
    if (Array.isArray(val)) return val;
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
  };

  return {
    description,
    savingThrows: filteredSavingThrows,
    skills,
    damageResistances:     toArray(damageResistances),
    damageImmunities:      toArray(damageImmunities),
    damageVulnerabilities: toArray(damageVulnerabilities),
    conditionImmunities:   toArray(conditionImmunities),
    languages:             toArray(languages),
    senses:                filteredSenses,
    attacks,
    abilities,
    speeds,
    legendaryActions,
  };
}

@Component({
  selector: 'app-homebrew-monster-form',
  templateUrl: './homebrew-monster-form.page.html',
  styleUrls: ['./homebrew-monster-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
  ],
})
export class HomebrewMonsterFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Edit mode — set when route has an :id param */
  editMode = false;
  editId: string | null = null;

  /** State for the skill picker (dropdown + bonus input before confirming). */
  pendingSkillName: string = '';
  pendingSkillBonus: number | null = null;
  skillDropdownOpen = false;

  /** Toggle the custom skill dropdown. */
  toggleSkillDropdown(): void {
    this.skillDropdownOpen = !this.skillDropdownOpen;
  }

  /** Select a skill from the custom dropdown. */
  selectSkillFromDropdown(skill: string): void {
    this.pendingSkillName = skill;
    this.skillDropdownOpen = false;
  }

  /** Close the dropdown when clicking outside. */
  closeSkillDropdown(): void {
    this.skillDropdownOpen = false;
  }

  getSkillAbility(skill: string): string {
    return this.skillData[skill] || '';
  }

  getSkillAbbr(skill: string): string {
    const ability = this.getSkillAbility(skill);
    return this.abilityAbbr[ability] || '';
  }

  translateSkill(skill: string): string {
    if (!skill) return '';
    const map: Record<string, string> = {
      'Acrobatics': 'Acrobacias',
      'Animal Handling': 'Trato con Animales',
      'Arcana': 'Arcana',
      'Athletics': 'Atletismo',
      'Deception': 'Engaño',
      'History': 'Historia',
      'Insight': 'Perspicacia',
      'Intimidation': 'Intimidación',
      'Investigation': 'Investigación',
      'Medicine': 'Medicina',
      'Nature': 'Naturaleza',
      'Perception': 'Percepción',
      'Performance': 'Interpretación',
      'Persuasion': 'Persuasión',
      'Religion': 'Religión',
      'Sleight of Hand': 'Juego de Manos',
      'Stealth': 'Sigilo',
      'Survival': 'Supervivencia'
    };
    return map[skill] || skill;
  }

  /** Exposed for template iteration. */
  readonly monsterTypes = MONSTER_TYPES;
  readonly monsterSizes = MONSTER_SIZES;
  readonly alignments   = ALIGNMENTS;
  readonly damageTypes  = DAMAGE_TYPES;
  readonly conditions   = CONDITIONS;
  readonly skillNames   = SKILL_NAMES;
  readonly abilityKeys  = MONSTER_ABILITY_KEYS;
  readonly skillData    = SKILL_DATA;
  readonly abilityAbbr  = ABILITY_ABBREVIATIONS;

  /** Human-readable labels for each ability score key. */
  readonly abilityLabels: Record<string, string> = {
    str: 'FUE',
    dex: 'DES',
    con: 'CON',
    intStat: 'INT',
    wis: 'SAB',
    cha: 'CAR',
  };

  get isManagerOrAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'MANAGER' || user?.role === 'ADMIN';
  }

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Build ability score controls — each required and clamped to [1, 30]
    const abilityControls = MONSTER_ABILITY_KEYS.reduce(
      (acc, key) => ({
        ...acc,
        [key]: [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      }),
      {} as Record<string, any>,
    );

    this.form = this.fb.group({
      name:            ['', Validators.required],
      type:            ['', Validators.required],
      size:            ['', Validators.required],
      alignment:       ['', Validators.required],
      armorClass:      [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      hitPoints:       [null, [Validators.required, Validators.min(1)]],
      isOfficial:      [true],
      speed:           ['', Validators.required],
      ...abilityControls,
      challengeRating: [null, [Validators.required, Validators.min(0)]],
      xp:              [null, [Validators.required, Validators.min(0)]],

      // --- New combat mechanics fields ---
      description:           [''],
      savingThrows: this.fb.group({
        str: [null],
        dex: [null],
        con: [null],
        int: [null],
        wis: [null],
        cha: [null],
      }),
      skills: this.fb.group(
        // One FormGroup per skill: { selected: boolean, bonus: number | null }
        SKILL_NAMES.reduce((acc, skill) => ({
          ...acc,
          [skill]: this.fb.group({ selected: [false], bonus: [null] }),
        }), {} as Record<string, any>),
      ),
      damageResistances:     this.fb.array(DAMAGE_TYPES.map(() => false)),
      damageImmunities:      this.fb.array(DAMAGE_TYPES.map(() => false)),
      damageVulnerabilities: this.fb.array(DAMAGE_TYPES.map(() => false)),
      conditionImmunities:   this.fb.array(CONDITIONS.map(() => false)),
      senses: this.fb.group({
        darkvision:        [''],
        blindsight:        [''],
        tremorsense:       [''],
        truesight:         [''],
        passivePerception: [null],
        languages:         [''],
      }),
      attacks:   this.fb.array([]),
      abilities: this.fb.array([]),
      hasLegendaryActions: [false],
      legendaryActions: this.fb.array([]),
    });

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadMonsterForEdit(id);
    }
  }

  /** Load an existing monster and pre-fill the form for editing. */
  private loadMonsterForEdit(id: string): void {
    this.homebrewService.getMonster(id).subscribe({
      next: (monster: any) => {
        const cm = monster.combatMechanics ?? {};

        // Patch basic stats
        this.form.patchValue({
          name: monster.name,
          type: monster.type,
          size: monster.size,
          alignment: monster.alignment,
          armorClass: monster.armorClass,
          hitPoints: monster.hitPoints,
          speed: monster.speed,
          str: monster.str,
          dex: monster.dex,
          con: monster.con,
          intStat: monster.intStat,
          wis: monster.wis,
          cha: monster.cha,
          challengeRating: monster.challengeRating,
          xp: monster.xp,
          description: cm.description ?? '',
          isOfficial: monster.author === null || !monster.author,
        });

        // Patch senses & languages
        if (cm.senses || cm.languages) {
          const sensesPatch = { 
            ...(cm.senses ?? {}),
            languages: Array.isArray(cm.languages) ? cm.languages.join(', ') : (cm.languages ?? '')
          };
          this.form.get('senses')?.patchValue(sensesPatch);
        }

        // Patch saving throws
        if (cm.savingThrows) {
          this.form.get('savingThrows')?.patchValue(cm.savingThrows);
        }

        // Patch senses
        if (cm.senses) {
          this.form.get('senses')?.patchValue(cm.senses);
        }

        // Patch damage resistances/immunities/vulnerabilities/conditions
        const patchBoolArray = (controlName: string, labels: readonly string[], value: string | string[]) => {
          const selected = Array.isArray(value) ? value : (value ?? '').split(',').map((s: string) => s.trim());
          const arr = this.form.get(controlName) as FormArray;
          labels.forEach((label, i) => arr.at(i).setValue(selected.includes(label)));
        };
        patchBoolArray('damageResistances',     DAMAGE_TYPES, cm.damageResistances ?? []);
        patchBoolArray('damageImmunities',      DAMAGE_TYPES, cm.damageImmunities ?? []);
        patchBoolArray('damageVulnerabilities', DAMAGE_TYPES, cm.damageVulnerabilities ?? []);
        patchBoolArray('conditionImmunities',   CONDITIONS,   cm.conditionImmunities ?? []);

        // Patch skills
        if (Array.isArray(cm.skills)) {
          cm.skills.forEach((entry: any) => {
            const skillGroup = this.skills.get(entry.name) as FormGroup;
            if (skillGroup) {
              skillGroup.patchValue({ selected: true, bonus: entry.bonus });
            }
          });
        }

        // Patch attacks
        if (Array.isArray(cm.attacks)) {
          cm.attacks.forEach((a: any) => {
            this.attacks.push(this.fb.group({
              name:        [a.name ?? '', Validators.required],
              attackBonus: [a.attackBonus ?? null],
              damageDice:  [a.damageDice ?? ''],
              damageType:  [a.damageType ?? ''],
              reach:       [a.reach ?? ''],
              description: [a.description ?? ''],
            }));
          });
        }

        // Patch abilities
        if (Array.isArray(cm.abilities)) {
          cm.abilities.forEach((a: any) => {
            this.abilities.push(this.fb.group({
              name:        [a.name ?? '', Validators.required],
              description: [a.description ?? '', Validators.required],
            }));
          });
        }

        // Patch legendary actions
        if (Array.isArray(cm.legendaryActions) && cm.legendaryActions.length > 0) {
          this.form.patchValue({ hasLegendaryActions: true });
          cm.legendaryActions.forEach((la: any) => {
            this.legendaryActions.push(this.fb.group({
              name: [la.name ?? '', Validators.required],
              description: [la.description ?? '', Validators.required],
            }));
          });
        }
      },
      error: (err: any) => {
        this.error = 'No se pudo cargar el monstruo para editar.';
      },
    });
  }

  // ---------------------------------------------------------------------------
  // FormArray getters
  // ---------------------------------------------------------------------------

  get attacks(): FormArray {
    return this.form.get('attacks') as FormArray;
  }

  get abilities(): FormArray {
    return this.form.get('abilities') as FormArray;
  }

  get skills(): FormGroup {
    return this.form.get('skills') as FormGroup;
  }

  /** Returns the list of currently selected skill names, in insertion order. */
  get selectedSkillNames(): string[] {
    return SKILL_NAMES.filter(s => this.isSkillSelected(s));
  }

  /** Returns skill names not yet selected (available in the dropdown). */
  get availableSkillNames(): string[] {
    return SKILL_NAMES.filter(s => !this.isSkillSelected(s));
  }

  /** Confirm adding the pending skill with its bonus. */
  confirmAddSkill(): void {
    if (!this.pendingSkillName) return;
    const skillGroup = this.skills.get(this.pendingSkillName) as FormGroup;
    skillGroup.patchValue({ selected: true, bonus: this.pendingSkillBonus });
    // Reset picker
    this.pendingSkillName = '';
    this.pendingSkillBonus = null;
  }

  /** Remove a skill (deselect and clear bonus). */
  removeSkillEntry(skillName: string): void {
    const skillGroup = this.skills.get(skillName) as FormGroup;
    skillGroup.patchValue({ selected: false, bonus: null });
  }

  /** Check if a skill is selected. */
  isSkillSelected(skillName: string): boolean {
    return this.skills.get(skillName)?.get('selected')?.value === true;
  }

  /** Get the bonus value for a skill. */
  getSkillBonus(skillName: string): number | null {
    return this.skills.get(skillName)?.get('bonus')?.value ?? null;
  }

  /** Update the bonus for a skill. */
  updateSkillBonus(skillName: string, bonus: number | null): void {
    this.skills.get(skillName)?.patchValue({ bonus });
  }

  /** Serialize the skills FormGroup into SkillEntry[]. */
  private serializeSkills(): SkillEntry[] {
    return SKILL_NAMES
      .map((skillName) => {
        const skillGroup = this.skills.get(skillName) as FormGroup;
        const selected = skillGroup.get('selected')?.value === true;
        const bonus = skillGroup.get('bonus')?.value;
        return (selected && bonus !== null) ? { name: skillName, bonus } as SkillEntry : null;
      })
      .filter((entry): entry is SkillEntry => entry !== null);
  }

  get damageResistances(): FormArray {
    return this.form.get('damageResistances') as FormArray;
  }

  get damageImmunities(): FormArray {
    return this.form.get('damageImmunities') as FormArray;
  }

  get damageVulnerabilities(): FormArray {
    return this.form.get('damageVulnerabilities') as FormArray;
  }

  get conditionImmunities(): FormArray {
    return this.form.get('conditionImmunities') as FormArray;
  }

  /** Toggle a boolean chip in a damage/condition FormArray. */
  toggleChip(array: FormArray, index: number): void {
    array.at(index).setValue(!array.at(index).value);
  }

  /** Collect the selected labels from a boolean FormArray as a string array. */
  private selectedLabels(array: FormArray, labels: readonly string[]): string[] {
    return labels
      .filter((_, i) => array.at(i).value === true);
  }

  // ---------------------------------------------------------------------------
  // Attack helpers
  // ---------------------------------------------------------------------------

  addAttack(): void {
    this.attacks.push(
      this.fb.group({
        name:        ['', Validators.required],
        attackBonus: [null],
        damageDice:  [''],
        damageType:  [''],
        reach:       [''],
        description: [''],
      }),
    );
  }

  removeAttack(index: number): void {
    this.attacks.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Special ability helpers
  // ---------------------------------------------------------------------------

  addAbility(): void {
    this.abilities.push(
      this.fb.group({
        name:        ['', Validators.required],
        description: ['', Validators.required],
      }),
    );
  }

  removeAbility(index: number): void {
    this.abilities.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Legendary Actions helpers
  // ---------------------------------------------------------------------------

  get legendaryActions(): FormArray {
    return this.form.get('legendaryActions') as FormArray;
  }

  addLegendaryAction(): void {
    this.legendaryActions.push(
      this.fb.group({
        name: ['', Validators.required],
        description: ['', Validators.required],
      })
    );
  }

  removeLegendaryAction(index: number): void {
    this.legendaryActions.removeAt(index);
  }

  // ---------------------------------------------------------------------------

  submit(): void {
    // Mark all controls as touched so validation errors become visible
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;

    // Extract all form values
    const v = this.form.value;

    // Build the combatMechanics object using the pure serialization function
    const combatMechanics = buildCombatMechanics(
      v.description ?? '',
      v.savingThrows ?? { str: null, dex: null, con: null, int: null, wis: null, cha: null },
      this.serializeSkills(),
      this.selectedLabels(this.damageResistances,     DAMAGE_TYPES),
      this.selectedLabels(this.damageImmunities,      DAMAGE_TYPES),
      this.selectedLabels(this.damageVulnerabilities, DAMAGE_TYPES),
      this.selectedLabels(this.conditionImmunities,   CONDITIONS),
      v.senses ?? { darkvision: '', blindsight: '', tremorsense: '', truesight: '', passivePerception: null, languages: '' },
      v.attacks ?? [],
      v.abilities ?? [],
      v.senses?.languages,
      v.speeds,
      v.hasLegendaryActions ? v.legendaryActions : [],
    );

    // Build the complete DTO including combatMechanics
    // Note: authorId is a placeholder — the service will override it with getUserIdFromToken()
    const dto = {
      name: v.name,
      type: v.type,
      size: v.size,
      alignment: v.alignment,
      armorClass: v.armorClass,
      hitPoints: v.hitPoints,
      speed: v.speed,
      str: v.str,
      dex: v.dex,
      con: v.con,
      intStat: v.intStat,
      wis: v.wis,
      cha: v.cha,
      challengeRating: v.challengeRating,
      xp: v.xp,
      authorId: '', // Placeholder — service will override with actual user ID
      combatMechanics,
      isOfficial: !!v.isOfficial,
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateMonster(this.editId, dto)
      : this.homebrewService.createMonster(dto);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
        this.router.navigate([returnUrl]);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          (this.editMode
            ? 'Error al actualizar el monstruo. Por favor, inténtalo de nuevo.'
            : 'Error al crear el monstruo. Por favor, inténtalo de nuevo.');
      },
    });
  }

  cancel(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
    this.router.navigate([returnUrl]);
  }
}

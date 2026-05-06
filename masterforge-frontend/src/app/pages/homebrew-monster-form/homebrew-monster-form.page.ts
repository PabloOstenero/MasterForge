import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonButton, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

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
export const SKILL_NAMES = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
] as const;

/** The six base ability score fields for a monster. */
export const MONSTER_ABILITY_KEYS = ['str', 'dex', 'con', 'intStat', 'wis', 'cha'] as const;

// ---------------------------------------------------------------------------
// Combat mechanics interfaces
// ---------------------------------------------------------------------------

/** A single attack action (melee, ranged, multiattack, reaction, etc.). */
export interface AttackEntry {
  name: string;
  attackBonus: number | null;
  damageDice: string;
  damageType: string;
  reach: string;
}

/** A special ability or passive trait of the monster. */
export interface AbilityEntry {
  name: string;
  description: string;
}

/** A skill proficiency with its bonus. */
export interface SkillEntry {
  name: string;
  bonus: number;
}

/** Saving throw proficiency bonuses (null = no proficiency). */
export interface SavingThrows {
  str: number | null;
  dex: number | null;
  con: number | null;
  int: number | null;
  wis: number | null;
  cha: number | null;
}

/** Special senses of the monster. */
export interface Senses {
  darkvision: string;
  blindsight: string;
  tremorsense: string;
  truesight: string;
  passivePerception: number | null;
}

/** Full structure of the combatMechanics field sent to the backend. */
export interface CombatMechanics {
  description: string;
  savingThrows: Partial<Record<keyof SavingThrows, number>>;
  skills: SkillEntry[];
  damageResistances: string;
  damageImmunities: string;
  damageVulnerabilities: string;
  conditionImmunities: string;
  senses: Partial<Senses>;
  attacks: AttackEntry[];
  abilities: AbilityEntry[];
}

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
  damageResistances: string,
  damageImmunities: string,
  damageVulnerabilities: string,
  conditionImmunities: string,
  senses: Senses,
  attacks: AttackEntry[],
  abilities: AbilityEntry[],
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
    const val = senses[key];
    if (val !== null && val !== '') {
      (filteredSenses as any)[key] = val;
    }
  });

  return {
    description,
    savingThrows: filteredSavingThrows,
    skills,
    damageResistances,
    damageImmunities,
    damageVulnerabilities,
    conditionImmunities,
    senses: filteredSenses,
    attacks,
    abilities,
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

  /** Exposed for template iteration. */
  readonly monsterSizes = MONSTER_SIZES;
  readonly monsterTypes = MONSTER_TYPES;
  readonly damageTypes  = DAMAGE_TYPES;
  readonly conditions   = CONDITIONS;
  readonly skillNames   = SKILL_NAMES;
  readonly abilityKeys  = MONSTER_ABILITY_KEYS;

  /** Human-readable labels for each ability score key. */
  readonly abilityLabels: Record<string, string> = {
    str: 'FUE',
    dex: 'DES',
    con: 'CON',
    intStat: 'INT',
    wis: 'SAB',
    cha: 'CAR',
  };

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
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
      armorClass:      [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      hitPoints:       [null, [Validators.required, Validators.min(1)]],
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
      }),
      attacks:   this.fb.array([]),
      abilities: this.fb.array([]),
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
        });

        // Patch saving throws
        if (cm.savingThrows) {
          this.form.get('savingThrows')?.patchValue(cm.savingThrows);
        }

        // Patch senses
        if (cm.senses) {
          this.form.get('senses')?.patchValue(cm.senses);
        }

        // Patch damage resistances/immunities/vulnerabilities/conditions
        const patchBoolArray = (controlName: string, labels: readonly string[], value: string) => {
          const selected = (value ?? '').split(',').map((s: string) => s.trim());
          const arr = this.form.get(controlName) as FormArray;
          labels.forEach((label, i) => arr.at(i).setValue(selected.includes(label)));
        };
        patchBoolArray('damageResistances',     DAMAGE_TYPES, cm.damageResistances ?? '');
        patchBoolArray('damageImmunities',      DAMAGE_TYPES, cm.damageImmunities ?? '');
        patchBoolArray('damageVulnerabilities', DAMAGE_TYPES, cm.damageVulnerabilities ?? '');
        patchBoolArray('conditionImmunities',   CONDITIONS,   cm.conditionImmunities ?? '');

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

  /** Collect the selected labels from a boolean FormArray. */
  private selectedLabels(array: FormArray, labels: readonly string[]): string {
    return labels
      .filter((_, i) => array.at(i).value === true)
      .join(', ');
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
      v.senses ?? { darkvision: '', blindsight: '', tremorsense: '', truesight: '', passivePerception: null },
      v.attacks ?? [],
      v.abilities ?? [],
    );

    // Build the complete DTO including combatMechanics
    // Note: authorId is a placeholder — the service will override it with getUserIdFromToken()
    const dto = {
      name: v.name,
      type: v.type,
      size: v.size,
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
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateMonster(this.editId, dto)
      : this.homebrewService.createMonster(dto);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
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
    this.router.navigate(['/homebrew']);
  }
}

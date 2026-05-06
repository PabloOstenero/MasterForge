import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonButton, IonSpinner, IonInput, IonTextarea } from '@ionic/angular/standalone';

import { HomebrewService, CreateSpellDto } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Exported constants (used by template and property-based tests)
// ---------------------------------------------------------------------------

export const SPELL_SCHOOLS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
] as const;

export const SAVING_THROWS = [
  'None',
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
] as const;

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

export const SPELL_CLASSES = [
  'Artificer',
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

// ---------------------------------------------------------------------------
// Exported pure serialization helpers (used by property-based tests)
// ---------------------------------------------------------------------------

/**
 * Serializes the chip multi-select state (boolean array) into a
 * comma-separated string of selected labels.
 *
 * Example: [false, true, false, true] with labels ['Acid','Cold','Fire','Lightning']
 *          → "Cold, Lightning"
 */
export function serializeChips(
  selected: boolean[],
  labels: readonly string[],
): string {
  return labels.filter((_, i) => selected[i]).join(', ');
}

/**
 * Deserializes a comma-separated string into a boolean array aligned to labels.
 *
 * Example: "Cold, Lightning" with labels ['Acid','Cold','Fire','Lightning']
 *          → [false, true, false, true]
 */
export function deserializeChips(
  value: string,
  labels: readonly string[],
): boolean[] {
  const selected = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return labels.map((label) => selected.includes(label));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-homebrew-spell-form',
  templateUrl: './homebrew-spell-form.page.html',
  styleUrls: ['./homebrew-spell-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonSpinner,
    IonInput,
    IonTextarea,
  ],
})
export class HomebrewSpellFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** True when the route contains an :id param (editing an existing spell). */
  editMode = false;
  editId: string | null = null;

  /** Exposed constants for template iteration. */
  readonly spellSchools = SPELL_SCHOOLS;
  readonly savingThrows = SAVING_THROWS;
  readonly damageTypes  = DAMAGE_TYPES;
  readonly spellClasses = SPELL_CLASSES;

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      // Required fields
      name:        ['', Validators.required],
      level:       [null, [Validators.required, Validators.min(0), Validators.max(9)]],
      school:      ['', Validators.required],
      castingTime: ['', Validators.required],
      range:       ['', Validators.required],
      duration:    ['', Validators.required],
      description: ['', Validators.required],

      // Boolean toggles (default false)
      verbal:        [false],
      somatic:       [false],
      material:      [false],
      concentration: [false],
      ritual:        [false],

      // Optional text fields
      materialComponent:      [''],
      savingThrow:            ['None'],
      higherLevelDescription: [''],

      // Chip multi-selects — one boolean entry per label
      damageTypes:  this.fb.array(DAMAGE_TYPES.map(() => false)),
      spellClasses: this.fb.array(SPELL_CLASSES.map(() => false)),
    });

    // When material toggle turns off, clear the materialComponent value
    this.form.get('material')!.valueChanges.subscribe((isMaterial: boolean) => {
      if (!isMaterial) {
        this.form.get('materialComponent')!.setValue('');
      }
    });

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadSpellForEdit(id);
    }
  }

  // ---------------------------------------------------------------------------
  // FormArray getters
  // ---------------------------------------------------------------------------

  get damageTypesArray(): FormArray {
    return this.form.get('damageTypes') as FormArray;
  }

  get spellClassesArray(): FormArray {
    return this.form.get('spellClasses') as FormArray;
  }

  // ---------------------------------------------------------------------------
  // Chip toggle helper
  // ---------------------------------------------------------------------------

  toggleChip(array: FormArray, index: number): void {
    array.at(index).setValue(!array.at(index).value);
  }

  // ---------------------------------------------------------------------------
  // Edit mode loader
  // ---------------------------------------------------------------------------

  private loadSpellForEdit(id: string): void {
    this.homebrewService.getSpell(id).subscribe({
      next: (spell: any) => {
        // Patch all scalar fields
        this.form.patchValue({
          name:                   spell.name ?? '',
          level:                  spell.level ?? null,
          school:                 spell.school ?? '',
          castingTime:            spell.castingTime ?? '',
          range:                  spell.range ?? '',
          duration:               spell.duration ?? '',
          description:            spell.description ?? '',
          verbal:                 spell.verbal ?? false,
          somatic:                spell.somatic ?? false,
          material:               spell.material ?? false,
          materialComponent:      spell.materialComponent ?? '',
          concentration:          spell.concentration ?? false,
          ritual:                 spell.ritual ?? false,
          savingThrow:            spell.savingThrow ?? 'None',
          higherLevelDescription: spell.higherLevelDescription ?? '',
        });

        // Deserialize chip arrays from comma-separated strings
        const dtValues = deserializeChips(spell.damageTypes ?? '', DAMAGE_TYPES);
        dtValues.forEach((val, i) => this.damageTypesArray.at(i).setValue(val));

        const scValues = deserializeChips(spell.spellClasses ?? '', SPELL_CLASSES);
        scValues.forEach((val, i) => this.spellClassesArray.at(i).setValue(val));
      },
      error: () => {
        this.error = 'No se pudo cargar el hechizo para editar.';
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Form actions
  // ---------------------------------------------------------------------------

  submit(): void {
    // Mark all controls as touched so validation errors become visible
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;

    const v = this.form.value;

    // Serialize chip arrays into comma-separated strings
    const damageTypesStr  = serializeChips(this.damageTypesArray.value as boolean[], DAMAGE_TYPES);
    const spellClassesStr = serializeChips(this.spellClassesArray.value as boolean[], SPELL_CLASSES);

    // Build the DTO — authorId is a placeholder; the service overrides it
    const dto: CreateSpellDto = {
      name:                   v.name,
      level:                  v.level,
      school:                 v.school,
      castingTime:            v.castingTime,
      range:                  v.range,
      duration:               v.duration,
      description:            v.description,
      verbal:                 v.verbal ?? false,
      somatic:                v.somatic ?? false,
      material:               v.material ?? false,
      materialComponent:      v.materialComponent ?? '',
      concentration:          v.concentration ?? false,
      ritual:                 v.ritual ?? false,
      damageTypes:            damageTypesStr,
      savingThrow:            v.savingThrow ?? 'None',
      spellClasses:           spellClassesStr,
      higherLevelDescription: v.higherLevelDescription ?? '',
      authorId:               null, // Service will override with getUserIdFromToken()
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateSpell(this.editId, dto)
      : this.homebrewService.createSpell(dto);

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
            ? 'Error al actualizar el hechizo. Por favor, inténtalo de nuevo.'
            : 'Error al crear el hechizo. Por favor, inténtalo de nuevo.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

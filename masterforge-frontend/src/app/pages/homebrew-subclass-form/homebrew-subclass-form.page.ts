import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonButton, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';

import { HomebrewService, CreateSubclassDto } from '../../services/homebrew.service';
import {
  SkillProficiencies,
  Spellcasting,
  CommonHomebrewFeatures,
  SpellSlotTable,
  FeatureEntry,
  SubclassFeatureEntry,
  SubclassFeatures,
  ExpandedSpellEntry,
  ResourcePool
} from '../../models/homebrew.models';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WEAPON_PROFS = ['Simple Weapons', 'Martial Weapons', 'Hand Crossbows', 'Longswords', 'Rapiers', 'Shortswords', 'Light Crossbows', 'Longbows', 'Shortbows'] as const;
export const ARMOR_PROFS = ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'] as const;
export const DAMAGE_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'] as const;
export const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'] as const;
export const SKILL_NAMES = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'] as const;
export const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;
export const SPELLCASTING_ABILITIES = ['Intelligence', 'Wisdom', 'Charisma'] as const;
export const SPELLCASTING_TYPES = ['Full Caster', 'Half Caster', 'Third Caster', 'Pact Magic'] as const;
export const PREPARATION_STYLES = ['PREPARED', 'KNOWN'] as const;
export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;
export const RECHARGE_OPTIONS = ['At Will', 'Short Rest', 'Long Rest'] as const;
export const EXPANDED_SPELL_PREPARATION_TYPES = ['ALWAYS_PREPARED', 'ALWAYS_KNOWN'] as const;

// ---------------------------------------------------------------------------
// Standard D&D 5e spell slot progressions
// Rows = character levels 1–20, columns = spell levels 1st–9th
// ---------------------------------------------------------------------------

// prettier-ignore
const FULL_CASTER_SLOTS: number[][] = [
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],
  [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1],
  [4,3,3,3,3,2,2,1,1],
];

// prettier-ignore
const HALF_CASTER_SLOTS: number[][] = [
  [0,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
];

// prettier-ignore
const THIRD_CASTER_SLOTS: number[][] = [
  [0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
];

// Pact Magic (Warlock): all slots are the same level, count increases
// prettier-ignore
const PACT_MAGIC_SLOTS: number[][] = [
  [1,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [0,2,0,0,0,0,0,0,0],
  [0,2,0,0,0,0,0,0,0],
  [0,0,2,0,0,0,0,0,0],
  [0,0,2,0,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0],
  [0,0,0,0,2,0,0,0,0],
  [0,0,0,0,2,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
];

export const SPELL_SLOT_PRESETS: Record<string, number[][]> = {
  'Full Caster':   FULL_CASTER_SLOTS,
  'Half Caster':   HALF_CASTER_SLOTS,
  'Third Caster':  THIRD_CASTER_SLOTS,
  'Pact Magic':    PACT_MAGIC_SLOTS,
};



// ---------------------------------------------------------------------------
// Pure serialization function
// ---------------------------------------------------------------------------

/**
 * Builds the SubclassFeatures object from individual form values.
 * Exported so it can be tested without mounting the component.
 */
export function buildSubclassFeatures(
  weaponProficiencies: string[],
  armorProficiencies: string[],
  toolProficiencies: string[],
  skillProficiencies: SkillProficiencies,
  damageResistances: string[],
  damageImmunities: string[],
  conditionImmunities: string[],
  features: FeatureEntry[],
  expandedSpellList: ExpandedSpellEntry[],
  resourcePools: ResourcePool[],
  spellcasting: Spellcasting | null,
): SubclassFeatures {
  const result: SubclassFeatures = {
    weaponProficiencies,
    armorProficiencies,
    toolProficiencies,
    skillProficiencies,
    damageResistances,
    damageImmunities,
    conditionImmunities,
    features,
    expandedSpellList,
    resourcePools,
  };

  if (spellcasting) {
    result.spellcasting = spellcasting;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-homebrew-subclass-form',
  templateUrl: './homebrew-subclass-form.page.html',
  styleUrls: ['./homebrew-subclass-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption,
  ],
})
export class HomebrewSubclassFormPage implements OnInit {

  // ---------------------------------------------------------------------------
  // Core state
  // ---------------------------------------------------------------------------

  form!: FormGroup;
  submitting = false;
  error: string | null = null;
  editMode = false;
  editId: string | null = null;
  activeTab = 'identidad';
  slotsCustomized = false;

  // ---------------------------------------------------------------------------
  // Class list state
  // ---------------------------------------------------------------------------

  /** Available DnD Classes for the parent class selector. */
  availableClasses: { id: number; name: string }[] = [];
  loadingClasses = false;
  classesError: string | null = null;

  // ---------------------------------------------------------------------------
  // Spell list state
  // ---------------------------------------------------------------------------

  /** Available Spells for the expanded spell list. */
  availableSpells: { id: string; name: string; level: number }[] = [];
  loadingSpells = false;
  spellsError: string | null = null;


  // ---------------------------------------------------------------------------
  // Chip state arrays
  // ---------------------------------------------------------------------------

  /** One boolean per WEAPON_PROFS entry (9 total). */
  weaponChips: boolean[] = WEAPON_PROFS.map(() => false);
  /** One boolean per ARMOR_PROFS entry (4 total). */
  armorChips: boolean[] = ARMOR_PROFS.map(() => false);

  // ---------------------------------------------------------------------------
  // Custom proficiency lists
  // ---------------------------------------------------------------------------

  customWeaponProfs: string[] = [];
  customArmorProfs: string[] = [];
  customToolProfs: string[] = [];

  // ---------------------------------------------------------------------------
  // Input binding helpers (used by template ngModel inputs)
  // ---------------------------------------------------------------------------

  skillInput = '';
  customWeaponInput = '';
  customArmorInput = '';
  customToolInput = '';

  // ---------------------------------------------------------------------------
  // Spellcasting state
  // ---------------------------------------------------------------------------

  showSpellsKnown = false;

  // ---------------------------------------------------------------------------
  // Readonly arrays for template iteration
  // ---------------------------------------------------------------------------

  readonly weaponProfs = WEAPON_PROFS;
  readonly armorProfs = ARMOR_PROFS;
  readonly damageTypes = DAMAGE_TYPES;
  readonly conditions = CONDITIONS;
  readonly skillNames = SKILL_NAMES;
  readonly abilities = ABILITIES;
  readonly spellcastingAbilities = SPELLCASTING_ABILITIES;
  readonly spellcastingTypes = SPELLCASTING_TYPES;
  readonly preparationStyles = PREPARATION_STYLES;
  readonly dieTypes = DIE_TYPES;
  readonly rechargeOptions = RECHARGE_OPTIONS;
  readonly expandedSpellPrepTypes = EXPANDED_SPELL_PREPARATION_TYPES;
  readonly levelRange = Array.from({ length: 20 }, (_, i) => i + 1);
  readonly spellLevelRange = Array.from({ length: 9 }, (_, i) => i + 1);

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    // Build skills FormGroup — one boolean FormControl per skill name
    const skillsGroup = SKILL_NAMES.reduce((acc, skill) => ({
      ...acc,
      [skill]: this.fb.control(false),
    }), {} as Record<string, any>);

    this.form = this.fb.group({
      // Identity
      name:          ['', Validators.required],
      description:   [''],
      parentClassId: [null, Validators.required],


      // Damage resistances / immunities / condition immunities
      damageResistances:   this.fb.array(Array(DAMAGE_TYPES.length).fill(null).map(() => new FormControl(false))),
      damageImmunities:    this.fb.array(Array(DAMAGE_TYPES.length).fill(null).map(() => new FormControl(false))),
      conditionImmunities: this.fb.array(Array(CONDITIONS.length).fill(null).map(() => new FormControl(false))),

      // Dynamic feature entries
      features:         this.fb.array([]),
      expandedSpellList: this.fb.array([]),
      resourcePools:    this.fb.array([]),

      // Spellcasting
      spellcastingEnabled:  [false],
      spellcastingAbility:  [''],   // validators added dynamically when enabled
      spellcastingType:     [''],   // validators added dynamically when enabled
      ritualCasting:        [false],
      preparationStyle:     ['PREPARED'],
      cantripsKnown: this.fb.array(Array(20).fill(null).map(() => new FormControl(0))),
      spellsKnown:   this.fb.array(Array(20).fill(null).map(() => new FormControl(0))),
      spellSlots:    this.fb.array(
        Array(20).fill(null).map(() =>
          this.fb.array(Array(9).fill(null).map(() => new FormControl(0)))
        )
      ),

      // Skill proficiencies
      skills:           this.fb.group(skillsGroup),
      skillChoiceCount: [0, Validators.min(0)],
    });

    this.loadClasses();
    this.loadSpells();

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadSubclassForEdit(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Class list loading
  // ---------------------------------------------------------------------------

  /** Fetches the list of available DnD Classes to populate the parent class selector. */
  loadClasses(): void {
    this.loadingClasses = true;
    this.classesError = null;
    this.homebrewService.getClasses().subscribe({
      next: (classes: any[]) => {
        this.availableClasses = classes;
        this.loadingClasses = false;
      },
      error: (err: any) => {
        this.loadingClasses = false;
        this.classesError =
          err?.error?.message ??
          err?.message ??
          'Error al cargar las clases. Por favor, recarga la página.';
      },
    });
  }

  /** Fetches the list of available Spells to populate the expanded spell list selector. */
  loadSpells(): void {
    this.loadingSpells = true;
    this.spellsError = null;
    this.homebrewService.getAllSpells().subscribe({
      next: (spells: any[]) => {
        this.availableSpells = spells.sort((a, b) => a.name.localeCompare(b.name));
        this.loadingSpells = false;
      },
      error: (err: any) => {
        this.loadingSpells = false;
        this.spellsError =
          err?.error?.message ?? err?.message ?? 'No se pudieron cargar los conjuros.';
        console.error('Error fetching spells', err);
      },
    });
  }

  spellDropdownOpen: Record<number, boolean> = {};
  spellSearchQueries: Record<number, string> = {};

  toggleSpellDropdown(index: number) {
    this.spellDropdownOpen[index] = !this.spellDropdownOpen[index];
    if (this.spellDropdownOpen[index]) {
      this.spellSearchQueries[index] = '';
    }
  }

  closeSpellDropdown(index: number) {
    this.spellDropdownOpen[index] = false;
  }

  filteredSpells(index: number): any[] {
    const q = (this.spellSearchQueries[index] || '').toLowerCase().trim();
    if (!q) return this.availableSpells.slice(0, 50);
    return this.availableSpells
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 50);
  }

  selectSpell(index: number, spell: { id: string; name: string; level: number }) {
    const group = this.expandedSpellList.at(index) as FormGroup;
    group.patchValue({ 
      name: spell.name,
      level: spell.level
    });
    this.closeSpellDropdown(index);
  }

  // ---------------------------------------------------------------------------
  // FormArray getters
  // ---------------------------------------------------------------------------

  get features(): FormArray {
    return this.form.get('features') as FormArray;
  }

  get expandedSpellList(): FormArray {
    return this.form.get('expandedSpellList') as FormArray;
  }

  get resourcePools(): FormArray {
    return this.form.get('resourcePools') as FormArray;
  }

  get damageResistances(): FormArray {
    return this.form.get('damageResistances') as FormArray;
  }

  get damageImmunities(): FormArray {
    return this.form.get('damageImmunities') as FormArray;
  }

  get conditionImmunities(): FormArray {
    return this.form.get('conditionImmunities') as FormArray;
  }

  get cantripsKnown(): FormArray {
    return this.form.get('cantripsKnown') as FormArray;
  }

  get spellsKnown(): FormArray {
    return this.form.get('spellsKnown') as FormArray;
  }

  get spellSlots(): FormArray {
    return this.form.get('spellSlots') as FormArray;
  }

  get skills(): FormGroup {
    return this.form.get('skills') as FormGroup;
  }

  // ---------------------------------------------------------------------------
  // Edit mode — load and patch
  // ---------------------------------------------------------------------------

  loadSubclassForEdit(id: string): void {
    this.homebrewService.getSubclass(id).subscribe({
      next: (subclass: any) => {
        const pId = subclass.parentClassId ?? subclass.parentClass?.id;
        // Patch basic identity fields
        this.form.patchValue({
          name:          subclass.name          ?? '',
          description:   subclass.description   ?? '',
          parentClassId: pId ? Number(pId) : null,
        });

        const sf: SubclassFeatures = subclass.subclassFeatures ?? {};

        // ---------------------------------------------------------------
        // Weapon chips + custom weapon profs
        // ---------------------------------------------------------------
        const weaponProfsFromApi: string[] = sf.weaponProficiencies ?? [];
        this.weaponChips = WEAPON_PROFS.map(wp => weaponProfsFromApi.includes(wp));
        this.customWeaponProfs = weaponProfsFromApi.filter(
          wp => !(WEAPON_PROFS as readonly string[]).includes(wp)
        );

        // ---------------------------------------------------------------
        // Armor chips + custom armor profs
        // ---------------------------------------------------------------
        const armorProfsFromApi: string[] = sf.armorProficiencies ?? [];
        this.armorChips = ARMOR_PROFS.map(ap => armorProfsFromApi.includes(ap));
        this.customArmorProfs = armorProfsFromApi.filter(
          ap => !(ARMOR_PROFS as readonly string[]).includes(ap)
        );

        // ---------------------------------------------------------------
        // Custom tool profs
        // ---------------------------------------------------------------
        this.customToolProfs = [...(sf.toolProficiencies ?? [])];

        // ---------------------------------------------------------------
        // Skill proficiencies
        // ---------------------------------------------------------------
        (sf.skillProficiencies?.choicePool ?? []).forEach((skill: string) => {
          this.skills.get(skill)?.setValue(true);
        });
        this.form.patchValue({
          skillChoiceCount: sf.skillProficiencies?.choiceCount ?? 0,
        });

        // ---------------------------------------------------------------
        // Damage resistances
        // ---------------------------------------------------------------
        DAMAGE_TYPES.forEach((dt, i) => {
          this.damageResistances.at(i).setValue(
            (sf.damageResistances ?? []).includes(dt)
          );
        });

        // ---------------------------------------------------------------
        // Damage immunities
        // ---------------------------------------------------------------
        DAMAGE_TYPES.forEach((dt, i) => {
          this.damageImmunities.at(i).setValue(
            (sf.damageImmunities ?? []).includes(dt)
          );
        });

        // ---------------------------------------------------------------
        // Condition immunities
        // ---------------------------------------------------------------
        CONDITIONS.forEach((cond, i) => {
          this.conditionImmunities.at(i).setValue(
            (sf.conditionImmunities ?? []).includes(cond)
          );
        });

        // ---------------------------------------------------------------
        // Features FormArray
        // ---------------------------------------------------------------
        this.features.clear();
        (sf.features ?? sf.subclassFeatureEntries ?? []).forEach((entry: FeatureEntry) => {
          this.features.push(this.fb.group({
            name:          [entry.name,          Validators.required],
            description:   [entry.description,   Validators.required],
            levelRequired: [entry.levelRequired,  [Validators.required, Validators.min(1), Validators.max(20)]],
          }));
        });

        // ---------------------------------------------------------------
        // Expanded spell list FormArray
        // ---------------------------------------------------------------
        this.expandedSpellList.clear();
        (sf.expandedSpellList ?? []).forEach((entry: ExpandedSpellEntry) => {
          this.expandedSpellList.push(this.fb.group({
            name:            [entry.name,            Validators.required],
            level:           [entry.level,           [Validators.required, Validators.min(0), Validators.max(9)]],
            preparationType: [entry.preparationType, Validators.required],
          }));
        });

        // ---------------------------------------------------------------
        // Resource pools FormArray
        // ---------------------------------------------------------------
        this.resourcePools.clear();
        (sf.resourcePools ?? []).forEach((pool: ResourcePool) => {
          this.resourcePools.push(this.fb.group({
            name:       [pool.name,       Validators.required],
            dieType:    [pool.dieType,    Validators.required],
            count:      [pool.count,      [Validators.required, Validators.min(1)]],
            rechargeOn: [pool.rechargeOn, Validators.required],
          }));
        });

        // ---------------------------------------------------------------
        // Spellcasting config
        // ---------------------------------------------------------------
        if (sf.spellcasting) {
          const sc = sf.spellcasting;

          // Enable spellcasting and add validators
          this.form.patchValue({ spellcastingEnabled: true });
          this.toggleSpellcasting();

          // Patch scalar spellcasting fields
          this.form.patchValue({
            spellcastingAbility: sc.ability           ?? '',
            spellcastingType:    sc.spellcastingType  ?? '',
            ritualCasting:       sc.ritualCasting     ?? false,
            preparationStyle:    sc.preparationStyle  ?? 'PREPARED',
          });

          // Restore cantripsKnown (20-element array)
          if (sc.cantripsKnown?.length) {
            sc.cantripsKnown.forEach((val: number, i: number) => {
              this.cantripsKnown.at(i)?.setValue(val ?? 0);
            });
          }

          // Restore spellSlots (20×9 matrix)
          if (sc.spellSlots?.slots?.length) {
            sc.spellSlots.slots.forEach((row: number[], levelIdx: number) => {
              const rowArray = this.spellSlots.at(levelIdx) as FormArray;
              row.forEach((val: number, slotIdx: number) => {
                rowArray.at(slotIdx)?.setValue(val ?? 0);
              });
            });
          }

          // Restore spellsKnown if preparationStyle is KNOWN
          if (sc.preparationStyle === 'KNOWN') {
            this.showSpellsKnown = true;
            if (sc.spellsKnown?.length) {
              sc.spellsKnown.forEach((val: number, i: number) => {
                this.spellsKnown.at(i)?.setValue(val ?? 0);
              });
            }
          }
        }
      },
      error: () => {
        this.error = 'No se pudo cargar la subclase para editar.';
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Spellcasting toggle
  // ---------------------------------------------------------------------------

  toggleSpellcasting(): void {
    const enabled = this.form.get('spellcastingEnabled')?.value as boolean;
    const abilityCtrl = this.form.get('spellcastingAbility');
    const typeCtrl    = this.form.get('spellcastingType');
    if (enabled) {
      abilityCtrl?.setValidators(Validators.required);
      typeCtrl?.setValidators(Validators.required);
    } else {
      abilityCtrl?.clearValidators();
      abilityCtrl?.reset('');
      typeCtrl?.clearValidators();
      typeCtrl?.reset('');
    }
    abilityCtrl?.updateValueAndValidity();
    typeCtrl?.updateValueAndValidity();
  }

  onSpellcastingTypeChange(): void {
    const type = this.form.get('spellcastingType')?.value as string;
    const preset = SPELL_SLOT_PRESETS[type];
    if (!preset) return;

    // Patch spell slots FormArray with preset values
    preset.forEach((row, levelIdx) => {
      const rowArray = this.spellSlots.at(levelIdx) as FormArray;
      row.forEach((val, slotIdx) => {
        rowArray.at(slotIdx).setValue(val === 0 ? null : val);
      });
    });

    // Reset customized flag — slots now match the preset
    this.slotsCustomized = false;
  }

  onPreparationStyleChange(): void {
    const style = this.form.get('preparationStyle')?.value;
    this.showSpellsKnown = style === 'KNOWN';
  }

  /** Called when a spell slot cell is manually edited; marks the table as customized. */
  onSpellSlotInput(): void {
    this.slotsCustomized = true;
  }

  // ---------------------------------------------------------------------------
  // Feature FormArray helpers
  // ---------------------------------------------------------------------------

  addFeature(): void {
    this.features.push(this.fb.group({
      name:          ['', Validators.required],
      description:   ['', Validators.required],
      levelRequired: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    }));
  }

  removeFeature(index: number): void {
    this.features.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Expanded spell list FormArray helpers
  // ---------------------------------------------------------------------------

  addExpandedSpell(): void {
    this.expandedSpellList.push(this.fb.group({
      name:            ['', Validators.required],
      level:           [1, [Validators.required, Validators.min(0), Validators.max(9)]],
      preparationType: ['ALWAYS_PREPARED', Validators.required],
    }));
  }

  removeExpandedSpell(index: number): void {
    this.expandedSpellList.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Resource pool FormArray helpers
  // ---------------------------------------------------------------------------

  addResourcePool(): void {
    this.resourcePools.push(this.fb.group({
      name:       ['', Validators.required],
      dieType:    ['d6', Validators.required],
      count:      [1, [Validators.required, Validators.min(1)]],
      rechargeOn: ['Short Rest', Validators.required],
    }));
  }

  removeResourcePool(index: number): void {
    this.resourcePools.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Chip toggle helpers
  // ---------------------------------------------------------------------------

  toggleWeaponChip(index: number): void {
    this.weaponChips[index] = !this.weaponChips[index];
  }

  toggleArmorChip(index: number): void {
    this.armorChips[index] = !this.armorChips[index];
  }

  toggleDamageResistanceChip(index: number): void {
    const arr = this.damageResistances;
    arr.at(index).setValue(!arr.at(index).value);
  }

  toggleDamageImmunityChip(index: number): void {
    const arr = this.damageImmunities;
    arr.at(index).setValue(!arr.at(index).value);
  }

  toggleConditionImmunityChip(index: number): void {
    const arr = this.conditionImmunities;
    arr.at(index).setValue(!arr.at(index).value);
  }

  // ---------------------------------------------------------------------------
  // Custom proficiency helpers
  // ---------------------------------------------------------------------------

  addCustomWeaponProf(): void {
    const val = this.customWeaponInput.trim();
    if (val) {
      this.customWeaponProfs = [...this.customWeaponProfs, val];
      this.customWeaponInput = '';
    }
  }

  addCustomArmorProf(): void {
    const val = this.customArmorInput.trim();
    if (val) {
      this.customArmorProfs = [...this.customArmorProfs, val];
      this.customArmorInput = '';
    }
  }

  addCustomToolProf(): void {
    const val = this.customToolInput.trim();
    if (val) {
      this.customToolProfs = [...this.customToolProfs, val];
      this.customToolInput = '';
    }
  }

  removeCustomWeaponProf(index: number): void {
    this.customWeaponProfs = this.customWeaponProfs.filter((_, i) => i !== index);
  }

  removeCustomArmorProf(index: number): void {
    this.customArmorProfs = this.customArmorProfs.filter((_, i) => i !== index);
  }

  removeCustomToolProf(index: number): void {
    this.customToolProfs = this.customToolProfs.filter((_, i) => i !== index);
  }

  // ---------------------------------------------------------------------------
  // Skill proficiency helpers
  // ---------------------------------------------------------------------------

  addSkill(): void {
    if (this.skillInput) {
      this.skills.get(this.skillInput)?.setValue(true);
    }
  }

  removeSkill(skillName: string): void {
    this.skills.get(skillName)?.setValue(false);
  }

  getSelectedSkills(): string[] {
    return SKILL_NAMES.filter(skill => this.skills.get(skill)?.value === true);
  }

  // ---------------------------------------------------------------------------
  // Tab error detection
  // ---------------------------------------------------------------------------

  /**
   * Returns true when any form control belonging to the given tab is both
   * invalid and touched, so the tab bar can show a red error dot.
   */
  tabHasError(tab: string): boolean {
    const f = this.form;
    if (!f) return false;

    const isInvalidTouched = (controlName: string): boolean => {
      const ctrl = f.get(controlName);
      return !!ctrl && ctrl.invalid && ctrl.touched;
    };

    const formArrayHasError = (arrayName: string): boolean => {
      const arr = f.get(arrayName) as FormArray | null;
      if (!arr) return false;
      return arr.controls.some(group => {
        if (group instanceof FormGroup) {
          return Object.values(group.controls).some(c => c.invalid && c.touched);
        }
        return group.invalid && group.touched;
      });
    };

    switch (tab) {
      case 'identidad':
        return (
          isInvalidTouched('name') ||
          isInvalidTouched('parentClassId')
        );

      case 'competencias':
        // No required controls in this tab — chip/custom arrays are optional
        return false;

      case 'defensas':
        // Chip-only tab — no required controls
        return false;

      case 'rasgos':
        return formArrayHasError('features');

      case 'conjuros':
        return (
          isInvalidTouched('spellcastingAbility') ||
          isInvalidTouched('spellcastingType')
        );

      case 'recursos':
        return (
          formArrayHasError('expandedSpellList') ||
          formArrayHasError('resourcePools')
        );

      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Submit and cancel
  // ---------------------------------------------------------------------------

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    // ---- Serialize weapon proficiencies ----
    const weaponProficiencies: string[] = [
      ...WEAPON_PROFS.filter((_, i) => this.weaponChips[i]),
      ...this.customWeaponProfs
    ];

    // ---- Serialize armor proficiencies ----
    const armorProficiencies: string[] = [
      ...ARMOR_PROFS.filter((_, i) => this.armorChips[i]),
      ...this.customArmorProfs
    ];

    // ---- Serialize tool proficiencies ----
    const toolProficiencies = this.customToolProfs;

    // ---- Serialize skill proficiencies ----
    const skillProficiencies: SkillProficiencies = {
      fixed: [],
      choicePool: this.getSelectedSkills(),
      choiceCount: this.form.get('skillChoiceCount')?.value ?? 0,
    };

    // ---- Serialize damage resistances ----
    const damageResistances = DAMAGE_TYPES.filter((_, i) => this.damageResistances.at(i).value);

    // ---- Serialize damage immunities ----
    const damageImmunities = DAMAGE_TYPES.filter((_, i) => this.damageImmunities.at(i).value);

    // ---- Serialize condition immunities ----
    const conditionImmunities = CONDITIONS.filter((_, i) => this.conditionImmunities.at(i).value);

    // ---- Serialize subclass feature entries ----
    const subclassFeatureEntries: SubclassFeatureEntry[] = this.features.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      return {
        name: g.get('name')?.value,
        description: g.get('description')?.value,
        levelRequired: g.get('levelRequired')?.value,
      };
    });

    // ---- Serialize expanded spell list ----
    const expandedSpellListEntries: ExpandedSpellEntry[] = this.expandedSpellList.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      return {
        name: g.get('name')?.value,
        level: g.get('level')?.value,
        preparationType: g.get('preparationType')?.value,
      };
    });

    // ---- Serialize resource pools ----
    const resourcePoolEntries: ResourcePool[] = this.resourcePools.controls.map(ctrl => {
      const g = ctrl as FormGroup;
      return {
        name: g.get('name')?.value,
        dieType: g.get('dieType')?.value,
        count: g.get('count')?.value,
        rechargeOn: g.get('rechargeOn')?.value,
      };
    });

    // ---- Serialize spellcasting ----
    const spellcastingEnabled = this.form.get('spellcastingEnabled')?.value as boolean;
    let spellcasting: Spellcasting | null = null;

    if (spellcastingEnabled) {
      const preparationStyle = this.form.get('preparationStyle')?.value as 'PREPARED' | 'KNOWN';
      spellcasting = {
        ability: this.form.get('spellcastingAbility')?.value,
        spellcastingType: this.form.get('spellcastingType')?.value,
        ritualCasting: this.form.get('ritualCasting')?.value ?? false,
        preparationStyle,
        cantripsKnown: this.cantripsKnown.value,
        spellSlots: {
          slots: this.spellSlots.controls.map(row => (row as FormArray).value),
        },
        ...(preparationStyle === 'KNOWN' ? { spellsKnown: this.spellsKnown.value } : {}),
      };
    }

    // ---- Build SubclassFeatures ----
    const subclassFeatures = buildSubclassFeatures(
      weaponProficiencies,
      armorProficiencies,
      toolProficiencies,
      skillProficiencies,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      subclassFeatureEntries,
      expandedSpellListEntries,
      resourcePoolEntries,
      spellcasting,
    );

    // ---- Build DTO ----
    const dto = {
      name: this.form.get('name')?.value,
      description: this.form.get('description')?.value ?? '',
      parentClassId: this.form.get('parentClassId')?.value,
      subclassFeatures,
    };

    // ---- Submit ----
    this.submitting = true;
    this.error = null;

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateSubclass(this.editId, dto as any)
      : this.homebrewService.createSubclass(dto as any);

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
          'Error al guardar la subclase.';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

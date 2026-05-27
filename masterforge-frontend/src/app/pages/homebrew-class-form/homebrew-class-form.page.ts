import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonButton, IonSpinner, IonItem, IonLabel, IonInput, IonTextarea, IonIcon, IonCheckbox, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flash, shield, hammer, moon, add, trash, hammerOutline,
  sparkles, list, trendingUp, shieldOutline, listOutline,
  sparklesOutline, trendingUpOutline,
  addOutline, trashOutline, flashOutline,
  flashOffOutline
} from 'ionicons/icons';
import { trigger, transition, style, animate } from '@angular/animations';

import { HomebrewService, CreateClassDto } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import {
  SkillProficiencies,
  Spellcasting,
  CommonHomebrewFeatures,
  SpellSlotTable,
  ClassFeatures,
  FeatureEntry,
  FeatureOptionPool,
  MulticlassingPrerequisite,
  MulticlassingPrerequisites,
  MulticlassingProficiencies,
  SKILL_DATA
} from '../../models/homebrew.models';
import { StructuredEquipment, serializeEquipment, isStructuredEquipment } from '../../models/equipment.models';
import { StartingEquipmentPickerComponent } from '../../components/starting-equipment-picker/starting-equipment-picker.component';
import { FeatureMechanicsComponent } from '../../components/feature-mechanics/feature-mechanics.component';
import { FeatureChoiceEditorComponent } from '../../components/feature-choice-editor/feature-choice-editor.component';
import { FeatureEffectEditorComponent } from '../../components/feature-effect-editor/feature-effect-editor.component';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SAVING_THROWS = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;
export const HIT_DICE = ['d6', 'd8', 'd10', 'd12'] as const;
export const SKILL_NAMES = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'] as const;
export const WEAPON_PROFS = ['Simple Weapons', 'Martial Weapons', 'Hand Crossbows', 'Longswords', 'Rapiers', 'Shortswords', 'Light Crossbows', 'Longbows', 'Shortbows'] as const;
export const ARMOR_PROFS = ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'] as const;
export const DAMAGE_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'] as const;
export const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'] as const;
export const ABILITIES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'] as const;
export const SPELLCASTING_ABILITIES = ['Intelligence', 'Wisdom', 'Charisma'] as const;
export const SPELLCASTING_TYPES = ['Full Caster', 'Half Caster', 'Third Caster', 'Pact Magic'] as const;
export const PREPARATION_STYLES = ['PREPARED', 'KNOWN'] as const;
export const KNOWLEDGE_STYLES = ['ALL_LIST', 'LEARNED'] as const;

export const ABILITY_ABBREVIATIONS: Record<string, string> = {
  'Strength': 'FU',
  'Dexterity': 'DES',
  'Constitution': 'CON',
  'Intelligence': 'INT',
  'Wisdom': 'SAB',
  'Charisma': 'CAR'
};

// ---------------------------------------------------------------------------
// Standard D&D 5e spell slot progressions
// Rows = character levels 1–20, columns = spell levels 1st–9th
// ---------------------------------------------------------------------------

// prettier-ignore
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// prettier-ignore
const HALF_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

// prettier-ignore
const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
];

// Pact Magic (Warlock): all slots are the same level, count increases
// prettier-ignore
const PACT_MAGIC_SLOTS: number[][] = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 0, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 4, 0, 0, 0, 0],
];

export const SPELL_SLOT_PRESETS: Record<string, number[][]> = {
  'Full Caster': FULL_CASTER_SLOTS,
  'Half Caster': HALF_CASTER_SLOTS,
  'Third Caster': THIRD_CASTER_SLOTS,
  'Pact Magic': PACT_MAGIC_SLOTS,
};

// prettier-ignore
const FULL_CASTER_KNOWN: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
// prettier-ignore
const FULL_CASTER_CANTRIPS: number[] = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

// prettier-ignore
const HALF_CASTER_KNOWN: number[] = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];
// prettier-ignore
const HALF_CASTER_CANTRIPS: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// prettier-ignore
const THIRD_CASTER_KNOWN: number[] = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
// prettier-ignore
const THIRD_CASTER_CANTRIPS: number[] = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];

// prettier-ignore
const PACT_MAGIC_KNOWN: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
// prettier-ignore
const PACT_MAGIC_CANTRIPS: number[] = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

export const SPELLS_KNOWN_PRESETS: Record<string, number[]> = {
  'Full Caster': FULL_CASTER_KNOWN,
  'Half Caster': HALF_CASTER_KNOWN,
  'Third Caster': THIRD_CASTER_KNOWN,
  'Pact Magic': PACT_MAGIC_KNOWN,
};

export const CANTRIPS_KNOWN_PRESETS: Record<string, number[]> = {
  'Full Caster': FULL_CASTER_CANTRIPS,
  'Half Caster': HALF_CASTER_CANTRIPS,
  'Third Caster': THIRD_CASTER_CANTRIPS,
  'Pact Magic': PACT_MAGIC_CANTRIPS,
};

// ---------------------------------------------------------------------------
// Custom validator
// ---------------------------------------------------------------------------

/**
 * Validator that requires at least one checkbox in a FormGroup to be true.
 */
export function atLeastOneSelectedValidator(group: AbstractControl): ValidationErrors | null {
  const controls = (group as FormGroup).controls;
  const hasAtLeastOne = Object.values(controls).some(control => control.value === true);
  return hasAtLeastOne ? null : { atLeastOneRequired: true };
}

// ---------------------------------------------------------------------------
// Pure serialization functions
// ---------------------------------------------------------------------------

/**
 * Builds the ClassFeatures object from individual form values.
 * Exported so it can be tested without mounting the component.
 */
export function buildClassFeatures(
  primaryAbility: string,
  subclassLevel: number,
  startingEquipment: string,
  skillProficiencies: SkillProficiencies,
  weaponProficiencies: string[],
  armorProficiencies: string[],
  toolProficiencies: string[],
  multiclassingPrerequisites: MulticlassingPrerequisites | null,
  multiclassingProficiencies: MulticlassingProficiencies | null,
  spellcasting: Spellcasting | null,
  damageResistances: string[],
  damageImmunities: string[],
  conditionImmunities: string[],
  asiLevels: number[] = [4, 8, 12, 16, 19],
): ClassFeatures {
  const result: ClassFeatures = {
    primaryAbility,
    subclassLevel,
    skillProficiencies,
    weaponProficiencies,
    armorProficiencies,
    toolProficiencies,
    damageResistances,
    damageImmunities,
    conditionImmunities,
    asiLevels,
  };

  if (startingEquipment && startingEquipment.trim() !== '') {
    result.startingEquipment = startingEquipment.trim();
  }

  if (multiclassingPrerequisites && multiclassingPrerequisites.requirements.length > 0) {
    result.multiclassingPrerequisites = multiclassingPrerequisites;
  }

  if (multiclassingProficiencies && (
    multiclassingProficiencies.armor.length > 0 ||
    multiclassingProficiencies.weapons.length > 0 ||
    multiclassingProficiencies.tools.length > 0
  )) {
    result.multiclassingProficiencies = multiclassingProficiencies;
  }

  if (spellcasting) {
    result.spellcasting = spellcasting;
  }

  return result;
}

/**
 * Parses a 2D array of spell slots into a SpellSlotTable object.
 */
export function parseSpellSlotTable(slots: number[][]): SpellSlotTable {
  return { slots };
}

/**
 * Serializes a SpellSlotTable object into a 2D array.
 */
export function serializeSpellSlotTable(table: SpellSlotTable): number[][] {
  return table.slots;
}

@Component({
  selector: 'app-homebrew-class-form',
  templateUrl: './homebrew-class-form.page.html',
  styleUrls: ['./homebrew-class-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton, IonSpinner, IonItem, IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon, IonCheckbox,
    StartingEquipmentPickerComponent,
    FeatureChoiceEditorComponent,
    FeatureEffectEditorComponent,
    FeatureMechanicsComponent
  ],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ])
  ]
})
export class HomebrewClassFormPage implements OnInit {

  // ---------------------------------------------------------------------------
  // Core state
  // ---------------------------------------------------------------------------

  form!: FormGroup;
  submitting = false;
  error: string | null = null;
  editMode = false;
  editId: string | null = null;
  originalFeatures: { id: number; name: string; description: string; levelRequired: number; options?: any; properties?: any }[] = [];
  featureActiveSection: Record<number, string> = {};

  @ViewChild('equipmentPicker') equipmentPicker?: StartingEquipmentPickerComponent;

  currentEquipment: StructuredEquipment | null = null;
  isPickerValid = true;
  equipmentInitialValue: StructuredEquipment | null = null;
  equipmentLegacyText: string | null = null;

  // ---------------------------------------------------------------------------
  // Tab navigation
  // ---------------------------------------------------------------------------

  currentTab: 'identidad' | 'competencias' | 'defensas' | 'equipamiento' | 'rasgos' | 'multiclase' | 'conjuros' = 'identidad';

  setTab(tab: typeof this.currentTab): void {
    this.currentTab = tab;
  }

  get tabHasError(): Record<string, boolean> {
    const f = this.form;
    return {
      identidad: !!(
        f.get('name')?.invalid ||
        f.get('hitDie')?.invalid ||
        f.get('primaryAbility')?.invalid ||
        f.get('subclassLevel')?.invalid
      ),
      competencias: !!(f.get('savingThrows')?.invalid),
      defensas: false,
      equipamiento: !this.isPickerValid,
      rasgos: !!(this.features.controls.some(c => c.invalid)),
      multiclase: !!(this.multiclassingPrerequisites.controls.some(c => c.invalid)),
      conjuros: !!(
        f.get('spellcastingAbility')?.invalid ||
        f.get('spellcastingType')?.invalid
      ),
    };
  }

  // ---------------------------------------------------------------------------
  // Starting equipment picker event handlers
  // ---------------------------------------------------------------------------

  onEquipmentChange(equipment: StructuredEquipment | null): void {
    this.currentEquipment = equipment;
  }

  onPickerValidityChange(valid: boolean): void {
    this.isPickerValid = valid;
  }

  skillData = SKILL_DATA;
  abilityAbbr = ABILITY_ABBREVIATIONS;

  getSkillAbility(skill: string): string {
    return this.skillData[skill] || '';
  }

  getSkillAbbr(skill: string): string {
    const ability = this.getSkillAbility(skill);
    return this.abilityAbbr[ability] || '';
  }

  // ---------------------------------------------------------------------------
  // Chip state arrays
  // ---------------------------------------------------------------------------

  savingThrowChips: boolean[] = SAVING_THROWS.map(() => false);
  weaponChips: boolean[] = WEAPON_PROFS.map(() => false);
  armorChips: boolean[] = ARMOR_PROFS.map(() => false);
  multiclassingArmorChips: boolean[] = ARMOR_PROFS.map(() => false);
  multiclassingWeaponChips: boolean[] = WEAPON_PROFS.map(() => false);

  // ---------------------------------------------------------------------------
  // Custom proficiency lists
  // ---------------------------------------------------------------------------

  customWeaponProfs: string[] = [];
  customArmorProfs: string[] = [];
  customToolProfs: string[] = [];
  customMulticlassingToolGrants: string[] = [];
  pendingWeaponProf = '';
  pendingArmorProf = '';
  pendingToolProf = '';
  pendingMulticlassingToolGrant = '';

  // ---------------------------------------------------------------------------
  // Skill picker state
  // ---------------------------------------------------------------------------

  pendingSkillName = '';
  skillDropdownOpen = false;

  // ---------------------------------------------------------------------------
  // Spellcasting state
  // ---------------------------------------------------------------------------

  spellcastingEnabled = false;
  showSpellsKnown = false;
  showSpellcastingPanel = false;
  spellSlotsCustomized = false;

  // ---------------------------------------------------------------------------
  // Readonly arrays for template iteration
  // ---------------------------------------------------------------------------

  readonly savingThrows = SAVING_THROWS;
  readonly hitDice = HIT_DICE;
  readonly skillNames = SKILL_NAMES;
  readonly weaponProfs = WEAPON_PROFS;
  readonly armorProfs = ARMOR_PROFS;
  readonly damageTypes = DAMAGE_TYPES;
  readonly conditions = CONDITIONS;
  readonly abilities = ABILITIES;
  readonly spellcastingAbilities = SPELLCASTING_ABILITIES;
  readonly spellcastingTypes = SPELLCASTING_TYPES;
  readonly preparationStyles = PREPARATION_STYLES;
  readonly knowledgeStyles = KNOWLEDGE_STYLES;
  readonly levelRange = Array.from({ length: 20 }, (_, i) => i + 1);
  readonly spellLevelRange = Array.from({ length: 9 }, (_, i) => i + 1);


  get isManagerOrAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'MANAGER' || user?.role === 'ADMIN';
  }

  get isPro(): boolean {
    return this.authService.isPro();
  }

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {
    addIcons({ 
      flash, shield, hammer, moon, add, trash, hammerOutline, sparkles, list, trendingUp, 
      shieldOutline, sparklesOutline, trendingUpOutline, addOutline, listOutline, 
      trashOutline, flashOutline 
    });
  }
  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    // Build savingThrows FormGroup — one boolean per SAVING_THROWS entry
    const savingThrowsGroup = this.fb.group(
      SAVING_THROWS.reduce((acc, key) => ({ ...acc, [key]: [false] }), {} as Record<string, any>),
      { validators: atLeastOneSelectedValidator },
    );

    // Build skills FormGroup — one entry per SKILL_NAMES
    const skillsGroup = SKILL_NAMES.reduce((acc, skill) => ({
      ...acc,
      [skill]: this.fb.group({ selected: [false] }),
    }), {} as Record<string, any>);

    this.form = this.fb.group({
      // Identity
      name: ['', Validators.required],
      description: [''],
      price: [null, Validators.min(0)],
      hitDie: ['', Validators.required],
      isOfficial: [this.route.snapshot.queryParamMap?.get('from') === 'official'],

      // Saving throws
      savingThrows: savingThrowsGroup,

      // Primary ability and subclass level
      primaryAbility: ['', Validators.required],
      subclassLevel: [3, [Validators.required, Validators.min(1), Validators.max(20)]],

      // Skill proficiencies
      skills: this.fb.group(skillsGroup),
      skillChoiceCount: [null, Validators.min(0)],

      // Multiclassing prerequisites
      multiclassingPrerequisites: this.fb.array([]),
      multiclassingLogic: ['AND'],

      // Multiclassing proficiency grants
      multiclassingArmorGrants: this.fb.array(ARMOR_PROFS.map(() => false)),
      multiclassingWeaponGrants: this.fb.array(WEAPON_PROFS.map(() => false)),
      multiclassingToolGrants: this.fb.array([]),

      // Damage resistances / immunities / condition immunities
      damageResistances: this.fb.array(DAMAGE_TYPES.map(() => false)),
      damageImmunities: this.fb.array(DAMAGE_TYPES.map(() => false)),
      conditionImmunities: this.fb.array(CONDITIONS.map(() => false)),

      // Class features
      features: this.fb.array([]),
      asiLevels: [[4, 8, 12, 16, 19]],

      // Spellcasting
      spellcastingEnabled: [false],
      spellcastingAbility: [''],
      spellcastingType: [''],
      spellcastingRecharge: ['LONG_REST'],
      ritualCasting: [false],
      preparationStyle: ['PREPARED'],
      knowledgeStyle: ['ALL_LIST'],
      cantripsKnown: this.fb.array(Array(20).fill(null).map(() => new FormControl(null))),
      spellsKnown: this.fb.array(Array(20).fill(null).map(() => new FormControl(null))),
      spellSlots: this.fb.array(
        Array(20).fill(null).map(() =>
          this.fb.array(Array(9).fill(null).map(() => new FormControl(null)))
        )
      ),
    });

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadClassForEdit(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit mode — load and patch
  // ---------------------------------------------------------------------------

  loadClassForEdit(id: string): void {
    this.homebrewService.getClass(id).subscribe({
      next: (cls: any) => {
        const cf = cls.classFeatures ?? {};

        // Patch basic fields — hitDie comes back as a number (e.g. 8), convert to string ("d8")
        const hitDieStr = cls.hitDie ? `d${cls.hitDie}` : '';
        this.form.patchValue({
          name: cls.name ?? '',
          description: cls.description ?? '',
          price: cls.price ?? null,
          hitDie: hitDieStr,
          isOfficial: cls.author === null || !cls.author,
        });

        // Patch saving throws — also sync the chip state array
        if (cls.savingThrows) {
          SAVING_THROWS.forEach((st, i) => {
            const ctrl = (this.form.get('savingThrows') as FormGroup).get(st);
            if (ctrl) {
              const val = cls.savingThrows[st] === true;
              ctrl.setValue(val);
              this.savingThrowChips[i] = val;
            }
          });
        }

        // Patch primaryAbility, subclassLevel, and asiLevels
        this.form.patchValue({
          primaryAbility: cf.primaryAbility ?? '',
          subclassLevel: cf.subclassLevel ?? 3,
          asiLevels: cf.asiLevels ?? [4, 8, 12, 16, 19],
        });

        // Detect legacy vs structured equipment and pass to picker
        const rawEquipment = cf.startingEquipment;
        let parsedEquipment: any = rawEquipment;
        if (typeof rawEquipment === 'string' && rawEquipment.trim() !== '') {
          try {
            parsedEquipment = JSON.parse(rawEquipment);
            if (isStructuredEquipment(parsedEquipment)) {
              this.equipmentInitialValue = parsedEquipment;
              this.currentEquipment = parsedEquipment;
              this.equipmentLegacyText = null;
            } else {
              this.equipmentLegacyText = rawEquipment;
              this.equipmentInitialValue = null;
              this.currentEquipment = null;
            }
          } catch {
            this.equipmentLegacyText = rawEquipment;
            this.equipmentInitialValue = null;
            this.currentEquipment = null;
          }
        } else if (typeof rawEquipment === 'object' && rawEquipment !== null) {
          if (isStructuredEquipment(rawEquipment)) {
            this.equipmentInitialValue = rawEquipment;
            this.currentEquipment = rawEquipment;
            this.equipmentLegacyText = null;
          }
        }

        // Restore weapon chips and custom weapon profs
        if (Array.isArray(cf.weaponProficiencies)) {
          const wpArr: string[] = cf.weaponProficiencies;
          WEAPON_PROFS.forEach((wp, i) => {
            this.weaponChips[i] = wpArr.includes(wp);
          });
          this.customWeaponProfs = wpArr.filter((w: string) => !(WEAPON_PROFS as readonly string[]).includes(w));
        }

        // Restore armor chips and custom armor profs
        if (Array.isArray(cf.armorProficiencies)) {
          const apArr: string[] = cf.armorProficiencies;
          ARMOR_PROFS.forEach((ap, i) => {
            this.armorChips[i] = apArr.includes(ap);
          });
          this.customArmorProfs = apArr.filter((a: string) => !(ARMOR_PROFS as readonly string[]).includes(a));
        }

        // Restore custom tool profs
        if (Array.isArray(cf.toolProficiencies)) {
          this.customToolProfs = [...cf.toolProficiencies];
        }

        // Restore damage resistances / immunities / condition immunities
        const toArray = (value: string | string[] | undefined): string[] => {
          if (!value) return [];
          if (Array.isArray(value)) return value;
          return value.split(',').map((s: string) => s.trim()).filter(Boolean);
        };
        const patchBoolArray = (controlName: string, labels: readonly string[], value: string | string[] | undefined) => {
          const selected = toArray(value);
          const arr = this.form.get(controlName) as FormArray;
          labels.forEach((label, i) => arr.at(i).setValue(selected.includes(label)));
        };
        patchBoolArray('damageResistances', DAMAGE_TYPES, cf.damageResistances);
        patchBoolArray('damageImmunities', DAMAGE_TYPES, cf.damageImmunities);
        patchBoolArray('conditionImmunities', CONDITIONS, cf.conditionImmunities);

        // Restore skill proficiencies
        const sp = cf.skillProficiencies;
        if (sp) {
          const allSkills: string[] = [
            ...(sp.fixed ?? []),
            ...(sp.choicePool ?? []),
          ];
          allSkills.forEach((skillName: string) => {
            const skillGroup = (this.skills.get(skillName) as FormGroup);
            if (skillGroup) {
              skillGroup.patchValue({ selected: true });
            }
          });
          this.form.patchValue({ skillChoiceCount: sp.choiceCount ?? null });
        }

        // Restore multiclassing prerequisites
        if (cf.multiclassingPrerequisites) {
          const prereqs = cf.multiclassingPrerequisites;
          this.form.patchValue({ multiclassingLogic: prereqs.logic ?? 'AND' });
          if (Array.isArray(prereqs.requirements)) {
            prereqs.requirements.forEach((req: any) => {
              this.multiclassingPrerequisites.push(this.fb.group({
                ability: [req.ability ?? '', Validators.required],
                minScore: [req.minScore ?? null, [Validators.required, Validators.min(1), Validators.max(20)]],
              }));
            });
          }
        }

        // Restore multiclassing proficiency grants
        if (cf.multiclassingProficiencies) {
          const mp = cf.multiclassingProficiencies;
          if (Array.isArray(mp.armor)) {
            ARMOR_PROFS.forEach((ap, i) => {
              this.multiclassingArmorChips[i] = mp.armor.includes(ap);
              this.multiclassingArmorGrants.at(i).setValue(mp.armor.includes(ap));
            });
          }
          if (Array.isArray(mp.weapons)) {
            WEAPON_PROFS.forEach((wp, i) => {
              this.multiclassingWeaponChips[i] = mp.weapons.includes(wp);
              this.multiclassingWeaponGrants.at(i).setValue(mp.weapons.includes(wp));
            });
          }
          if (Array.isArray(mp.tools)) {
            this.customMulticlassingToolGrants = [...mp.tools];
          }
        }

        // Rebuild features FormArray
        if (Array.isArray(cls.features)) {
          cls.features.forEach((f: any) => {
            const optionsGroup = this.fb.group({
              type: [f.options?.type ?? 'SELECT_ONE'],
              count: [f.options?.count ?? 1, [Validators.required, Validators.min(1)]],
              choices: this.fb.array((f.options?.choices ?? []).map((c: any) => this.fb.group({
                id: [c.id],
                label: [c.label || c.name, Validators.required],
                description: [c.description, Validators.required],
                effects: this.fb.array((c.effects ?? []).map((e: any) => this.fb.group(e))),
                properties: this.fb.group({
                  statModifiers: this.fb.group({
                    str: [c.properties?.statModifiers?.str ?? 0],
                    dex: [c.properties?.statModifiers?.dex ?? 0],
                    con: [c.properties?.statModifiers?.con ?? 0],
                    int: [c.properties?.statModifiers?.int ?? 0],
                    wis: [c.properties?.statModifiers?.wis ?? 0],
                    cha: [c.properties?.statModifiers?.cha ?? 0]
                  }),
                  speedBonus: [c.properties?.speedBonus ?? 0],
                  statsCondition: [c.properties?.statsCondition ?? 'NONE'],
                  acBonus: [c.properties?.acBonus ?? null],
                  acCondition: [c.properties?.acCondition ?? 'NONE']
                })
              }))),
              progression: this.fb.array(((f.options as any)?.progression ?? []).map((p: any) => this.fb.group({
                level: [p.level, Validators.required],
                additionalChoices: [p.additionalChoices, Validators.required]
              })))
            });
            const featureGroup = this.fb.group({
              id: [f.id ?? null],
              name: [f.name ?? '', Validators.required],
              description: [f.description ?? '', Validators.required],
              levelRequired: [f.levelRequired ?? 1, [Validators.required, Validators.min(1), Validators.max(20)]],
              actionType: [f.actionType || 'PASSIVE'],
              hasOptions: [!!f.options],
              options: optionsGroup,
              progression: this.fb.array(((f.properties?.progression && f.properties?.progression.length > 0) ? f.properties.progression : ((f.options as any)?.progression ?? [])).map((p: any) => this.fb.group({
                level: [p.level, Validators.required],
                additionalChoices: [p.additionalChoices ?? 0],
                diceCount: [p.diceCount ?? null],
                diceType: [p.diceType ?? 'd6'],
                description: [p.description || '']
              }))),
              properties: this.fb.group({
                innateSpells: this.fb.array([]),
                effects: this.fb.array((f.properties?.effects ?? []).map((e: any) => this.fb.group({
                  type: [e.type ?? 'STAT_MODIFIER'],
                  target: [e.target ?? ''],
                  customTarget: [e.customTarget ?? ''],
                  value: [e.value ?? 1],
                  useProficiencyBonus: [e.useProficiencyBonus ?? false],
                  condition: [e.condition ?? null]
                })))
              })
            });

            if (f.properties) {
              const propsGroup = featureGroup.get('properties') as FormGroup;
              if (f.properties.statModifiers) propsGroup.addControl('statModifiers', this.fb.group(f.properties.statModifiers));
              if (f.properties.speedBonus !== undefined && f.properties.speedBonus !== null) {
                propsGroup.addControl('speedBonus', this.fb.control(f.properties.speedBonus));
              }
              if (f.properties.statsCondition !== undefined && f.properties.statsCondition !== null) {
                propsGroup.addControl('statsCondition', this.fb.control(f.properties.statsCondition));
              }
              if (f.properties.acCalculation) propsGroup.addControl('acCalculation', this.fb.group(f.properties.acCalculation));
              if (f.properties.acBonus !== undefined && f.properties.acBonus !== null) {
                propsGroup.addControl('acBonus', this.fb.control(f.properties.acBonus));
                propsGroup.addControl('acCondition', this.fb.control(f.properties.acCondition ?? 'NONE'));
              }
              if (f.properties.resourcePool) propsGroup.addControl('resourcePool', this.fb.group(f.properties.resourcePool));
              if (f.properties.bonusAttunementSlots !== undefined && f.properties.bonusAttunementSlots !== null) {
                propsGroup.addControl('bonusAttunementSlots', this.fb.control(f.properties.bonusAttunementSlots));
              }
            }


            this.features.push(featureGroup);
          });
          this.originalFeatures = cls.features.map((f: any) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            levelRequired: f.levelRequired,
            options: f.options,
            properties: f.properties
          }));
        }

        // Restore spellcasting
        if (cf.spellcasting) {
          this.spellcastingEnabled = true;
          this.form.patchValue({ spellcastingEnabled: true });
          const sc = cf.spellcasting;
          this.form.patchValue({
            spellcastingAbility: sc.ability ?? '',
            spellcastingType: sc.spellcastingType ?? '',
            spellcastingRecharge: sc.recharge ?? (sc.spellcastingType === 'Pact Magic' ? 'SHORT_REST' : 'LONG_REST'),
            ritualCasting: sc.ritualCasting ?? false,
            preparationStyle: sc.preparationStyle ?? 'PREPARED',
            knowledgeStyle: sc.knowledgeStyle ?? 'ALL_LIST',
          });
          this.updateSpellsKnownVisibility();

          // Add validators for spellcasting fields
          this.form.get('spellcastingAbility')?.setValidators(Validators.required);
          this.form.get('spellcastingType')?.setValidators(Validators.required);
          this.form.get('spellcastingAbility')?.updateValueAndValidity();
          this.form.get('spellcastingType')?.updateValueAndValidity();

          // Restore cantripsKnown
          if (Array.isArray(sc.cantripsKnown)) {
            sc.cantripsKnown.forEach((val: number, i: number) => {
              if (i < 20) this.cantripsKnown.at(i).setValue(val ?? null);
            });
          }

          // Restore spellsKnown
          if (Array.isArray(sc.spellsKnown)) {
            sc.spellsKnown.forEach((val: number, i: number) => {
              if (i < 20) this.spellsKnown.at(i).setValue(val ?? null);
            });
          }

          // Restore spellSlots 2D array
          if (sc.spellSlots?.slots) {
            const slots: number[][] = sc.spellSlots.slots;
            slots.forEach((row: number[], levelIdx: number) => {
              if (levelIdx < 20) {
                const rowArray = this.spellSlots.at(levelIdx) as FormArray;
                row.forEach((val: number, slotIdx: number) => {
                  if (slotIdx < 9) rowArray.at(slotIdx).setValue(val ?? null);
                });
              }
            });
          }
        }
      },
      error: (_err: any) => {
        this.error = 'No se pudo cargar la clase para editar.';
      },
    });
  }

  // ---------------------------------------------------------------------------
  // FormArray getters
  // ---------------------------------------------------------------------------

  get features(): FormArray {
    return this.form.get('features') as FormArray;
  }

  get multiclassingPrerequisites(): FormArray {
    return this.form.get('multiclassingPrerequisites') as FormArray;
  }

  get multiclassingArmorGrants(): FormArray {
    return this.form.get('multiclassingArmorGrants') as FormArray;
  }

  get multiclassingWeaponGrants(): FormArray {
    return this.form.get('multiclassingWeaponGrants') as FormArray;
  }

  get multiclassingToolGrants(): FormArray {
    return this.form.get('multiclassingToolGrants') as FormArray;
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
  // Chip toggle helpers
  // ---------------------------------------------------------------------------

  toggleSavingThrow(index: number): void {
    const key = SAVING_THROWS[index];
    const ctrl = (this.form.get('savingThrows') as FormGroup).get(key);
    if (ctrl) {
      const newVal = !ctrl.value;
      ctrl.setValue(newVal);
      this.savingThrowChips[index] = newVal;
    }
  }

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

  toggleMulticlassingArmorChip(index: number): void {
    this.multiclassingArmorChips[index] = !this.multiclassingArmorChips[index];
    this.multiclassingArmorGrants.at(index).setValue(this.multiclassingArmorChips[index]);
  }

  toggleMulticlassingWeaponChip(index: number): void {
    this.multiclassingWeaponChips[index] = !this.multiclassingWeaponChips[index];
    this.multiclassingWeaponGrants.at(index).setValue(this.multiclassingWeaponChips[index]);
  }

  // ---------------------------------------------------------------------------
  // FormArray helpers
  // ---------------------------------------------------------------------------

  addFeature(): void {
    this.features.push(this.fb.group({
      id: [null],
      name: ['', Validators.required],
      description: ['', Validators.required],
      levelRequired: [null, [Validators.required, Validators.min(1), Validators.max(20)]],
      actionType: ['PASSIVE'],
      hasOptions: [false],
      options: this.fb.group({
        type: ['SELECT_ONE'],
        count: [1, [Validators.required, Validators.min(1)]],
        choices: this.fb.array([]),
        progression: this.fb.array([])
      }),
      progression: this.fb.array([]),
      properties: this.fb.group({
        innateSpells: this.fb.array([]),
        effects: this.fb.array([])
      })
    }));
  }

  removeFeature(index: number): void {
    this.features.removeAt(index);
    delete this.featureActiveSection[index];
  }

  hasMechanicsConfigured(feat: AbstractControl): boolean {
    const props = feat.get('properties');
    if (!props) return false;
    return !!props.get('statModifiers') || 
           (props.get('speedBonus')?.value !== null && props.get('speedBonus')?.value !== 0 && props.get('speedBonus')?.value !== undefined) || 
           !!props.get('acCalculation') || 
           (props.get('acBonus')?.value !== null && props.get('acBonus')?.value !== 0 && props.get('acBonus')?.value !== undefined) || 
           !!props.get('resourcePool') || 
           props.get('bonusAttunementSlots')?.value !== null;
  }

  getOptionsCount(feat: AbstractControl): number {
    const choices = feat.get('options.choices') as FormArray;
    return choices ? choices.length : 0;
  }

  getEffectsCount(feat: AbstractControl): number {
    const effects = feat.get('properties.effects') as FormArray;
    return effects ? effects.length : 0;
  }

  getProgressionCount(feat: AbstractControl): number {
    const progression = feat.get('progression') as FormArray;
    return progression ? progression.length : 0;
  }

  toggleFeatureSection(index: number, section: string): void {
    if (this.featureActiveSection[index] === section) {
      delete this.featureActiveSection[index];
    } else {
      this.featureActiveSection[index] = section;
    }
  }

  addFeatureProgressionRow(featureIndex: number): void {
    const progression = this.features.at(featureIndex).get('progression') as FormArray;
    progression.push(this.fb.group({
      level: [null, [Validators.required, Validators.min(1), Validators.max(20)]],
      additionalChoices: [1],
      diceCount: [null],
      diceType: ['d6'],
      description: ['']
    }));
  }

  removeFeatureProgressionRow(featureIndex: number, progIndex: number): void {
    const progression = this.features.at(featureIndex).get('progression') as FormArray;
    progression.removeAt(progIndex);
  }

  getFeatureEffects(featureIndex: number): FormArray {
    return (this.features.at(featureIndex).get('properties.effects') as FormArray);
  }

  addFeatureEffect(featureIndex: number, initialData?: any): void {
    const effectsArray = this.getFeatureEffects(featureIndex);
    effectsArray.push(this.fb.group({
      type: [initialData?.type ?? '', Validators.required],
      target: [initialData?.target ?? '', Validators.required],
      customTarget: [initialData?.customTarget ?? ''],
      value: [initialData?.value ?? 1],
      useProficiencyBonus: [initialData?.useProficiencyBonus ?? false],
      condition: [initialData?.condition ?? null]
    }));
  }

  removeFeatureEffect(featureIndex: number, effectIndex: number): void {
    this.getFeatureEffects(featureIndex).removeAt(effectIndex);
  }

  addFeatureOption(featureIndex: number): void {
    const optionsArray = this.features.at(featureIndex).get('options.options') as FormArray;
    optionsArray.push(this.fb.group({
      id: [null],
      name: ['', Validators.required],
      description: ['', Validators.required],
      levelRequired: [this.features.at(featureIndex).get('levelRequired')?.value ?? 1, [Validators.required, Validators.min(1), Validators.max(20)]]
    }));
  }

  removeFeatureOption(featureIndex: number, optionIndex: number): void {
    const optionsArray = this.features.at(featureIndex).get('options.options') as FormArray;
    optionsArray.removeAt(optionIndex);
  }

  addFeatureProgression(featureIndex: number): void {
    const progArray = this.features.at(featureIndex).get('options.progression') as FormArray;
    progArray.push(this.fb.group({
      level: [null, [Validators.required, Validators.min(1), Validators.max(20)]],
      additionalChoices: [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeFeatureProgression(featureIndex: number, progIndex: number): void {
    const progArray = this.features.at(featureIndex).get('options.progression') as FormArray;
    progArray.removeAt(progIndex);
  }

  addMulticlassingPrerequisite(): void {
    this.multiclassingPrerequisites.push(this.fb.group({
      ability: ['', Validators.required],
      minScore: [null, [Validators.required, Validators.min(1), Validators.max(20)]],
    }));
  }

  removeMulticlassingPrerequisite(index: number): void {
    this.multiclassingPrerequisites.removeAt(index);
  }

  addMulticlassingToolGrant(): void {
    this.multiclassingToolGrants.push(new FormControl(''));
  }

  removeMulticlassingToolGrant(index: number): void {
    this.multiclassingToolGrants.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Custom proficiency helpers
  // ---------------------------------------------------------------------------

  addCustomWeaponProf(): void {
    const val = this.pendingWeaponProf.trim();
    if (val) {
      this.customWeaponProfs.push(val);
      this.pendingWeaponProf = '';
    }
  }

  addCustomArmorProf(): void {
    const val = this.pendingArmorProf.trim();
    if (val) {
      this.customArmorProfs.push(val);
      this.pendingArmorProf = '';
    }
  }

  addCustomToolProf(): void {
    const val = this.pendingToolProf.trim();
    if (val) {
      this.customToolProfs.push(val);
      this.pendingToolProf = '';
    }
  }

  addCustomMulticlassingToolGrant(): void {
    const val = this.pendingMulticlassingToolGrant.trim();
    if (val) {
      this.customMulticlassingToolGrants.push(val);
      this.pendingMulticlassingToolGrant = '';
    }
  }

  removeCustomProf(list: string[], index: number): void {
    list.splice(index, 1);
  }

  // ---------------------------------------------------------------------------
  // Skill picker logic
  // ---------------------------------------------------------------------------

  toggleSkillDropdown(): void {
    this.skillDropdownOpen = !this.skillDropdownOpen;
  }

  selectSkillFromDropdown(skill: string): void {
    this.pendingSkillName = skill;
    this.skillDropdownOpen = false;
  }

  closeSkillDropdown(): void {
    this.skillDropdownOpen = false;
  }

  confirmAddSkill(): void {
    if (!this.pendingSkillName) return;
    const skillGroup = this.skills.get(this.pendingSkillName) as FormGroup;
    if (skillGroup) {
      skillGroup.patchValue({ selected: true });
    }
    this.pendingSkillName = '';
  }

  removeSkillEntry(skillName: string): void {
    const skillGroup = this.skills.get(skillName) as FormGroup;
    if (skillGroup) {
      skillGroup.patchValue({ selected: false });
    }
  }

  isSkillSelected(skillName: string): boolean {
    return this.skills.get(skillName)?.get('selected')?.value === true;
  }

  get selectedSkillNames(): string[] {
    return SKILL_NAMES.filter(s => this.isSkillSelected(s));
  }

  get availableSkillNames(): string[] {
    return SKILL_NAMES.filter(s => !this.isSkillSelected(s));
  }

  // ---------------------------------------------------------------------------
  // Spellcasting toggle logic
  // ---------------------------------------------------------------------------

  toggleSpellcasting(): void {
    this.spellcastingEnabled = !this.spellcastingEnabled;
    const abilityCtrl = this.form.get('spellcastingAbility');
    const typeCtrl = this.form.get('spellcastingType');
    if (this.spellcastingEnabled) {
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

  onPreparationStyleChange(): void {
    const prepStyle = this.form.get('preparationStyle')?.value;
    if (prepStyle === 'KNOWN') {
      this.form.get('knowledgeStyle')?.setValue('LEARNED');
    }
    this.updateSpellsKnownVisibility();
  }

  onKnowledgeStyleChange(): void {
    this.updateSpellsKnownVisibility();
    const knowStyle = this.form.get('knowledgeStyle')?.value;
    if (knowStyle === 'ALL_LIST') {
      this.spellsKnown.controls.forEach(c => c.reset(null));
    }
  }

  private updateSpellsKnownVisibility(): void {
    const prepStyle = this.form.get('preparationStyle')?.value;
    const knowStyle = this.form.get('knowledgeStyle')?.value;
    // Show the table if it's KNOWN style OR if it's LEARNED (Wizard style)
    this.showSpellsKnown = (prepStyle === 'KNOWN' || knowStyle === 'LEARNED');
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
    this.spellSlotsCustomized = false;
  }

  applySpellcastingPreset(type: string): void {
    const knownPreset = SPELLS_KNOWN_PRESETS[type];
    const cantripPreset = CANTRIPS_KNOWN_PRESETS[type];
    const slotsPreset = SPELL_SLOT_PRESETS[type];

    if (knownPreset) {
      knownPreset.forEach((val, i) => this.spellsKnown.at(i).setValue(val));
    }
    if (cantripPreset) {
      cantripPreset.forEach((val, i) => this.cantripsKnown.at(i).setValue(val));
    }
    if (slotsPreset) {
      slotsPreset.forEach((row, levelIdx) => {
        const rowArray = this.spellSlots.at(levelIdx) as FormArray;
        row.forEach((val, slotIdx) => {
          rowArray.at(slotIdx).setValue(val === 0 ? null : val);
        });
      });
      this.spellSlotsCustomized = false;
    }

    // Auto-select the type in the dropdown for visual consistency
    this.form.patchValue({ spellcastingType: type });
    if (type === 'Full Caster' || type === 'Pact Magic') {
      this.form.patchValue({ preparationStyle: 'KNOWN' });
      this.showSpellsKnown = true;
    }
  }

  checkSpellSlotsCustomized(): void {
    const type = this.form.get('spellcastingType')?.value as string;
    const preset = SPELL_SLOT_PRESETS[type];
    if (!preset) {
      this.spellSlotsCustomized = true;
      return;
    }

    for (let i = 0; i < 20; i++) {
      const rowArray = this.spellSlots.at(i) as FormArray;
      for (let j = 0; j < 9; j++) {
        const formVal = rowArray.at(j).value ?? 0;
        const presetVal = preset[i][j];
        if (formVal !== presetVal) {
          this.spellSlotsCustomized = true;
          return;
        }
      }
    }
    this.spellSlotsCustomized = false;
  }

  openSpellcastingPanel(): void { /* no-op, kept for compatibility */ }

  closeSpellcastingPanel(): void { /* no-op, kept for compatibility */ }

  // ---------------------------------------------------------------------------
  // Reconciliation
  // ---------------------------------------------------------------------------

  async reconcileClassFeatures(classId: number): Promise<void> {
    const currentFeatures = this.features.controls.map((ctrl) => ({
      id: ctrl.get('id')?.value as number | null,
      name: ctrl.get('name')?.value as string,
      description: ctrl.get('description')?.value as string,
      levelRequired: ctrl.get('levelRequired')?.value as number,
    }));

    const currentIds = new Set(
      currentFeatures.filter(f => f.id !== null).map(f => f.id as number),
    );

    const promises: Promise<any>[] = [];

    // POST new features (id === null)
    for (let i = 0; i < this.features.length; i++) {
      const ctrl = this.features.at(i);
      const id = ctrl.get('id')?.value;
      if (id === null) {
        const propertiesValue = ctrl.get('properties')?.value || {};

        promises.push(
          this.homebrewService.createClassFeature({
            name: ctrl.get('name')?.value,
            description: ctrl.get('description')?.value,
            levelRequired: ctrl.get('levelRequired')?.value,
            actionType: ctrl.get('actionType')?.value,
            classId,
            options: ctrl.get('hasOptions')?.value
              ? {
                  ...ctrl.get('options')?.value,
                  progression: (ctrl.get('progression')?.value || []).map((p: any) => ({
                    level: p.level,
                    additionalChoices: p.additionalChoices || 0
                  }))
                }
              : null,
            properties: {
              ...propertiesValue,
              progression: ctrl.get('progression')?.value || [],
              effects: propertiesValue.effects || []
            }
          }).toPromise(),
        );
      }
    }

    // PUT changed features (id non-null, name/description/levelRequired changed)
    for (const feature of currentFeatures) {
      if (feature.id !== null) {
        const original = this.originalFeatures.find(o => o.id === feature.id);
        const currentFormFeature = this.features.controls.find(c => c.get('id')?.value === feature.id);

        const hasOptions = currentFormFeature?.get('hasOptions')?.value;
        const options = hasOptions
          ? {
            type: currentFormFeature.get('options.type')?.value,
            count: currentFormFeature.get('options.count')?.value,
            choices: currentFormFeature.get('options.choices')?.value,
            progression: (currentFormFeature.get('progression')?.value || []).map((p: any) => ({
              level: p.level,
              additionalChoices: p.additionalChoices || 0
            }))
          }
          : null;

        const propertiesValue = currentFormFeature?.get('properties')?.value || {};
        const properties = {
          ...propertiesValue,
          progression: currentFormFeature?.get('progression')?.value || [],
          effects: propertiesValue.effects || []
        };

        if (original && (
          original.name !== feature.name ||
          original.description !== feature.description ||
          original.levelRequired !== feature.levelRequired ||
          (original as any).actionType !== currentFormFeature?.get('actionType')?.value ||
          JSON.stringify(original.options) !== JSON.stringify(options) ||
          JSON.stringify(original.properties) !== JSON.stringify(properties)
        )) {
          promises.push(
            this.homebrewService.updateClassFeature(feature.id, {
              name: feature.name,
              description: feature.description,
              levelRequired: feature.levelRequired,
              actionType: currentFormFeature?.get('actionType')?.value,
              classId,
              options: options as any,
              properties: properties
            }).toPromise(),
          );
        }
      }
    }

    // DELETE removed features
    for (const original of this.originalFeatures) {
      if (!currentIds.has(original.id)) {
        promises.push(
          this.homebrewService.deleteClassFeature(original.id).toPromise(),
        );
      }
    }

    await Promise.all(promises);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  submit(): void {
    this.form.markAllAsTouched();
    this.equipmentPicker?.markAllTouched();

    if (this.form.invalid || !this.isPickerValid) {
      this.error = 'Por favor, completa todos los campos obligatorios marcados en rojo antes de continuar.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const content = document.querySelector('ion-content');
      if (content) {
        try {
          (content as any).scrollToTop(300);
        } catch (e) {}
      }
      return;
    }

    this.submitting = true;
    this.error = null;

    const v = this.form.value;

    // Serialize savingThrows as Record<string, boolean>
    const savingThrowsRecord: Record<string, boolean> = {};
    SAVING_THROWS.forEach((st) => {
      savingThrowsRecord[st] = !!(v.savingThrows?.[st]);
    });

    // Serialize skill proficiencies
    const choiceCount = v.skillChoiceCount ?? 0;
    const selectedSkills = SKILL_NAMES.filter(s => this.isSkillSelected(s));
    const skillProficiencies: SkillProficiencies = choiceCount > 0
      ? { fixed: [], choicePool: selectedSkills, choiceCount }
      : { fixed: selectedSkills, choicePool: [], choiceCount: 0 };

    // Serialize weapon proficiencies: chips + custom
    const weaponProficiencies: string[] = [
      ...WEAPON_PROFS.filter((_, i) => this.weaponChips[i]),
      ...this.customWeaponProfs,
    ];

    // Serialize armor proficiencies: chips + custom
    const armorProficiencies: string[] = [
      ...ARMOR_PROFS.filter((_, i) => this.armorChips[i]),
      ...this.customArmorProfs,
    ];

    // Serialize tool proficiencies
    const toolProficiencies: string[] = [...this.customToolProfs];

    // Serialize damage resistances / immunities / condition immunities
    const damageResistances: string[] = DAMAGE_TYPES.filter((_, i) => this.damageResistances.at(i).value === true);
    const damageImmunities: string[] = DAMAGE_TYPES.filter((_, i) => this.damageImmunities.at(i).value === true);
    const conditionImmunities: string[] = CONDITIONS.filter((_, i) => this.conditionImmunities.at(i).value === true);

    // Serialize multiclassing prerequisites
    const prereqControls = this.multiclassingPrerequisites.controls;
    const prereqRequirements: MulticlassingPrerequisite[] = prereqControls.map((ctrl) => ({
      ability: ctrl.get('ability')?.value as string,
      minScore: ctrl.get('minScore')?.value as number,
    }));
    const multiclassingPrerequisitesObj: MulticlassingPrerequisites | null = prereqRequirements.length > 0
      ? { requirements: prereqRequirements, logic: (v.multiclassingLogic ?? 'AND') as 'AND' | 'OR' }
      : null;

    // Serialize multiclassing proficiency grants
    const mcArmorGrants: string[] = ARMOR_PROFS.filter((_, i) => this.multiclassingArmorGrants.at(i).value === true);
    const mcWeaponGrants: string[] = WEAPON_PROFS.filter((_, i) => this.multiclassingWeaponGrants.at(i).value === true);
    const mcToolGrants: string[] = [...this.customMulticlassingToolGrants];
    const multiclassingProficienciesObj: MulticlassingProficiencies | null =
      (mcArmorGrants.length > 0 || mcWeaponGrants.length > 0 || mcToolGrants.length > 0)
        ? { armor: mcArmorGrants, weapons: mcWeaponGrants, tools: mcToolGrants }
        : null;

    // Serialize spellcasting
    let spellcastingObj: Spellcasting | null = null;
    if (this.spellcastingEnabled) {
      const cantripsKnownArr: number[] = this.cantripsKnown.controls.map(c => c.value ?? 0);
      const spellsKnownArr: number[] | undefined = this.showSpellsKnown
        ? this.spellsKnown.controls.map(c => c.value ?? 0)
        : undefined;
      const spellSlotsArr: number[][] = (this.spellSlots.controls as FormArray[]).map(
        (rowArr) => (rowArr as FormArray).controls.map(c => c.value ?? 0)
      );
      spellcastingObj = {
        ability: v.spellcastingAbility ?? '',
        spellcastingType: v.spellcastingType ?? '',
        recharge: v.spellcastingRecharge || (v.spellcastingType === 'Pact Magic' ? 'SHORT_REST' : 'LONG_REST'),
        ritualCasting: v.ritualCasting ?? false,
        preparationStyle: (v.preparationStyle ?? 'PREPARED') as 'PREPARED' | 'KNOWN',
        knowledgeStyle: (v.knowledgeStyle ?? 'ALL_LIST') as 'ALL_LIST' | 'LEARNED',
        cantripsKnown: cantripsKnownArr,
        spellSlots: parseSpellSlotTable(spellSlotsArr),
      };
      if (spellsKnownArr !== undefined) {
        spellcastingObj.spellsKnown = spellsKnownArr;
      }
    }

    // Serialize starting equipment from picker
    const startingEquipmentStr: string = this.currentEquipment
      ? serializeEquipment(this.currentEquipment)
      : (this.equipmentLegacyText || '');

    const classFeatures = buildClassFeatures(
      v.primaryAbility ?? '',
      v.subclassLevel ?? 3,
      startingEquipmentStr,
      skillProficiencies,
      weaponProficiencies,
      armorProficiencies,
      toolProficiencies,
      multiclassingPrerequisitesObj,
      multiclassingProficienciesObj,
      spellcastingObj,
      damageResistances,
      damageImmunities,
      conditionImmunities,
      v.asiLevels ?? [4, 8, 12, 16, 19],
    );

    // Backend expects hitDie as a number (e.g. 8 for d8), not a string
    const hitDieNumber: number = parseInt((v.hitDie ?? '').replace('d', ''), 10);

    const dto: CreateClassDto = {
      name: v.name,
      description: v.description ?? '',
      price: this.isPro ? (v.price ?? 0) : 0,
      hitDie: hitDieNumber as any,
      savingThrows: savingThrowsRecord,
      classFeatures,
      authorId: '',
      isOfficial: !!v.isOfficial,
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateClass(this.editId, dto)
      : this.homebrewService.createClass(dto);

    request$.subscribe({
      next: (result: any) => {
        const classId = result?.id ?? (this.editMode ? Number(this.editId) : null);
        const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
        if (classId) {
          this.reconcileClassFeatures(classId).then(() => {
            this.submitting = false;
            this.router.navigate([returnUrl]);
          }).catch((err: any) => {
            this.submitting = false;
            this.error =
              err?.error?.message ??
              err?.message ??
              'Error al guardar las caracteristicas. La clase fue guardada.';
          });
        } else {
          this.submitting = false;
          this.router.navigate([returnUrl]);
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          (this.editMode
            ? 'Error al actualizar la clase. Por favor, intentalo de nuevo.'
            : 'Error al crear la clase. Por favor, intentalo de nuevo.');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  isAsiLevelSelected(lvl: number): boolean {
    const current: number[] = this.form.get('asiLevels')?.value || [];
    return current.includes(lvl);
  }

  toggleAsiLevel(lvl: number): void {
    const ctrl = this.form.get('asiLevels');
    if (!ctrl) return;
    const current: number[] = [...(ctrl.value || [])];
    const idx = current.indexOf(lvl);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(lvl);
      current.sort((a, b) => a - b);
    }
    ctrl.setValue(current);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
  }

  cancel(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
    this.router.navigate([returnUrl]);
  }
}

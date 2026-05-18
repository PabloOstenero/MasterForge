import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonButton, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea,
} from '@ionic/angular/standalone';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { HomebrewService, CreateRaceDto } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import { FeatureMechanicsComponent } from '../../components/feature-mechanics/feature-mechanics.component';
import {
  SkillProficiencies,
  LanguageProficiencies,
  SpeedObject,
  SenseObject,
  NaturalArmor,
  NaturalWeapon,
  CommonHomebrewFeatures,
  FeatureEntry,
  RaceFeatures,
  InnateSpell,
  SKILL_DATA,
  FlexibleAsi
} from '../../models/homebrew.models';

// ---------------------------------------------------------------------------
// Constant arrays
// ---------------------------------------------------------------------------

export const RACE_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge'] as const;

export const LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin',
  'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech',
  'Infernal', 'Primordial', 'Sylvan', 'Undercommon',
] as const;

export const WEAPON_PROFS = [
  'Simple Weapons', 'Martial Weapons', 'Hand Crossbows', 'Longswords',
  'Rapiers', 'Shortswords', 'Light Crossbows', 'Longbows', 'Shortbows',
] as const;

export const ARMOR_PROFS = [
  'Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields',
] as const;

export const SPELL_ABILITIES = ['Intelligence', 'Wisdom', 'Charisma'] as const;
export const RECHARGE_OPTIONS = ['At Will', 'Short Rest', 'Long Rest'] as const;

export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
] as const;

export const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
] as const;

export const SKILL_NAMES = Object.keys(SKILL_DATA).sort() as string[];

export const ABILITY_ABBREVIATIONS: Record<string, string> = {
  'Strength': 'FU',
  'Dexterity': 'DES',
  'Constitution': 'CON',
  'Intelligence': 'INT',
  'Wisdom': 'SAB',
  'Charisma': 'CAR'
};

export const ABILITY_BONUS_KEYS = [
  'bonusStr', 'bonusDex', 'bonusCon', 'bonusInt', 'bonusWis', 'bonusCha',
] as const;

export const CREATURE_TYPES = [
  'Humanoid', 'Fey', 'Fiend', 'Undead', 'Construct', 'Elemental',
  'Celestial', 'Monstrosity', 'Beast', 'Dragon', 'Giant', 'Ooze',
  'Plant', 'Aberration',
] as const;

export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;

export const NATURAL_WEAPON_DAMAGE_TYPES = [
  'Bludgeoning', 'Piercing', 'Slashing',
] as const;



// ---------------------------------------------------------------------------
// Pure serialization function
// ---------------------------------------------------------------------------

/**
 * Builds the RaceFeatures object from individual form values.
 * Exported so it can be tested without mounting the component.
 */
export function buildRaceFeatures(
  // ── Existing parameters (unchanged) ──────────────────────────────────────
  speeds: { walk: number | null; swim: number | null; climb: number | null; fly: number | null },
  senses: { darkvision: number | null; blindsight: number | null; tremorsense: number | null; truesight: number | null },
  fixedLanguages: string[],
  poolLanguages: string[],
  extraLanguageChoices: number,
  skillProficiencies: SkillProficiencies,
  weaponProficiencies: string[],
  armorProficiencies: string[],
  toolProficiencies: string[],
  damageResistances: string[],
  damageImmunities: string[],
  conditionImmunities: string[],
  innateSpells: InnateSpell[],
  // ── New optional parameters ───────────────────────────────────────────────
  naturalArmor?: NaturalArmor | null,
  naturalWeapons?: NaturalWeapon[],
  creatureType?: string,
  flyRestriction?: string,
  flexibleAsi?: FlexibleAsi | null,
  bonusStr?: number | null,
  bonusDex?: number | null,
  bonusCon?: number | null,
  bonusInt?: number | null,
  bonusWis?: number | null,
  bonusCha?: number | null,
): RaceFeatures {
  // Omit speed keys whose value is null or 0
  const filteredSpeeds: Partial<{ walk: number; swim: number; climb: number; fly: number }> = {};
  (Object.keys(speeds) as Array<keyof typeof speeds>).forEach((key) => {
    const val = speeds[key];
    if (val !== null && val !== 0) {
      (filteredSpeeds as any)[key] = val;
    }
  });

  // Omit sense keys whose value is null or 0
  const filteredSenses: Partial<{ darkvision: number; blindsight: number; tremorsense: number; truesight: number }> = {};
  (Object.keys(senses) as Array<keyof typeof senses>).forEach((key) => {
    const val = senses[key];
    if (val !== null && val !== 0) {
      (filteredSenses as any)[key] = val;
    }
  });

  // Serialize innate spells with all fields
  const serializedSpells: InnateSpell[] = innateSpells.map((spell) => ({
    spellId:    spell.spellId ?? null,
    name:       spell.name,
    level:      spell.level,
    usesPerDay: spell.usesPerDay,
    ability:    spell.ability,
    rechargeOn: spell.rechargeOn,
  }));

  const toArray = (val: string | string[]): string[] => {
    if (Array.isArray(val)) return val;
    return val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
  };

  const languageProficiencies: LanguageProficiencies = {
    fixed: toArray(fixedLanguages),
    choicePool: toArray(poolLanguages),
    choiceCount: extraLanguageChoices
  };

  // ── Base result (existing fields always present) ──────────────────────────
  const result: RaceFeatures = {
    speeds: filteredSpeeds,
    senses: filteredSenses,
    languages: toArray(fixedLanguages),
    extraLanguageChoices,
    languageProficiencies,
    skillProficiencies,
    weaponProficiencies,
    armorProficiencies,
    toolProficiencies,
    damageResistances:   toArray(damageResistances),
    damageImmunities:    toArray(damageImmunities),
    conditionImmunities: toArray(conditionImmunities),
    innateSpells: serializedSpells,
  };

  // ── New optional fields — omit when falsy/empty ───────────────────────────

  // naturalArmor: omit when enabled is false or parameter is null/undefined
  if (naturalArmor !== null && naturalArmor !== undefined && naturalArmor.enabled === true) {
    result.naturalArmor = { enabled: true, baseAC: naturalArmor.baseAC, addDex: naturalArmor.addDex };
  }

  // naturalWeapons: omit when array is empty or undefined
  if (naturalWeapons && naturalWeapons.length > 0) {
    result.naturalWeapons = naturalWeapons.map((nw) => ({
      name:       nw.name,
      diceCount:  nw.diceCount,
      dieType:    nw.dieType,
      damageType: nw.damageType,
      stat:       nw.stat,
    }));
  }

  // creatureType: omit when empty or undefined
  if (creatureType && creatureType.trim() !== '') {
    result.creatureType = creatureType;
  }

  // flyRestriction: omit when empty or whitespace-only
  if (flyRestriction !== undefined && flyRestriction.trim() !== '') {
    result.flyRestriction = flyRestriction.trim();
  }

  if (flexibleAsi) {
    result.flexibleAsi = flexibleAsi;
  }

  if (bonusStr !== undefined && bonusStr !== null) result.bonusStr = Number(bonusStr);
  if (bonusDex !== undefined && bonusDex !== null) result.bonusDex = Number(bonusDex);
  if (bonusCon !== undefined && bonusCon !== null) result.bonusCon = Number(bonusCon);
  if (bonusInt !== undefined && bonusInt !== null) result.bonusInt = Number(bonusInt);
  if (bonusWis !== undefined && bonusWis !== null) result.bonusWis = Number(bonusWis);
  if (bonusCha !== undefined && bonusCha !== null) result.bonusCha = Number(bonusCha);

  return result;
}

@Component({
  selector: 'app-homebrew-race-form',
  templateUrl: './homebrew-race-form.page.html',
  styleUrls: ['./homebrew-race-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
    FeatureMechanicsComponent,
  ],
})
export class HomebrewRaceFormPage implements OnInit {

  // ---------------------------------------------------------------------------
  // Core state
  // ---------------------------------------------------------------------------

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Edit mode — set when route has an :id param */
  editMode = false;
  editId: string | null = null;

  /** Original traits loaded in edit mode for reconciliation */
  originalTraits: { id: number; name: string; description: string; levelRequired: number; options?: any; properties?: any }[] = [];

  // ---------------------------------------------------------------------------
  // Proficiency chip state
  // ---------------------------------------------------------------------------

  weaponChips: boolean[] = WEAPON_PROFS.map(() => false);
  armorChips: boolean[] = ARMOR_PROFS.map(() => false);
  languageChips: boolean[] = LANGUAGES.map(() => false);
  languagePoolChips: boolean[] = LANGUAGES.map(() => false);

  skillData = SKILL_DATA;
  abilityAbbr = ABILITY_ABBREVIATIONS;

  customWeaponProfs: string[] = [];
  customArmorProfs: string[] = [];
  customToolProfs: string[] = [];

  pendingWeaponProf = '';
  pendingArmorProf = '';
  pendingToolProf = '';

  // ---------------------------------------------------------------------------
  // Skill picker state (identical to monster form)
  // ---------------------------------------------------------------------------

  pendingSkillName = '';
  skillDropdownOpen = false;

  // ---------------------------------------------------------------------------
  // Readonly constant arrays for template iteration
  // ---------------------------------------------------------------------------

  readonly raceSizes = RACE_SIZES;
  readonly languages = LANGUAGES;
  readonly weaponProfs = WEAPON_PROFS;
  readonly armorProfs = ARMOR_PROFS;
  readonly spellAbilities = SPELL_ABILITIES;
  readonly rechargeOptions = RECHARGE_OPTIONS;
  readonly damageTypes = DAMAGE_TYPES;
  readonly conditions = CONDITIONS;
  readonly skillNames = SKILL_NAMES;
  readonly creatureTypes = CREATURE_TYPES;
  readonly dieTypes = DIE_TYPES;
  readonly naturalWeaponDamageTypes = NATURAL_WEAPON_DAMAGE_TYPES;

  // ---------------------------------------------------------------------------
  // New mechanic state (task 3.1)
  // ---------------------------------------------------------------------------

  naturalArmorEnabled: boolean = false;
  flexibleAsiEnabled: boolean = false;

  // Spell picker state
  availableSpells: any[] = [];
  spellSearchQueries: Record<number, string> = {};
  spellDropdownOpen: Record<number, boolean> = {};

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

  getSkillAbility(skill: string): string {
    return this.skillData[skill] || '';
  }

  getSkillAbbr(skill: string): string {
    const ability = this.getSkillAbility(skill);
    return this.abilityAbbr[ability] || '';
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    // Build skills FormGroup — one entry per skill
    const skillsGroup = SKILL_NAMES.reduce((acc, skill) => ({
      ...acc,
      [skill]: this.fb.group({ selected: [false], bonus: [null] }),
    }), {} as Record<string, any>);

    this.form = this.fb.group({
      // Identity
      name:        ['', Validators.required],
      description: [''],
      size:        ['', Validators.required],
      price:       [null, Validators.min(0)],
      isOfficial:  [true],

      // Speed (nested FormGroup)
      speeds: this.fb.group({
        walk:  [null, [Validators.required, Validators.min(0)]],
        swim:  [null, Validators.min(0)],
        climb: [null, Validators.min(0)],
        fly:   [null, Validators.min(0)],
      }),

      // Senses (nested FormGroup)
      senses: this.fb.group({
        darkvision:  [null, Validators.min(0)],
        blindsight:  [null, Validators.min(0)],
        tremorsense: [null, Validators.min(0)],
        truesight:   [null, Validators.min(0)],
      }),

      // Languages
      languages:            this.fb.array(LANGUAGES.map(() => false)),
      languagePool:         this.fb.array(LANGUAGES.map(() => false)),
      extraLanguageChoices: [null, Validators.min(0)],

      // Skill proficiencies
      skills:          this.fb.group(skillsGroup),
      skillChoiceCount: [null, Validators.min(0)],

      // Damage resistances / immunities / condition immunities
      damageResistances:   this.fb.array(DAMAGE_TYPES.map(() => false)),
      damageImmunities:    this.fb.array(DAMAGE_TYPES.map(() => false)),
      conditionImmunities: this.fb.array(CONDITIONS.map(() => false)),

      // Racial traits
      traits: this.fb.array([]),

      // Innate spells
      innateSpells: this.fb.array([]),

      // ── New controls (task 3.2) ─────────────────────────────────────────

      // Static ASI modifiers
      bonusStr: [null, [Validators.min(0), Validators.max(5)]],
      bonusDex: [null, [Validators.min(0), Validators.max(5)]],
      bonusCon: [null, [Validators.min(0), Validators.max(5)]],
      bonusInt: [null, [Validators.min(0), Validators.max(5)]],
      bonusWis: [null, [Validators.min(0), Validators.max(5)]],
      bonusCha: [null, [Validators.min(0), Validators.max(5)]],

      // Feat grant — removed

      // Natural armor (Validators.required added/removed dynamically on baseAC)
      naturalArmorBaseAC: [null],
      naturalArmorAddDex: [true],

      // Creature type
      creatureType: [''],

      // Fly restriction
      flyRestriction: [''],

      // Natural weapons FormArray
      naturalWeapons: this.fb.array([]),

      // Flexible ASI controls
      flexibleAsiChoicesCount: [1],
      flexibleAsiBonusValue: [1],
      flexibleAsiAllowAbilityOverlap: [false],
    });

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadRaceForEdit(id);
    }

    // Load available spells for the innate spell picker
    this.homebrewService.getAllSpells().subscribe({
      next: (spells) => { this.availableSpells = spells.sort((a, b) => a.name.localeCompare(b.name)); },
      error: () => { /* non-critical, fall back to free text */ },
    });

    if (!id) {
      this.addTrait();
      const firstTrait = this.traits.at(0);
      firstTrait.patchValue({
        name: 'Mejora de Puntuación de Característica',
        description: 'Aumenta tus puntuaciones de característica según tu elección.'
      });
      // You can manually add a STAT_MODIFIER effect to guide them, but they can use the builder.
    }
  }

  // ---------------------------------------------------------------------------
  // Edit mode — load and patch
  // ---------------------------------------------------------------------------

  loadRaceForEdit(id: string): void {
    this.homebrewService.getRace(id).subscribe({
      next: (race: any) => {
        const rf = race.raceFeatures ?? {};

        // Patch scalar fields
        this.form.patchValue({
          name:        race.name ?? '',
          description: race.description ?? '',
          size:        race.size ?? '',
          price:       race.price ?? null,
          extraLanguageChoices: rf.extraLanguageChoices ?? null,
          skillChoiceCount:     rf.skillProficiencies?.choiceCount ?? null,
          bonusStr:    (rf.bonusStr ?? race.bonusStr) ?? null,
          bonusDex:    (rf.bonusDex ?? race.bonusDex) ?? null,
          bonusCon:    (rf.bonusCon ?? race.bonusCon) ?? null,
          bonusInt:    (rf.bonusInt ?? race.bonusInt) ?? null,
          bonusWis:    (rf.bonusWis ?? race.bonusWis) ?? null,
          bonusCha:    (rf.bonusCha ?? race.bonusCha) ?? null,
          isOfficial:  race.author === null || !race.author,
        });

        // Patch speeds
        if (rf.speeds) {
          this.form.get('speeds')?.patchValue(rf.speeds);
        }

        // Patch senses
        if (rf.senses) {
          this.form.get('senses')?.patchValue(rf.senses);
        }

        // Restore language chips — prioritize new languageProficiencies format
        const lp = rf.languageProficiencies;
        if (lp) {
          LANGUAGES.forEach((lang, i) => {
            const isFixed = (lp.fixed ?? []).includes(lang);
            const isInPool = (lp.choicePool ?? []).includes(lang);
            this.languageChips[i] = isFixed;
            this.languagePoolChips[i] = isInPool;
            this.languagesArray.at(i).setValue(isFixed);
            this.languagePoolArray.at(i).setValue(isInPool);
          });
          this.form.patchValue({ extraLanguageChoices: lp.choiceCount });
        } else if (rf.languages) {
          const selected: string[] = Array.isArray(rf.languages)
            ? rf.languages
            : (rf.languages as string).split(',').map((s: string) => s.trim());
          LANGUAGES.forEach((lang, i) => {
            const isSelected = selected.includes(lang);
            this.languageChips[i] = isSelected;
            this.languagesArray.at(i).setValue(isSelected);
          });
        }

        // Restore skill proficiencies
        const sp = rf.skillProficiencies;
        if (sp) {
          const allSkills: string[] = [
            ...(sp.fixed ?? []),
            ...(sp.choicePool ?? []),
          ];
          allSkills.forEach((skillName: string) => {
            const skillGroup = this.skills.get(skillName) as FormGroup;
            if (skillGroup) {
              skillGroup.patchValue({ selected: true, bonus: null });
            }
          });
        }

        // Restore weapon chips and custom weapon profs
        if (Array.isArray(rf.weaponProficiencies)) {
          const wpArr: string[] = rf.weaponProficiencies;
          WEAPON_PROFS.forEach((wp, i) => {
            this.weaponChips[i] = wpArr.includes(wp);
          });
          this.customWeaponProfs = wpArr.filter((w: string) => !(WEAPON_PROFS as readonly string[]).includes(w));
        }

        // Restore armor chips and custom armor profs
        if (Array.isArray(rf.armorProficiencies)) {
          const apArr: string[] = rf.armorProficiencies;
          ARMOR_PROFS.forEach((ap, i) => {
            this.armorChips[i] = apArr.includes(ap);
          });
          this.customArmorProfs = apArr.filter((a: string) => !(ARMOR_PROFS as readonly string[]).includes(a));
        }

        // Restore custom tool profs
        if (Array.isArray(rf.toolProficiencies)) {
          this.customToolProfs = [...rf.toolProficiencies];
        }

        // Restore damage resistances / immunities / condition immunities
        // Handle both old string format ("Fire, Cold") and new array format (["Fire", "Cold"])
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
        patchBoolArray('damageResistances',   DAMAGE_TYPES, rf.damageResistances);
        patchBoolArray('damageImmunities',    DAMAGE_TYPES, rf.damageImmunities);
        patchBoolArray('conditionImmunities', CONDITIONS,   rf.conditionImmunities);

        // Rebuild traits FormArray
        if (Array.isArray(race.traits)) {
          race.traits.forEach((t: any) => {
            const options = t.options || {};
            const traitGroup = this.fb.group({
              id: [t.id ?? null],
              name: [t.name ?? '', Validators.required],
              description: [t.description ?? '', Validators.required],
              levelRequired: [t.levelRequired ?? 1, [Validators.required, Validators.min(1)]],
              hasOptions: [!!(options.options && options.options.length > 0)],
              choiceCount: [options.choiceCount ?? 1],
              options: this.fb.array([]),
              progression: this.fb.array([]),
              properties: this.fb.group({})
            });

            if (t.properties) {
              const props = t.properties;
              const propsGroup = traitGroup.get('properties') as FormGroup;
              if (props.statModifiers) propsGroup.addControl('statModifiers', this.fb.group(props.statModifiers));
              if (props.acCalculation) propsGroup.addControl('acCalculation', this.fb.group(props.acCalculation));
              if (props.acBonus !== undefined && props.acBonus !== null) {
                propsGroup.addControl('acBonus', this.fb.control(props.acBonus));
                propsGroup.addControl('acBonusArmorOnly', this.fb.control(props.acBonusArmorOnly ?? false));
              }
              if (props.resourcePool) propsGroup.addControl('resourcePool', this.fb.group(props.resourcePool));
              if (props.bonusAttunementSlots !== undefined && props.bonusAttunementSlots !== null) {
                propsGroup.addControl('bonusAttunementSlots', this.fb.control(props.bonusAttunementSlots));
              }
            }

            if (options.options) {
              const optsArray = traitGroup.get('options') as FormArray;
              options.options.forEach((opt: any) => {
                optsArray.push(this.fb.group({
                  name: [opt.name, Validators.required],
                  description: [opt.description, Validators.required],
                  levelRequired: [opt.levelRequired ?? 1]
                }));
              });
            }

            if (options.progression) {
              const progArray = traitGroup.get('progression') as FormArray;
              options.progression.forEach((p: any) => {
                progArray.push(this.fb.group({
                  level: [p.level, [Validators.required, Validators.min(1)]],
                  additionalChoices: [p.additionalChoices, [Validators.required, Validators.min(1)]]
                }));
              });
            }

            this.traits.push(traitGroup);
          });
          this.originalTraits = race.traits.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            levelRequired: t.levelRequired,
            options: t.options
          }));
        }

        // Rebuild innateSpells FormArray
        if (Array.isArray(rf.innateSpells)) {
          rf.innateSpells.forEach((spell: any, i: number) => {
            this.innateSpells.push(this.fb.group({
              spellId:    [spell.spellId ?? null],
              name:       [spell.name ?? '', Validators.required],
              level:      [spell.level ?? null, [Validators.required, Validators.min(0), Validators.max(9)]],
              usesPerDay: [spell.usesPerDay ?? null, Validators.min(0)],
              ability:    [spell.ability ?? ''],
              rechargeOn: [spell.rechargeOn ?? ''],
            }));
            if (spell.name) {
              this.spellSearchQueries[i] = spell.name;
            }
          });
        }

        // Restore ASI config — removed

        // Restore feat grant — removed

        // Restore natural armor
        if (rf.naturalArmor?.enabled) {
          this.naturalArmorEnabled = true;
          const ctrl = this.form.get('naturalArmorBaseAC');
          ctrl?.setValidators([Validators.required, Validators.min(1)]);
          ctrl?.setValue(rf.naturalArmor.baseAC ?? null);
          ctrl?.updateValueAndValidity();
          this.form.patchValue({ naturalArmorAddDex: rf.naturalArmor.addDex ?? true });
        }

        // Restore natural weapons
        if (Array.isArray(rf.naturalWeapons)) {
          rf.naturalWeapons.forEach((nw: any) => {
            this.naturalWeapons.push(this.fb.group({
              name:       [nw.name       ?? '', Validators.required],
              diceCount:  [nw.diceCount  ?? 1,  [Validators.required, Validators.min(1)]],
              dieType:    [nw.dieType    ?? 'd6'],
              damageType: [nw.damageType ?? 'Slashing', Validators.required],
              stat:       [nw.stat       ?? 'str'],
            }));
          });
        }

        // Restore creature type and fly restriction
        this.form.patchValue({
          creatureType:   rf.creatureType   ?? '',
          flyRestriction: rf.flyRestriction ?? '',
        });

        // Restore flexible ASI config
        if (rf.flexibleAsi) {
          this.flexibleAsiEnabled = true;
          this.form.patchValue({
            flexibleAsiChoicesCount: rf.flexibleAsi.choicesCount ?? 1,
            flexibleAsiBonusValue: rf.flexibleAsi.bonusValue ?? 1,
            flexibleAsiAllowAbilityOverlap: rf.flexibleAsi.allowAbilityOverlap ?? false,
          });
        }
      },
      error: (_err: any) => {
        this.error = 'No se pudo cargar la raza para editar.';
      },
    });
  }

  toggleFlexibleAsi(): void {
    this.flexibleAsiEnabled = !this.flexibleAsiEnabled;
    const choicesCtrl = this.form.get('flexibleAsiChoicesCount');
    const bonusCtrl = this.form.get('flexibleAsiBonusValue');
    if (this.flexibleAsiEnabled) {
      choicesCtrl?.setValue(choicesCtrl.value ?? 1);
      bonusCtrl?.setValue(bonusCtrl.value ?? 1);
    } else {
      choicesCtrl?.setValue(1);
      bonusCtrl?.setValue(1);
      this.form.patchValue({ flexibleAsiAllowAbilityOverlap: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Submit and reconcile
  // ---------------------------------------------------------------------------

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;

    const v = this.form.value;

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

    // Serialize skill proficiencies
    const choiceCount = v.skillChoiceCount ?? 0;
    const selectedSkills = SKILL_NAMES.filter(s => this.isSkillSelected(s));
    const skillProficiencies: SkillProficiencies = choiceCount > 0
      ? { fixed: [], choicePool: selectedSkills, choiceCount }
      : { fixed: selectedSkills, choicePool: [], choiceCount: 0 };

    // Serialize innate spells
    const innateSpellValues: InnateSpell[] = (v.innateSpells ?? []).map((s: any) => ({
      spellId:    s.spellId ?? null,
      name:       s.name,
      level:      s.level,
      usesPerDay: s.usesPerDay,
      ability:    s.ability,
      rechargeOn: s.rechargeOn,
    }));

    // Serialize natural armor
    const naturalArmor: NaturalArmor | null = this.naturalArmorEnabled
      ? { enabled: true, baseAC: v.naturalArmorBaseAC ?? 10, addDex: v.naturalArmorAddDex ?? true }
      : null;

    // Serialize natural weapons
    const naturalWeaponValues: NaturalWeapon[] = this.naturalWeapons.controls.map((ctrl) => ({
      name:       ctrl.get('name')?.value       ?? '',
      diceCount:  ctrl.get('diceCount')?.value  ?? 1,
      dieType:    ctrl.get('dieType')?.value    ?? 'd6',
      damageType: ctrl.get('damageType')?.value ?? 'Slashing',
      stat:       ctrl.get('stat')?.value       ?? 'str',
    }));

    const flexibleAsi = this.flexibleAsiEnabled ? {
      choicesCount: Number(v.flexibleAsiChoicesCount ?? 1),
      bonusValue: Number(v.flexibleAsiBonusValue ?? 1),
      allowAbilityOverlap: !!v.flexibleAsiAllowAbilityOverlap
    } : null;

    const raceFeatures = buildRaceFeatures(
      v.speeds ?? { walk: null, swim: null, climb: null, fly: null },
      v.senses ?? { darkvision: null, blindsight: null, tremorsense: null, truesight: null },
      this.selectedLabels(this.languagesArray, LANGUAGES),
      this.selectedLabels(this.languagePoolArray, LANGUAGES),
      v.extraLanguageChoices ?? 0,
      skillProficiencies,
      weaponProficiencies,
      armorProficiencies,
      this.customToolProfs,
      this.selectedLabels(this.damageResistances, DAMAGE_TYPES),
      this.selectedLabels(this.damageImmunities, DAMAGE_TYPES),
      this.selectedLabels(this.conditionImmunities, CONDITIONS),
      innateSpellValues,
      naturalArmor,
      naturalWeaponValues,
      v.creatureType ?? '',
      v.flyRestriction ?? '',
      flexibleAsi,
      v.bonusStr,
      v.bonusDex,
      v.bonusCon,
      v.bonusInt,
      v.bonusWis,
      v.bonusCha,
    );

    const dto = {
      name:        v.name,
      description: v.description ?? '',
      size:        v.size,
      price:       v.price,
      bonusStr:    v.bonusStr ?? 0,
      bonusDex:    v.bonusDex ?? 0,
      bonusCon:    v.bonusCon ?? 0,
      bonusInt:    v.bonusInt ?? 0,
      bonusWis:    v.bonusWis ?? 0,
      bonusCha:    v.bonusCha ?? 0,
      raceFeatures,
      authorId: '',
      isOfficial:  !!v.isOfficial,
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateRace(this.editId, dto)
      : this.homebrewService.createRace(dto);

    request$.subscribe({
      next: (result: any) => {
        const raceId = result?.id ?? (this.editMode ? Number(this.editId) : null);
        const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
        if (raceId) {
          this.reconcileTraits(raceId).then(() => {
            this.submitting = false;
            this.router.navigate([returnUrl]);
          }).catch((err: any) => {
            this.submitting = false;
            this.error =
              err?.error?.message ??
              err?.message ??
              'Error al guardar los rasgos. La raza fue guardada.';
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
            ? 'Error al actualizar la raza. Por favor, inténtalo de nuevo.'
            : 'Error al crear la raza. Por favor, inténtalo de nuevo.');
      },
    });
  }

  /**
   * Reconciles the traits FormArray against originalTraits:
   * - POST traits with id === null
   * - PUT traits whose id is non-null and name/description changed
   * - DELETE traits in originalTraits not present in current array
   */
  async reconcileTraits(raceId: number): Promise<void> {
    const currentTraits = this.traits.controls.map((ctrl) => {
      const fg = ctrl as FormGroup;
      const hasOptions = fg.get('hasOptions')?.value;
      const options = fg.get('options')?.value;
      const progression = fg.get('progression')?.value;
      const choiceCount = fg.get('choiceCount')?.value;
      const propertiesValue = fg.get('properties')?.value || {};
      
      return {
        id:          fg.get('id')?.value as number | null,
        name:        fg.get('name')?.value as string,
        description: fg.get('description')?.value as string,
        levelRequired: fg.get('levelRequired')?.value as number,
        options: hasOptions ? {
          choiceCount,
          options: options.map((o: any) => ({
            name: o.name,
            description: o.description,
            levelRequired: o.levelRequired
          })),
          progression: progression.map((p: any) => ({
            level: p.level,
            additionalChoices: p.additionalChoices
          }))
        } : null,
        properties: Object.keys(propertiesValue).length > 0 ? propertiesValue : null
      };
    });

    const currentIds = new Set(
      currentTraits.filter(t => t.id !== null).map(t => t.id as number),
    );

    const promises: Promise<any>[] = [];

    // POST new traits (id === null)
    for (const trait of currentTraits) {
      if (trait.id === null) {
        promises.push(
          this.homebrewService.createRaceTrait({
            name:        trait.name,
            description: trait.description,
            levelRequired: trait.levelRequired,
            options:     trait.options,
            properties:  trait.properties,
            raceId,
          }).toPromise(),
        );
      }
    }

    // PUT changed traits
    for (const trait of currentTraits) {
      if (trait.id !== null) {
        const original = this.originalTraits.find(o => o.id === trait.id);
        const hasChanged = original && (
          original.name !== trait.name || 
          original.description !== trait.description || 
          original.levelRequired !== trait.levelRequired ||
          JSON.stringify(original.options) !== JSON.stringify(trait.options) ||
          JSON.stringify(original.properties) !== JSON.stringify(trait.properties)
        );

        if (hasChanged) {
          promises.push(
            this.homebrewService.updateRaceTrait(trait.id, {
              name:        trait.name,
              description: trait.description,
              levelRequired: trait.levelRequired,
              options:     trait.options,
              properties:  trait.properties,
              raceId,
            }).toPromise(),
          );
        }
      }
    }

    // DELETE traits removed from the FormArray
    for (const original of this.originalTraits) {
      if (!currentIds.has(original.id)) {
        promises.push(
          this.homebrewService.deleteRaceTrait(original.id).toPromise(),
        );
      }
    }

    await Promise.all(promises);
  }

  // ---------------------------------------------------------------------------
  // FormArray getters
  // ---------------------------------------------------------------------------

  get traits(): FormArray {
    return this.form.get('traits') as FormArray;
  }

  get innateSpells(): FormArray {
    return this.form.get('innateSpells') as FormArray;
  }

  get skills(): FormGroup {
    return this.form.get('skills') as FormGroup;
  }

  get languagesArray(): FormArray { return this.form.get('languages') as FormArray; }
  get languagePoolArray(): FormArray { return this.form.get('languagePool') as FormArray; }

  get damageResistances(): FormArray {
    return this.form.get('damageResistances') as FormArray;
  }

  get damageImmunities(): FormArray {
    return this.form.get('damageImmunities') as FormArray;
  }

  get conditionImmunities(): FormArray {
    return this.form.get('conditionImmunities') as FormArray;
  }

  // ---------------------------------------------------------------------------
  // Trait helpers
  // ---------------------------------------------------------------------------

  addTrait(): void {
    this.traits.push(this.fb.group({
      id:          [null],
      name:        ['', Validators.required],
      description: ['', Validators.required],
      levelRequired: [1, [Validators.required, Validators.min(1)]],
      hasOptions:  [false],
      choiceCount: [1],
      options:     this.fb.array([]),
      progression: this.fb.array([]),
      properties:  this.fb.group({})
    }));
  }

  getTraitOptions(traitIndex: number): FormArray {
    return this.traits.at(traitIndex).get('options') as FormArray;
  }

  addTraitOption(traitIndex: number): void {
    const arr = this.getTraitOptions(traitIndex);
    arr.push(this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      levelRequired: [1]
    }));
  }

  removeTraitOption(traitIndex: number, optionIndex: number): void {
    this.getTraitOptions(traitIndex).removeAt(optionIndex);
  }

  getTraitProgression(traitIndex: number): FormArray {
    return this.traits.at(traitIndex).get('progression') as FormArray;
  }

  addTraitProgression(traitIndex: number): void {
    const arr = this.getTraitProgression(traitIndex);
    arr.push(this.fb.group({
      level: [1, [Validators.required, Validators.min(1)]],
      additionalChoices: [1, [Validators.required, Validators.min(1)]]
    }));
  }

  removeTraitProgression(traitIndex: number, progressionIndex: number): void {
    this.getTraitProgression(traitIndex).removeAt(progressionIndex);
  }

  removeTrait(index: number): void {
    this.traits.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Innate spell helpers
  // ---------------------------------------------------------------------------

  addSpell(): void {
    this.innateSpells.push(this.fb.group({
      spellId:    [null],
      name:       ['', Validators.required],
      level:      [null, [Validators.required, Validators.min(0), Validators.max(9)]],
      usesPerDay: [null, Validators.min(0)],
      ability:    [''],
      rechargeOn: [''],
    }));
  }

  removeSpell(index: number): void {
    this.innateSpells.removeAt(index);
    delete this.spellSearchQueries[index];
    delete this.spellDropdownOpen[index];
  }

  filteredSpells(index: number): any[] {
    const q = (this.spellSearchQueries[index] ?? '').toLowerCase().trim();
    if (!q) return this.availableSpells;
    return this.availableSpells.filter(s => s.name.toLowerCase().includes(q));
  }

  selectSpell(index: number, spell: any): void {
    const ctrl = this.innateSpells.at(index);
    ctrl.patchValue({ spellId: spell.id, name: spell.name, level: spell.level });
    this.spellSearchQueries[index] = spell.name;
    this.spellDropdownOpen[index] = false;
  }

  toggleSpellDropdown(index: number): void {
    this.spellDropdownOpen[index] = !this.spellDropdownOpen[index];
  }

  closeSpellDropdown(index: number): void {
    this.spellDropdownOpen[index] = false;
  }

  // ---------------------------------------------------------------------------
  // Natural weapon helpers
  // ---------------------------------------------------------------------------

  get naturalWeapons(): FormArray {
    return this.form.get('naturalWeapons') as FormArray;
  }

  addNaturalWeapon(): void {
    this.naturalWeapons.push(this.fb.group({
      name:       ['', Validators.required],
      diceCount:  [1, [Validators.required, Validators.min(1)]],
      dieType:    ['d6'],
      damageType: ['Slashing', Validators.required],
      stat:       ['str'],
    }));
  }

  removeNaturalWeapon(index: number): void {
    this.naturalWeapons.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Natural armor toggle
  // ---------------------------------------------------------------------------

  toggleNaturalArmor(): void {
    this.naturalArmorEnabled = !this.naturalArmorEnabled;
    const ctrl = this.form.get('naturalArmorBaseAC');
    if (this.naturalArmorEnabled) {
      ctrl?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      ctrl?.clearValidators();
      ctrl?.setValue(null);
      this.form.patchValue({ naturalArmorAddDex: true });
    }
    ctrl?.updateValueAndValidity();
  }

  // ---------------------------------------------------------------------------
  // Chip helpers
  // ---------------------------------------------------------------------------

  /** Toggle a boolean chip in a damage/condition FormArray. */
  toggleChip(array: FormArray, index: number): void {
    array.at(index).setValue(!array.at(index).value);
  }

  /** Toggle a language chip. */
  toggleLanguageChip(index: number): void {
    this.languageChips[index] = !this.languageChips[index];
    this.languagesArray.at(index).setValue(this.languageChips[index]);
  }

  toggleLanguagePoolChip(index: number): void {
    this.languagePoolChips[index] = !this.languagePoolChips[index];
    this.languagePoolArray.at(index).setValue(this.languagePoolChips[index]);
  }

  /** Toggle a weapon proficiency chip. */
  toggleWeaponChip(index: number): void {
    this.weaponChips[index] = !this.weaponChips[index];
  }

  /** Toggle an armor proficiency chip. */
  toggleArmorChip(index: number): void {
    this.armorChips[index] = !this.armorChips[index];
  }

  // ---------------------------------------------------------------------------
  // Custom proficiency helpers
  // ---------------------------------------------------------------------------

  addCustomWeaponProf(): void {
    const val = this.pendingWeaponProf.trim();
    if (val) {
      this.customWeaponProfs = [...this.customWeaponProfs, val];
      this.pendingWeaponProf = '';
    }
  }

  addCustomArmorProf(): void {
    const val = this.pendingArmorProf.trim();
    if (val) {
      this.customArmorProfs = [...this.customArmorProfs, val];
      this.pendingArmorProf = '';
    }
  }

  addCustomToolProf(): void {
    const val = this.pendingToolProf.trim();
    if (val) {
      this.customToolProfs = [...this.customToolProfs, val];
      this.pendingToolProf = '';
    }
  }

  removeCustomProf(list: string[], index: number): void {
    list.splice(index, 1);
  }

  // ---------------------------------------------------------------------------
  // Skill picker helpers (identical to monster form)
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
      skillGroup.patchValue({ selected: true, bonus: null });
    }
    this.pendingSkillName = '';
  }

  removeSkillEntry(skillName: string): void {
    const skillGroup = this.skills.get(skillName) as FormGroup;
    if (skillGroup) {
      skillGroup.patchValue({ selected: false, bonus: null });
    }
  }

  isSkillSelected(skillName: string): boolean {
    return this.skills.get(skillName)?.get('selected')?.value === true;
  }

  getSkillBonus(skillName: string): number | null {
    return this.skills.get(skillName)?.get('bonus')?.value ?? null;
  }

  updateSkillBonus(skillName: string, bonus: number | null): void {
    this.skills.get(skillName)?.patchValue({ bonus });
  }

  get selectedSkillNames(): string[] {
    return SKILL_NAMES.filter(s => this.isSkillSelected(s));
  }

  get availableSkillNames(): string[] {
    return SKILL_NAMES.filter(s => !this.isSkillSelected(s));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Collect the selected labels from a boolean FormArray as a string array. */
  private selectedLabels(array: FormArray, labels: readonly string[]): string[] {
    return labels
      .filter((_, i) => array.at(i).value === true);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  cancel(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
    this.router.navigate([returnUrl]);
  }
}

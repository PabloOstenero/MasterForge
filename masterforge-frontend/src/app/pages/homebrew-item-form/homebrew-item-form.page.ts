import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonButton, IonSpinner,
  IonInput, IonTextarea,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All 15 valid D&D 5e item type categories. */
export const ITEM_TYPES = [
  'Weapon', 'Armor', 'Shield', 'Potion', 'Wondrous Item',
  'Ring', 'Rod', 'Staff', 'Wand', 'Ammunition',
  'Adventuring Gear', 'Tool', 'Mount', 'Vehicle', 'Treasure',
] as const;

/** Magical item types that may have charges, attunement, and special abilities. */
export const MAGICAL_ITEM_TYPES = [
  'Wondrous Item', 'Ring', 'Rod', 'Staff', 'Wand',
] as const;

/** All valid D&D 5e item rarity tiers. */
export const ITEM_RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact',
] as const;

/** All D&D 5e damage types. */
export const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
] as const;

/** All D&D 5e weapon property tags. */
export const WEAPON_PROPERTIES = [
  'Finesse', 'Versatile', 'Thrown', 'Range', 'Two-Handed',
  'Light', 'Heavy', 'Reach', 'Loading', 'Special', 'Ammunition',
] as const;

/** Valid magical attack/damage bonus values. */
export const MAGICAL_BONUSES = [0, 1, 2, 3] as const;

/** Standard polyhedral die types. */
export const DIE_TYPES = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const;

/** Armor weight categories. */
export const ARMOR_CATEGORIES = ['Light', 'Medium', 'Heavy'] as const;

/** Ability score keys used for weapon attack/damage rolls. */
export const ABILITY_STATS = ['str', 'dex'] as const;

/** Structured recharge options — replaces the old free-text field. */
export const RECHARGE_OPTIONS = [
  { value: 'SHORT_REST', label: 'Descanso Corto' },
  { value: 'LONG_REST',  label: 'Descanso Largo' },
  { value: 'MANUAL',     label: 'Manual' },
] as const;

import { FeatureEntry } from '../../models/homebrew.models';

/** Form values for the weapon properties sub-group. */
export interface WeaponFormValues {
  damageDiceCount: number | null;
  damageDieType:   string;
  damageBonus:     number | null;
  damageType: boolean[];       // Array of 13 booleans (single-select)
  weaponProperties: boolean[]; // Array of 11 booleans (multi-select)
  rangeNormal: string;
  rangeLong: string;
  versatileDiceCount: number | null;
  versatileDieType:   string;
  stat: string;
  magicalBonus: number;
  attackBonus: number | null;
}

/** Form values for the armor properties sub-group. */
export interface ArmorFormValues {
  armorCategory: string;
  baseAc: number;
  dexBonus: boolean;
  dexLimit: number | null;
  stealthDisadvantage: boolean;
  strengthRequirement: number | null;
  magicalBonus: number;
}

/** Form values for the shield properties sub-group. */
export interface ShieldFormValues {
  acBonus: number;
  magicalBonus: number;
}

/** Form values for the potion properties sub-group. */
export interface PotionFormValues {
  healingDiceCount: number | null;
  healingDieType:   string;
  healingAmount: number | null;
  effectDescription: string;
}

/** Form values for the magical item properties sub-group. */
export interface MagicalFormValues {
  charges: number | null;
  recharge: string;
  rechargeDiceCount: number | null;
  rechargeDieType: string;
  rechargeBonus: number | null;
  attunementBy: string;
}

/** Form values for the ammunition properties sub-group. */
export interface AmmunitionFormValues {
  damageBonus: number | null;
  magicalBonus: number;
}

/** Form values for the general gear properties sub-group. */
export interface GearFormValues {
  gearDescription: string;
  valueGp: number | null;
}

/** Form values for the buffs (ASI/HP) properties sub-group. */
export interface BuffFormValues {
  bonusStr: number | null;
  bonusDex: number | null;
  bonusCon: number | null;
  bonusInt: number | null;
  bonusWis: number | null;
  bonusCha: number | null;
  overrideStr: number | null;
  overrideDex: number | null;
  overrideCon: number | null;
  overrideInt: number | null;
  overrideWis: number | null;
  overrideCha: number | null;
  bonusMaxHp: number | null;
}

// ---------------------------------------------------------------------------
// Pure serialization function
// ---------------------------------------------------------------------------

/**
 * Builds the `properties` map from the individual form values.
 *
 * Rules:
 * - Only keys relevant to the selected `itemType` are included.
 * - Optional string fields with value `''` and optional numeric fields with
 *   value `null` or `undefined` are omitted.
 * - Boolean fields (`dexBonus`, `stealthDisadvantage`) are always included
 *   when their section is active, even if `false`.
 * - `damageType` chip: the single selected `DAMAGE_TYPES[i]` string, or `''` if none.
 * - `weaponProperties` chips: comma-separated string of selected labels, or `''` if none.
 *
 * This function is exported so it can be tested without mounting the component.
 */
export function buildItemProperties(
  itemType: string,
  weapon: WeaponFormValues,
  armor: ArmorFormValues,
  shield: ShieldFormValues,
  potion: PotionFormValues,
  magical: MagicalFormValues,
  ammunition: AmmunitionFormValues,
  gear: GearFormValues,
  buffs: BuffFormValues,
  specialAbilities: FeatureEntry[],
  // Shared fields always stored regardless of type
  rarity?: string,
  valueGp?: number | null,
  description?: string,
  requiresAttunement?: boolean,
): Record<string, any> {
  const props: Record<string, any> = {};

  /** Helper: add a key only if the value is not null, undefined, or empty string. */
  const addOptional = (key: string, value: any): void => {
    if (value !== null && value !== undefined && value !== '') {
      props[key] = value;
    }
  };

  // ── Shared fields — always stored ─────────────────────────────────────────
  addOptional('rarity', rarity);
  addOptional('valueGp', valueGp);
  addOptional('description', description);
  if (requiresAttunement) props['requiresAttunement'] = true;

  if (itemType === 'Weapon') {
    // Serialize damageType chip (single-select)
    const damageTypeIndex = (weapon.damageType ?? []).findIndex((v) => v === true);
    const damageTypeValue = damageTypeIndex >= 0 ? [DAMAGE_TYPES[damageTypeIndex]] : [];

    // Serialize weaponProperties chips (multi-select)
    const weaponPropertiesValue = (weapon.weaponProperties ?? [])
      .map((selected, i) => (selected ? (WEAPON_PROPERTIES[i] as string) : null))
      .filter((v): v is NonNullable<typeof v> => v !== null);

    // Always include core weapon keys
    addOptional('damageDiceCount', weapon.damageDiceCount);
    addOptional('damageDieType',   weapon.damageDieType);
    addOptional('damageBonus',     weapon.damageBonus);
    props['damageType'] = damageTypeValue;
    props['weaponProperties'] = weaponPropertiesValue;
    addOptional('rangeNormal', weapon.rangeNormal);
    addOptional('rangeLong', weapon.rangeLong);
    addOptional('versatileDiceCount', weapon.versatileDiceCount);
    addOptional('versatileDieType',   weapon.versatileDieType);
    props['stat'] = weapon.stat || 'str';
    props['magicalBonus'] = weapon.magicalBonus ?? 0;
    addOptional('attackBonus', weapon.attackBonus);
    if (specialAbilities.length > 0) props['specialAbilities'] = specialAbilities;

  } else if (itemType === 'Armor') {
    addOptional('armorCategory', armor.armorCategory);
    props['baseAc'] = armor.baseAc;
    props['dexBonus'] = armor.dexBonus;           // always include boolean
    addOptional('dexLimit', armor.dexLimit);
    props['stealthDisadvantage'] = armor.stealthDisadvantage; // always include boolean
    addOptional('strengthRequirement', armor.strengthRequirement);
    props['magicalBonus'] = armor.magicalBonus ?? 0;
    if (specialAbilities.length > 0) props['specialAbilities'] = specialAbilities;

  } else if (itemType === 'Shield') {
    props['acBonus'] = shield.acBonus;
    props['magicalBonus'] = shield.magicalBonus ?? 0;
    if (specialAbilities.length > 0) props['specialAbilities'] = specialAbilities;

  } else if (itemType === 'Potion') {
    addOptional('healingDiceCount', potion.healingDiceCount);
    addOptional('healingDieType',   potion.healingDieType);
    addOptional('healingAmount', potion.healingAmount);
    addOptional('effectDescription', potion.effectDescription);

  } else if ((MAGICAL_ITEM_TYPES as readonly string[]).includes(itemType)) {
    addOptional('charges', magical.charges);
    addOptional('recharge', magical.recharge);
    addOptional('rechargeDiceCount', magical.rechargeDiceCount);
    addOptional('rechargeDieType', magical.rechargeDieType);
    addOptional('rechargeBonus', magical.rechargeBonus);
    addOptional('attunementBy', magical.attunementBy);
    if (specialAbilities.length > 0) {
      props['specialAbilities'] = specialAbilities;
    }

  } else if (itemType === 'Ammunition') {
    addOptional('damageBonus', ammunition.damageBonus);
    props['magicalBonus'] = ammunition.magicalBonus ?? 0;

  } else {
    addOptional('gearDescription', gear.gearDescription);
    addOptional('valueGp', gear.valueGp);
  }

  // ── Stat & HP Buffs (Applicable to any type, but usually magical) ─────────
  if (buffs) {
    addOptional('bonusStr', buffs.bonusStr);
    addOptional('bonusDex', buffs.bonusDex);
    addOptional('bonusCon', buffs.bonusCon);
    addOptional('bonusInt', buffs.bonusInt);
    addOptional('bonusWis', buffs.bonusWis);
    addOptional('bonusCha', buffs.bonusCha);
    addOptional('overrideStr', buffs.overrideStr);
    addOptional('overrideDex', buffs.overrideDex);
    addOptional('overrideCon', buffs.overrideCon);
    addOptional('overrideInt', buffs.overrideInt);
    addOptional('overrideWis', buffs.overrideWis);
    addOptional('overrideCha', buffs.overrideCha);
    addOptional('bonusMaxHp', buffs.bonusMaxHp);
  }

  return props;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-homebrew-item-form',
  templateUrl: './homebrew-item-form.page.html',
  styleUrls: ['./homebrew-item-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonButton, IonSpinner,
    IonInput, IonTextarea,
  ],
})
export class HomebrewItemFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Edit mode — set when route has an :id param */
  editMode = false;
  editId: string | null = null;

  // Exposed constants for template use
  readonly itemTypes = ITEM_TYPES;
  readonly itemRarities = ITEM_RARITIES;
  readonly damageTypes = DAMAGE_TYPES;
  readonly dieTypes = DIE_TYPES;
  readonly weaponProperties = WEAPON_PROPERTIES;
  readonly magicalBonuses = MAGICAL_BONUSES;
  readonly armorCategories = ARMOR_CATEGORIES;
  readonly abilityStats = ABILITY_STATS;
  readonly rechargeOptions = RECHARGE_OPTIONS;

  get isManagerOrAdmin(): boolean {
    const user = this._authService.getCurrentUser();
    return user?.role === 'MANAGER' || user?.role === 'ADMIN';
  }

  get isPro(): boolean {
    return this._authService.isPro();
  }

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
    private route: ActivatedRoute,
    private _authService: AuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // Computed type-helper getters
  // ---------------------------------------------------------------------------

  get selectedType(): string {
    return this.form?.get('type')?.value ?? '';
  }

  get isWeapon(): boolean {
    return this.selectedType === 'Weapon';
  }

  get isArmor(): boolean {
    return this.selectedType === 'Armor';
  }

  get isShield(): boolean {
    return this.selectedType === 'Shield';
  }

  get isPotion(): boolean {
    return this.selectedType === 'Potion';
  }

  get isMagicalItem(): boolean {
    return (MAGICAL_ITEM_TYPES as readonly string[]).includes(this.selectedType);
  }

  get isAmmunition(): boolean {
    return this.selectedType === 'Ammunition';
  }

  get isGeneralGear(): boolean {
    return ['Adventuring Gear', 'Tool', 'Mount', 'Vehicle', 'Treasure'].includes(this.selectedType);
  }

  get showsSpecialAbilities(): boolean {
    return this.isMagicalItem || this.isWeapon || this.isArmor || this.isShield;
  }

  // ---------------------------------------------------------------------------
  // FormArray getter
  // ---------------------------------------------------------------------------

  get abilities(): FormArray {
    return this.form.get('abilities') as FormArray;
  }

  // ---------------------------------------------------------------------------
  // Chip helpers
  // ---------------------------------------------------------------------------

  get weaponDamageTypeIndex(): number {
    const arr = this.form.get('weapon.damageType') as FormArray;
    return arr ? arr.controls.findIndex((c) => c.value === true) : -1;
  }

  selectDamageType(index: number): void {
    const arr = this.form.get('weapon.damageType') as FormArray;
    if (!arr) return;
    arr.controls.forEach((ctrl, i) => ctrl.setValue(i === index ? !ctrl.value : false));
  }

  get weaponPropertiesArray(): FormArray {
    return this.form.get('weapon.weaponProperties') as FormArray;
  }

  toggleWeaponProperty(index: number): void {
    const arr = this.weaponPropertiesArray;
    if (!arr) return;
    const ctrl = arr.at(index);
    ctrl.setValue(!ctrl.value);
  }

  // ---------------------------------------------------------------------------
  // Special abilities FormArray helpers
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
  // Backward-compat helpers — parse old free-text dice strings like "2d6+3"
  // ---------------------------------------------------------------------------

  private parseDiceCount(dice: string | undefined): number | null {
    if (!dice) return null;
    const m = dice.match(/^(\d+)d/i);
    return m ? parseInt(m[1], 10) : null;
  }

  private parseDieType(dice: string | undefined): string | null {
    if (!dice) return null;
    const m = dice.match(/(d\d+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  private parseDiceBonus(dice: string | undefined): number | null {
    if (!dice) return null;
    const m = dice.match(/[+-]\s*(\d+)$/);
    return m ? parseInt(m[0].replace(/\s/g, ''), 10) : null;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.form = this.fb.group({
      // Core fields
      name:               ['', Validators.required],
      type:               ['', Validators.required],
      weight:             [null, [Validators.required, Validators.min(0)]],
      price:              [null, Validators.min(0)],
      rarity:             [''],
      valueGp:            [null, Validators.min(0)],
      description:        [''],
      requiresAttunement: [false],
      isOfficial:         [this.route.snapshot.queryParamMap?.get('from') === 'official'],

      // Weapon sub-group
      weapon: this.fb.group({
        damageDiceCount:  [null, Validators.min(1)],
        damageDieType:    ['d6'],
        damageBonus:      [null],
        damageType:       this.fb.array(DAMAGE_TYPES.map(() => false)),
        weaponProperties: this.fb.array(WEAPON_PROPERTIES.map(() => false)),
        rangeNormal:      [''],
        rangeLong:        [''],
        versatileDiceCount: [null, Validators.min(1)],
        versatileDieType:   ['d8'],
        stat:             ['str'],
        magicalBonus:     [0],
        attackBonus:      [null],
      }),

      // Armor sub-group
      armor: this.fb.group({
        armorCategory:      ['Light'],
        baseAc:             [null, Validators.min(1)],
        dexBonus:           [true],
        dexLimit:           [null],
        stealthDisadvantage:[false],
        strengthRequirement:[null],
        magicalBonus:       [0],
      }),

      // Shield sub-group
      shield: this.fb.group({
        acBonus:      [2, Validators.min(0)],
        magicalBonus: [0],
      }),

      // Potion sub-group
      potion: this.fb.group({
        healingDiceCount:  [null, Validators.min(1)],
        healingDieType:    ['d4'],
        healingAmount:     [null],
        effectDescription: [''],
      }),

      // Magical item sub-group
      magical: this.fb.group({
        charges:           [null, Validators.min(0)],
        recharge:          [''],
        rechargeDiceCount: [null, Validators.min(1)],
        rechargeDieType:   ['d4'],
        rechargeBonus:     [null],
        attunementBy:      [''],
      }),

      // Ammunition sub-group
      ammunition: this.fb.group({
        damageBonus:  [null],
        magicalBonus: [0],
      }),

      // General gear sub-group
      gear: this.fb.group({
        gearDescription: [''],
        valueGp:         [null, Validators.min(0)],
      }),

      // Buffs (ASI/HP) sub-group
      buffs: this.fb.group({
        bonusStr: [null],
        bonusDex: [null],
        bonusCon: [null],
        bonusInt: [null],
        bonusWis: [null],
        bonusCha: [null],
        overrideStr: [null],
        overrideDex: [null],
        overrideCon: [null],
        overrideInt: [null],
        overrideWis: [null],
        overrideCha: [null],
        bonusMaxHp:  [null],
      }),

      // Special abilities FormArray
      abilities: this.fb.array([]),
    });

    // Detect edit mode from route param
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.editId = id;
      this.loadItemForEdit(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit mode loader
  // ---------------------------------------------------------------------------

  private loadItemForEdit(id: string): void {
    this.homebrewService.getItem(id).subscribe({
      next: (item: any) => {
        const p = item.properties ?? {};

        // Patch core fields
        this.form.patchValue({
          name:               item.name ?? '',
          type:               item.type ?? '',
          weight:             item.weight ?? null,
          price:              item.price ?? null,
          rarity:             p.rarity ?? '',
          valueGp:            p.valueGp ?? null,
          description:        p.description ?? '',
          requiresAttunement: p.requiresAttunement ?? false,
          isOfficial:         item.author === null || !item.author,
        });

        // Patch sub-groups from properties
        this.form.get('weapon')?.patchValue({
          damageDiceCount:  p.damageDiceCount ?? this.parseDiceCount(p.damageDice),
          damageDieType:    p.damageDieType   ?? this.parseDieType(p.damageDice) ?? 'd6',
          damageBonus:      p.damageBonus     ?? this.parseDiceBonus(p.damageDice),
          rangeNormal:      p.rangeNormal ?? '',
          rangeLong:        p.rangeLong ?? '',
          versatileDiceCount: p.versatileDiceCount ?? this.parseDiceCount(p.versatileDice),
          versatileDieType:   p.versatileDieType   ?? this.parseDieType(p.versatileDice) ?? 'd8',
          stat:             p.stat ?? 'str',
          magicalBonus:     p.magicalBonus ?? 0,
          attackBonus:      p.attackBonus ?? null,
        });

        // Restore damageType chip state
        if (p.damageType) {
          const dtArr = this.form.get('weapon.damageType') as FormArray;
          const val = Array.isArray(p.damageType) ? p.damageType[0] : p.damageType;
          const idx = DAMAGE_TYPES.indexOf(val as any);
          if (idx >= 0) dtArr.at(idx).setValue(true);
        }

        // Restore weaponProperties chip state
        if (p.weaponProperties) {
          const wpArr = this.form.get('weapon.weaponProperties') as FormArray;
          const selected = Array.isArray(p.weaponProperties) 
            ? p.weaponProperties 
            : (p.weaponProperties as string).split(',').map((s: string) => s.trim());
          WEAPON_PROPERTIES.forEach((prop, i) => {
            if (selected.includes(prop)) wpArr.at(i).setValue(true);
          });
        }

        this.form.get('armor')?.patchValue({
          armorCategory:       p.armorCategory ?? 'Light',
          baseAc:              p.baseAc ?? null,
          dexBonus:            p.dexBonus ?? true,
          dexLimit:            p.dexLimit ?? null,
          stealthDisadvantage: p.stealthDisadvantage ?? false,
          strengthRequirement: p.strengthRequirement ?? null,
          magicalBonus:        p.magicalBonus ?? 0,
        });

        this.form.get('shield')?.patchValue({
          acBonus:      p.acBonus ?? 2,
          magicalBonus: p.magicalBonus ?? 0,
        });

        this.form.get('potion')?.patchValue({
          healingDiceCount:  p.healingDiceCount ?? this.parseDiceCount(p.healingDice),
          healingDieType:    p.healingDieType   ?? this.parseDieType(p.healingDice) ?? 'd4',
          healingAmount:     p.healingAmount ?? null,
          effectDescription: p.effectDescription ?? '',
        });

        this.form.get('magical')?.patchValue({
          charges:           p.charges ?? null,
          recharge:          p.recharge ?? '',
          rechargeDiceCount: p.rechargeDiceCount ?? null,
          rechargeDieType:   p.rechargeDieType ?? 'd4',
          rechargeBonus:     p.rechargeBonus ?? null,
          attunementBy:      p.attunementBy ?? '',
        });

        this.form.get('ammunition')?.patchValue({
          damageBonus:  p.damageBonus ?? null,
          magicalBonus: p.magicalBonus ?? 0,
        });

        this.form.get('gear')?.patchValue({
          gearDescription: p.gearDescription ?? '',
          valueGp:         p.valueGp ?? null,
        });

        this.form.get('buffs')?.patchValue({
          bonusStr: p.bonusStr ?? null,
          bonusDex: p.bonusDex ?? null,
          bonusCon: p.bonusCon ?? null,
          bonusInt: p.bonusInt ?? null,
          bonusWis: p.bonusWis ?? null,
          bonusCha: p.bonusCha ?? null,
          overrideStr: p.overrideStr ?? null,
          overrideDex: p.overrideDex ?? null,
          overrideCon: p.overrideCon ?? null,
          overrideInt: p.overrideInt ?? null,
          overrideWis: p.overrideWis ?? null,
          overrideCha: p.overrideCha ?? null,
          bonusMaxHp:  p.bonusMaxHp ?? null,
        });

        // Restore special abilities
        if (Array.isArray(p.specialAbilities)) {
          p.specialAbilities.forEach((a: any) => {
            this.abilities.push(this.fb.group({
              name:        [a.name ?? '', Validators.required],
              description: [a.description ?? '', Validators.required],
            }));
          });
        }
      },
      error: () => {
        this.error = 'No se pudo cargar el objeto para editar.';
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Submit / Cancel
  // ---------------------------------------------------------------------------

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;

    const v = this.form.value;

    const properties = buildItemProperties(
      v.type,
      v.weapon,
      v.armor,
      v.shield,
      v.potion,
      v.magical,
      v.ammunition,
      v.gear,
      v.buffs,
      v.abilities ?? [],
      v.rarity ?? '',
      v.valueGp ?? null,
      v.description ?? '',
      v.requiresAttunement ?? false,
    );

    const dto = {
      name:       v.name,
      type:       v.type,
      weight:     v.weight,
      price:      this.isPro ? (v.price ?? 0) : 0,
      properties,
      isOfficial: !!v.isOfficial,
      authorId:   '',
    };

    const request$ = this.editMode && this.editId
      ? this.homebrewService.updateItem(this.editId, dto)
      : this.homebrewService.createItem(dto);

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
            ? 'Error al actualizar el objeto. Por favor, inténtalo de nuevo.'
            : 'Error al crear el objeto. Por favor, inténtalo de nuevo.');
      },
    });
  }

  cancel(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('from') === 'official' ? '/official-content' : '/homebrew';
    this.router.navigate([returnUrl]);
  }
}

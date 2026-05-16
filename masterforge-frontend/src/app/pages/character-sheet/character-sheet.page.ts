import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonBadge, IonList, IonIcon, IonButton, IonFooter, IonBackButton, IonButtons,
  AlertController, ActionSheetController, ModalController, IonSearchbar, IonModal, IonCheckbox, ToastController
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';
import { addIcons } from 'ionicons';
import { statsChart, sparkles, shield, briefcase, trash, add, addCircleOutline, checkmarkCircle, trashOutline, syncOutline, book, bookOutline, settingsOutline, trendingUpOutline, removeCircleOutline, refreshOutline, sparklesOutline, flaskOutline, hammerOutline, flashOutline, addOutline } from 'ionicons/icons';
import { FeatureChoicePickerComponent } from '../../components/feature-choice-picker/feature-choice-picker.component';
import { getProficiencyBonus, getModifier, calculatePassive, calculateMulticlassHp } from '../../utils/dnd-utils';

export const DND_SKILLS = [
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

@Component({
  selector: 'app-character-sheet',
  templateUrl: './character-sheet.page.html',
  styleUrls: ['./character-sheet.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonSegment, IonSegmentButton, IonLabel, IonGrid, IonRow, IonCol,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonBadge, IonList,
    IonIcon, IonButton, IonFooter, IonBackButton, IonButtons, IonSearchbar, IonModal,
    IonCheckbox, FeatureChoicePickerComponent
  ],
  encapsulation: ViewEncapsulation.None // Re-enabled to allow styling the Alert pop-ups
})
export class CharacterSheetPage implements OnInit {

  // Controls which tab we are viewing (Stats, Inventory, Magic)
  currentTab: string = 'stats';

  // Skills dictionary
  skills = DND_SKILLS;

  statLabels: any = { str: 'FU', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

  // Case-insensitive item type check to support homebrew items with varying type casing
  itemIs(item: any, ...types: string[]): boolean {
    const t = (item.type || '').toUpperCase();
    return types.some(type => type.toUpperCase() === t);
  }

  // Returns true if the character is wearing heavy armor that imposes stealth disadvantage
  get hasStealthDisadvantage(): boolean {
    return (this.pj.inventory || []).some(
      (item: any) => item.equipped && this.itemIs(item, 'ARMOR') && item.properties?.stealthDisadvantage === true
    );
  }

  /**
   * Returns –10 if the character's STR is below the equipped armor's strengthRequirement,
   * or 0 if there is no penalty. Implements D&D 5e PHB rule (pg. 144).
   */
  get armorStrengthPenalty(): number {
    const str = this.pj.stats?.str ?? 10;
    const penaltyArmor = (this.pj.inventory || []).find(
      (item: any) =>
        item.equipped &&
        this.itemIs(item, 'ARMOR') &&
        typeof item.properties?.strengthRequirement === 'number' &&
        str < item.properties.strengthRequirement
    );
    return penaltyArmor ? -10 : 0;
  }

  /** Effective movement speed after applying any armor strength penalty. */
  get effectiveSpeed(): number {
    return (this.pj.speed || 30) + this.armorStrengthPenalty;
  }

  // ── Magic Item Charges Engine ─────────────────────────────────────────────

  /** Stable key for storing this item's charge count in resourceCounters. */
  private getItemChargeKey(item: any): string {
    return `__item_charge_${item.id}`;
  }

  /** Returns true for items that have a charge pool defined. */
  hasMagicCharges(item: any): boolean {
    return typeof item.properties?.charges === 'number' && item.properties.charges > 0;
  }

  /** Current charges — reads from resourceCounters, falls back to max on first load. */
  getItemCharges(item: any): number {
    const key = this.getItemChargeKey(item);
    const max = item.properties?.charges ?? 0;
    return this.pj.resourceCounters[key] ?? max;
  }

  /** Spends one charge and persists. */
  useItemCharge(item: any): void {
    const current = this.getItemCharges(item);
    if (current <= 0) return;
    const key = this.getItemChargeKey(item);
    this.pj.resourceCounters[key] = current - 1;
    if (this.characterId) {
      this.apiService.updateResourceCounters(this.characterId, this.pj.resourceCounters).subscribe();
    }
  }

  /** Increments charges by 1 (clamped to max) and persists. */
  incrementItemCharge(item: any): void {
    const key = this.getItemChargeKey(item);
    const max = item.properties?.charges ?? 0;
    const current = this.getItemCharges(item);
    if (current >= max) return;
    
    this.pj.resourceCounters[key] = current + 1;
    if (this.characterId) {
      this.apiService.updateResourceCounters(this.characterId, this.pj.resourceCounters).subscribe();
    }
  }

  /** Calculates the recovered amount based on structured dice fields. */
  rollRecharge(item: any, maxCharges: number): number {
    const props = item.properties || {};
    const count = props.rechargeDiceCount;
    const bonus = props.rechargeBonus || 0;
    
    // If no dice and no bonus are specified, assume "restore all"
    if (!count && !bonus) return maxCharges;
    
    let total = 0;
    if (count && props.rechargeDieType) {
      const faces = parseInt(props.rechargeDieType.replace('d', ''), 10) || 0;
      for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * faces) + 1;
      }
    }
    
    return total + bonus;
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: 'dark'
    });
    toast.present();
  }

  // We initialize with default values so that the screen doesn't break while waiting for the backend
  pj: any = {
    name: 'Cargando...',
    level: 0,
    dndClass: '...',
    subclass: '...',
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    bonusMaxHp: 0,
    armorClass: 0,
    speed: 0,
    proficiencyBonus: 0, // Nuevo
    initiative: 0,       // Nuevo
    passivePerception: 0, // Nuevo
    hitDiceTotal: 0,
    hitDiceSpent: 0,
    hitDieType: 8,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    inventory: [],
    spells: [],
    traits: [],
    features: [],
    proficiencies: {
      armor: [],
      weapons: [],
      tools: [],
      languages: []
    },
    background: '...',
    alignment: '...',
    xp: 0,
    deathSaves: { success: 0, failure: 0 },
    skillProficiencies: {}, // Matches the Map structure from the backend
    savingThrowsProficiencies: {},
    spellSlots: {},
    resourceCounters: {},
    preparationStyle: 'KNOWN',
    naturalWeapons: [],
    raceName: '...',
    creatureType: 'Humanoide'
  };

  rawCharacter: any = null; // Store raw data for level-up calculations

  // Level Up State
  isLevelUpModalOpen = false;
  levelUpData: any = {
    hpBonus: 0,
    statChanges: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    choicesJson: {},
    selectedSpells: [],
    newClassId: null,
    classToLevelId: null
  };

  levelUpMode: 'EXISTING' | 'MULTICLASS' = 'EXISTING';
  allClasses: any[] = [];
  classesLoading = false;

  levelUpNewFeatures: any[] = [];
  levelUpAvailableSpells: any[] = [];
  levelUpSubclasses: any[] = [];
  showSubclassPicker = false;
  spellsToChoose: number = 0;
  cantripsToChoose: number = 0;
  resourcePools: any[] = [];
  damageResistances: string[] = [];
  damageImmunities: string[] = [];
  conditionImmunities: string[] = [];
  senses: string[] = [];
  private characterId: string | null = null;

  // Detail Modal State
  isDetailModalOpen = false;
  selectedDetail: any = null;
  detailType: 'SPELL' | 'ITEM' | 'FEATURE' = 'ITEM';

  // Inyectamos el servicio en el constructor
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    addIcons({
      'stats-chart': statsChart,
      'sparkles': sparkles,
      'shield': shield,
      'briefcase': briefcase,
      'trash': trash,
      'add': add,
      'add-outline': addOutline,
      'add-circle-outline': addCircleOutline,
      'trash-outline': trashOutline,
      'sync-outline': syncOutline,
      'book': book,
      'book-outline': bookOutline,
      'settings-outline': settingsOutline,
      'trending-up-outline': trendingUpOutline,
      'remove-circle-outline': removeCircleOutline,
      'refresh-outline': refreshOutline,
      'sparkles-outline': sparklesOutline,
      'checkmark-circle': checkmarkCircle,
      'flask-outline': flaskOutline,
      'hammer-outline': hammerOutline,
      'flash-outline': flashOutline
    });
  }

  ngOnInit() {
    // ⚠️ ATENCIÓN: Pega aquí el ID larguísimo (UUID) de un personaje que hayas creado en Postman
    const routeId = this.route.snapshot.paramMap.get('id');

    // Solo llamamos a la base de datos si hemos puesto un ID válido
    if (routeId) {
      console.log("Opening character sheet for ID:", routeId);
      this.characterId = routeId; // Store the ID for later updates
      this.loadCharacter(routeId);
    } else {
      console.error("No character ID provided in the URL");
    }

    this.loadAllClasses();
  }

  loadAllClasses() {
    this.classesLoading = true;
    this.apiService.getClasses().subscribe({
      next: (data) => {
        this.allClasses = data;
        this.classesLoading = false;
      },
      error: () => {
        this.classesLoading = false;
      }
    });
  }

  // Helper: Calculate effective stats and values considering item bonuses/overrides
  private calculateEffectiveValues(data: any): any {
    const stats = {
      str: data.baseStr || 10,
      dex: data.baseDex || 10,
      con: data.baseCon || 10,
      int: data.baseInt || 10,
      wis: data.baseWis || 10,
      cha: data.baseCha || 10
    };
    let itemBonusMaxHp = 0;

    // Apply Feature-based Stat Modifiers
    const allFeatures = this.getAllCharacterFeatures(data);
    allFeatures.forEach(f => {
      const sm = f.properties?.statModifiers;
      if (sm) {
        if (typeof sm.str === 'number') stats.str += sm.str;
        if (typeof sm.dex === 'number') stats.dex += sm.dex;
        if (typeof sm.con === 'number') stats.con += sm.con;
        if (typeof sm.int === 'number') stats.int += sm.int;
        if (typeof sm.wis === 'number') stats.wis += sm.wis;
        if (typeof sm.cha === 'number') stats.cha += sm.cha;
      }
    });
    
    const equipped = (data.inventory || []).filter((s: any) => s.equipped);

    equipped.forEach((slot: any) => {
      const props = slot.item.properties || {};
      
      // 1. Stat Overrides (highest value takes precedence)
      if (typeof props.overrideStr === 'number') stats.str = Math.max(stats.str, props.overrideStr);
      if (typeof props.overrideDex === 'number') stats.dex = Math.max(stats.dex, props.overrideDex);
      if (typeof props.overrideCon === 'number') stats.con = Math.max(stats.con, props.overrideCon);
      if (typeof props.overrideInt === 'number') stats.int = Math.max(stats.int, props.overrideInt);
      if (typeof props.overrideWis === 'number') stats.wis = Math.max(stats.wis, props.overrideWis);
      if (typeof props.overrideCha === 'number') stats.cha = Math.max(stats.cha, props.overrideCha);

      // 2. Stat Bonuses (additive)
      if (typeof props.bonusStr === 'number') stats.str += props.bonusStr;
      if (typeof props.bonusDex === 'number') stats.dex += props.bonusDex;
      if (typeof props.bonusCon === 'number') stats.con += props.bonusCon;
      if (typeof props.bonusInt === 'number') stats.int += props.bonusInt;
      if (typeof props.bonusWis === 'number') stats.wis += props.bonusWis;
      if (typeof props.bonusCha === 'number') stats.cha += props.bonusCha;

      // 3. Max HP Bonuses
      if (typeof props.bonusMaxHp === 'number') itemBonusMaxHp += props.bonusMaxHp;
    });

    return { stats, itemBonusMaxHp };
  }

  get currentLevelUpHitDie(): number {
    if (this.levelUpMode === 'MULTICLASS' && this.levelUpData.newClassId) {
      const cls = this.allClasses.find(c => c.id === this.levelUpData.newClassId);
      return typeof cls?.hitDie === 'string' ? parseInt(cls.hitDie.replace('d', ''), 10) : (cls?.hitDie || 8);
    }
    if (this.levelUpMode === 'EXISTING' && this.levelUpData.classToLevelId) {
       // Find in character's existing classes
       if (this.rawCharacter?.dndClass?.id === this.levelUpData.classToLevelId) {
         const hd = this.rawCharacter.dndClass.hitDie;
         return typeof hd === 'string' ? parseInt(hd.replace('d', ''), 10) : (hd || 8);
       }
       const cl = (this.rawCharacter?.classLevels || []).find((l: any) => l.dndClass.id === this.levelUpData.classToLevelId);
       const hd = cl?.dndClass?.hitDie;
       return typeof hd === 'string' ? parseInt(hd.replace('d', ''), 10) : (hd || 8);
    }
    return typeof this.pj.hitDieType === 'string' ? parseInt(this.pj.hitDieType.replace('d', ''), 10) : (this.pj.hitDieType || 8);
  }

  get currentLevelUpAverageHp(): number {
    return Math.floor(this.currentLevelUpHitDie / 2) + 1;
  }

  protected Math = Math;

  // --- BACKEND CONNECTION LOGIC ---
  loadCharacter(id: string) {
    this.apiService.getCharacter(id).subscribe({
      next: (data) => {
        this.rawCharacter = data;
        console.log('Raw data from DB:', data);

        // --- CÁLCULO DINÁMICO DE VALORES (ITEMS + RAZA) ---
        const effective = this.calculateEffectiveValues(data);
        const effectiveStats = effective.stats;
        const itemMaxHp = effective.itemBonusMaxHp;

        const dexMod = getModifier(effectiveStats.dex);
        const wisMod = getModifier(effectiveStats.wis);
        const conMod = getModifier(effectiveStats.con);

        // Retroactive HP from CON items (D&D 5e Rule: Mod change * level)
        const baseCon = data.baseCon || 10;
        const baseConMod = getModifier(baseCon);
        const conDiff = conMod - baseConMod;
        const retroactiveConHp = conDiff * (data.level || 1);

        // Cálculo del Bono de Competencia
        const proficiencyBonus = getProficiencyBonus(data.level);

        // --- CÁLCULO DINÁMICO DE CA (REGLAS 5E) ---
        // --- CÁLCULO DINÁMICO DE CA (MOTOR DE REGLAS 5E) ---
        const finalAc = this.calculateEffectiveAC(data, effectiveStats);
        const inventorySlots = data.inventory || [];

        // Cálculo de Percepción Pasiva
        const isPerceptionProficient = !!data.skillProficiencies?.perception;
        const passivePerception = calculatePassive(wisMod, proficiencyBonus, isPerceptionProficient);

        // Merge saving throw proficiencies (Class + Character)
        const classSaves = data.dndClass?.savingThrows || {};
        const charSaves = data.savingThrowsProficiencies || {};
        const mergedSaves = { ...classSaves, ...charSaves };

        // Calculate automated max slots using raw data from DB
        const rawClassFeatures = data.dndClass?.classFeatures || {};
        const autoSlots = this.getAutoSpellSlots(data.level, rawClassFeatures);
        const savedSlots = data.spellSlots || {};
        const mergedSlots: Record<string, any> = {};

        // Merge: Take 'max' from auto, 'available' from saved (if within bounds)
        Object.keys(autoSlots).forEach(key => {
          const max = autoSlots[key].max;
          const saved = savedSlots[key];
          const available = (saved && typeof saved === 'object') ? Math.min(saved.available, max) : max;
          mergedSlots[key] = { max, available };
        });

        // Mapeamos los datos de la base de datos a la estructura que espera nuestro HTML
        this.pj = {
          id: data.id,
          name: data.name,
          level: data.level,
          dndClass: data.dndClass?.name || 'Aventurero',
          subclass: data.subclass?.name || 'Sin subclase',
          fullClassName: (data.classLevels && data.classLevels.length > 0) 
            ? data.classLevels.map((cl: any) => `${cl.dndClass.name} ${cl.level}`).join(' / ')
            : `${data.dndClass?.name || 'Aventurero'} ${data.level}`,
          choicesJson: data.choicesJson || {},
          maxHp: data.maxHp ?? 10,
          currentHp: data.currentHp ?? 10,
          tempHp: data.tempHp || 0,
          bonusMaxHp: (data.bonusMaxHp || 0) + itemMaxHp + retroactiveConHp,
          speed: data.speed || 30,
          proficiencyBonus: proficiencyBonus,
          passivePerception: passivePerception,
          initiative: dexMod,
          armorClass: finalAc,
          hitDiceTotal: data.hitDiceTotal || 0,
          deathSaves: { success: 0, failure: 0 },
          stats: effectiveStats,
          baseStats: {
            str: data.baseStr || 10,
            dex: data.baseDex || 10,
            con: data.baseCon || 10,
            int: data.baseInt || 10,
            wis: data.baseWis || 10,
            cha: data.baseCha || 10
          },
          hitDiceSpent: data.hitDiceSpent || 0,
          resourceCounters: data.resourceCounters || {},



          hitDieType: data.dndClass?.hitDie || 8,
          money: {
            cp: data.cp ?? 0,
            sp: data.sp ?? 0,
            ep: data.ep ?? 0,
            gp: data.gp ?? 0,
            pp: data.pp ?? 0
          },
          inventory: data.inventory ? data.inventory.map((slot: any) => ({
            id: slot.id,
            name: slot.item.name,
            type: slot.item.type,
            quantity: slot.quantity,
            equipped: slot.equipped,
            weight: slot.item.weight,
            description: slot.item.properties?.description || slot.item.description || '',
            properties: slot.item.properties || {}
          })) : [],
          spells: data.spells || [],
          traits: [
            ...(data.dndRace?.traits || []),
            ...this.extractInnateSpellsAsFeatures(data.dndRace?.raceFeatures?.innateSpells)
          ].map(t => ({
            ...t,
            selectedOptions: (data.choicesJson?.featureOptions?.[t.name] || [])
          })),
          features: (() => {
            const allFeats: any[] = [];
            // We use classLevels to correctly filter features by the level IN THAT class
            if (data.classLevels && data.classLevels.length > 0) {
              data.classLevels.forEach((cl: any) => {
                const classFeats = [
                  ...(cl.dndClass?.features || []),
                  ...(cl.dndClass?.classFeatures?.features || []),
                  ...this.extractSubclassFeatures(cl.subclass?.subclassFeatures)
                ];
                // Attach class name to features for context-aware mechanics (like Ki points)
                const mapped = classFeats
                  .filter(f => parseInt(f.levelRequired, 10) <= cl.level)
                  .map(f => ({ ...f, _className: cl.dndClass.name }));
                allFeats.push(...mapped);
              });
            } else {
              // Fallback for legacy data/safety: use primary class and total level
              const classFeats = [
                ...(data.dndClass?.features || []),
                ...(data.dndClass?.classFeatures?.features || []),
                ...this.extractSubclassFeatures(data.subclass?.subclassFeatures)
              ];
              const mapped = classFeats
                .filter(f => parseInt(f.levelRequired, 10) <= data.level)
                .map(f => ({ ...f, _className: data.dndClass?.name }));
              allFeats.push(...mapped);
            }
            return allFeats.map(f => {
              let scalingText = '';
              const prog = (f.progression && f.progression.length > 0) ? f.progression : ((f.options as any)?.progression ?? []);
              if (prog && Array.isArray(prog)) {
                const effLevel = f._className ? (data.classLevels?.find((c:any) => c.dndClass.name === f._className)?.level || data.level) : data.level;
                const validProgs = prog.filter((p: any) => p.level <= effLevel).sort((a: any, b: any) => b.level - a.level);
                if (validProgs.length > 0) {
                  const currentProg = validProgs[0];
                  if (currentProg.diceCount && currentProg.diceType) {
                    scalingText = `${currentProg.diceCount}${currentProg.diceType}`;
                  }
                }
              }
              return {
                ...f,
                _scalingText: scalingText,
                selectedOptions: (data.choicesJson?.featureOptions?.[f.name] || [])
              };
            });
          })(),
          proficiencies: {
            armor: this.extractArrayFromClassFeatures(data.dndClass?.classFeatures, 'armorProficiencies'),
            weapons: this.extractArrayFromClassFeatures(data.dndClass?.classFeatures, 'weaponProficiencies'),
            tools: this.extractArrayFromClassFeatures(data.dndClass?.classFeatures, 'toolProficiencies'),
            languages: [
              ...(data.dndRace?.raceFeatures?.languageProficiencies?.fixed ||
                this.extractArrayFromRaceFeatures(data.dndRace?.raceFeatures, 'languages')),
              ...(data.choicesJson?.languages || [])
            ]
          },
          background: data.background || 'Aventurero',
          alignment: data.alignment || 'Neutral',
          xp: data.xp || 0,
          skillProficiencies: data.skillProficiencies || {},
          savingThrowsProficiencies: mergedSaves,
          spellSlots: mergedSlots,
          _rawClassFeatures: data.dndClass?.classFeatures || {},
          _rawRaceFeatures: data.dndRace?.raceFeatures || {},
          preparationStyle: data.dndClass?.classFeatures?.['spellcasting']?.['preparationStyle'] || 'KNOWN',
          knowledgeStyle: data.dndClass?.classFeatures?.['spellcasting']?.['knowledgeStyle'] || 'ALL_LIST',
          naturalWeapons: data.dndRace?.raceFeatures?.naturalWeapons || [],
          raceName: data.dndRace?.name || 'Desconocida',
          creatureType: data.dndRace?.raceFeatures?.creatureType || 'Humanoide'
        };

        this.calculateResourcePools();
        this.calculateAutomatedEffects();
      },
      error: (err) => {
        console.error("Critical error loading character:", err);
        alert("Could not connect to MasterForge database.");
      }
    });
  }

  toggleEquip(slotId: number) {
    if (!this.characterId) return;
    this.apiService.toggleEquip(this.characterId, slotId).subscribe({
      next: (updatedChar) => {
        // Re-load to trigger recalculation of AC and modifiers
        this.loadCharacter(this.characterId!);
      }
    });
  }

  useItem(item: any) {
    if (!this.characterId) return;

    // Differentiate behavior by type
    if (item.type === 'POTION') {
      const healAmount = item.properties?.healingAmount || 5; // Simplified logic
      this.pj.currentHp = Math.min(this.pj.maxHp, this.pj.currentHp + healAmount);
      this.updateCharacterHpOnBackend();
    }

    this.apiService.useItem(this.characterId!, item.id).subscribe({
      next: () => {
        this.loadCharacter(this.characterId!);
      }
    });
  }

  async addItemAlert() {
    // 1. Fetch available items from the database
    this.apiService.getAllItems().subscribe({
      next: async (items) => {
        if (!items || items.length === 0) {
          console.warn("No items available in master catalog.");
          return;
        }

        const alert = await this.alertController.create({
          header: 'Añadir al Equipo',
          cssClass: 'heal-alert',
          inputs: items.map(item => ({
            type: 'radio',
            label: `${item.name} (${item.type})`,
            value: item.id
          })),
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Añadir',
              handler: (itemId) => {
                if (!itemId) {
                  console.warn("No item selected.");
                  return false;
                }
                if (this.characterId) {
                  this.apiService.addItemToInventory(this.characterId!, itemId).subscribe({
                    next: () => this.loadCharacter(this.characterId!),
                    error: (err) => console.error("Error adding item to inventory:", err)
                  });
                }
                return true;
              }
            }
          ]
        });
        await alert.present();
      },
      error: (err) => console.error("Error loading item catalog:", err)
    });
  }

  // Toggles death save markers
  toggleDeathSave(type: 'success' | 'failure', index: number) {
    const current = this.pj.deathSaves[type];
    // If they click the same dot that is the current maximum, we toggle it off
    if (current === index + 1) {
      this.pj.deathSaves[type] = index;
    } else {
      this.pj.deathSaves[type] = index + 1;
    }
    // Note: In a production build, you'd sync this to the backend as well
  }

  // Opens an alert to update a specific coin quantity
  async updateMoneyAlert(coinKey: string) {
    const coinNames: any = {
      cp: 'Cobre (PC)',
      sp: 'Plata (PP)',
      ep: 'Electrum (PE)',
      gp: 'Oro (PO)',
      pp: 'Platino (PT)'
    };

    const alert = await this.alertController.create({
      header: `Actualizar ${coinNames[coinKey]}`,
      cssClass: 'heal-alert',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Cantidad',
          value: this.pj.money[coinKey],
          min: 0
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const val = parseInt(data.amount, 10);
            if (!isNaN(val) && val >= 0) {
              this.pj.money[coinKey] = val;
              this.updateMoneyOnBackend();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async updateTempHpAlert() {
    const alert = await this.alertController.create({
      header: 'Vida Temporal',
      cssClass: 'heal-alert',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Cantidad de vida temporal',
          value: this.pj.tempHp,
          min: 0
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Actualizar',
          handler: (data) => {
            const amount = parseInt(data.amount, 10);
            if (!isNaN(amount)) {
              this.pj.tempHp = amount;
              this.updateTempHpOnBackend();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private updateTempHpOnBackend() {
    if (!this.characterId) return;
    this.apiService.updateTempHp(this.characterId, this.pj.tempHp).subscribe({
      next: () => console.log('Temporary HP updated successfully in DB'),
      error: (err: any) => console.error("Error updating temporary HP:", err)
    });
  }

  private updateMoneyOnBackend() {
    if (!this.characterId) return;
    this.apiService.updateMoney(this.characterId!, this.pj.money).subscribe({
      next: () => { },
      error: (err) => console.error("Error updating money:", err)
    });
  }

  // Extracts a string[] from the classFeatures JSON blob (e.g. classFeatures.armorProficiencies)
  extractArrayFromClassFeatures(classFeatures: any, key: string): string[] {
    if (!classFeatures) return [];
    const val = classFeatures[key];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
  }

  // Extracts a string[] from the raceFeatures JSON blob (e.g. raceFeatures.languages)
  extractArrayFromRaceFeatures(raceFeatures: any, key: string): string[] {
    if (!raceFeatures) return [];
    const val = raceFeatures[key];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean);
    return [];
  }

  // Extracts feature entries from the subclassFeatures JSON blob.
  // The subclass form stores features inside subclassFeatures.features[].
  // Returns objects compatible with the ClassFeatureDto shape so they render
  // seamlessly alongside class features.  The backend already level-filters them.
  // Helper to extract innate spells from race features as displayable features
  extractInnateSpellsAsFeatures(innateSpells: any[]): any[] {
    if (!innateSpells || !Array.isArray(innateSpells)) return [];
    return innateSpells.map((s: any) => ({
      name: `Conjuro Innato: ${s.name}`,
      description: `Puedes lanzar este conjuro ${s.usesPerDay || 1} vez/veces al día (${s.rechargeOn || 'Descanso Largo'}). Aptitud mágica: ${s.ability || 'CAR'}.`
    }));
  }

  extractSubclassFeatures(subclassFeatures: any): any[] {
    if (!subclassFeatures) return [];
    const raw = subclassFeatures['features'];
    if (!Array.isArray(raw)) return [];
    return raw.map((f: any) => ({
      id: f.id ?? null,
      name: f.name ?? '',
      description: f.description ?? '',
      levelRequired: f.levelRequired ?? 0,
      options: f.options ?? null,
      properties: f.properties ?? null,
      isSubclassFeature: true   // flag for optional styling in the template
    }));
  }

  onSpellSelected(spell: any) {
    if (!this.characterId) return;

    this.apiService.addSpellToCharacter(this.characterId, spell.id).subscribe({
      next: () => {
        this.isSpellModalOpen = false;
        this.loadCharacter(this.characterId!);
      }
    });
  }

  // --- Detail Modal Logic ---
  openDetail(data: any, type: 'SPELL' | 'ITEM' | 'FEATURE') {
    this.selectedDetail = data;
    this.detailType = type;
    this.isDetailModalOpen = true;
  }

  closeDetail() {
    this.isDetailModalOpen = false;
    this.selectedDetail = null;
  }

  getDetailSubtitle(): string {
    if (!this.selectedDetail) return '';
    if (this.detailType === 'SPELL') {
      const lvl = this.selectedDetail.spell.level === 0 ? 'Truco' : `Nivel ${this.selectedDetail.spell.level}`;
      return `${lvl} • ${this.selectedDetail.spell.school}`;
    }
    if (this.detailType === 'ITEM') {
      const rarity = this.selectedDetail.properties?.rarity ? ` • ${this.selectedDetail.properties.rarity}` : '';
      return (this.selectedDetail.type || 'Objeto') + rarity;
    }
    return '';
  }

  getDetailIcon(): string {
    if (this.detailType === 'SPELL') return 'sparkles';
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

    // Overrides (Fixed values)
    if (p.overrideStr) list.push(`FU fijada en ${p.overrideStr}`);
    if (p.overrideDex) list.push(`DES fijada en ${p.overrideDex}`);
    if (p.overrideCon) list.push(`CON fijada en ${p.overrideCon}`);
    if (p.overrideInt) list.push(`INT fijada en ${p.overrideInt}`);
    if (p.overrideWis) list.push(`SAB fijada en ${p.overrideWis}`);
    if (p.overrideCha) list.push(`CAR fijada en ${p.overrideCha}`);

    // Additive bonuses
    if (p.bonusStr) list.push(`+${p.bonusStr} FU`);
    if (p.bonusDex) list.push(`+${p.bonusDex} DES`);
    if (p.bonusCon) list.push(`+${p.bonusCon} CON`);
    if (p.bonusInt) list.push(`+${p.bonusInt} INT`);
    if (p.bonusWis) list.push(`+${p.bonusWis} SAB`);
    if (p.bonusCha) list.push(`+${p.bonusCha} CAR`);
    if (p.bonusMaxHp) list.push(`+${p.bonusMaxHp} PG Máx`);
    return list;
  }

  removeItem(slotId: number) {
    if (!this.characterId) return;

    this.apiService.removeInventoryItem(this.characterId, slotId).subscribe({
      next: () => {
        // Refresh state
        this.loadCharacter(this.characterId!);
      }
    });
  }

  // --- Spell Picker Modal Logic ---
  isSpellModalOpen = false;
  availableSpells: any[] = [];
  filteredAvailableSpells: any[] = [];
  spellSearchQuery = '';

  async openAddSpellPicker() {
    if (!this.characterId) return;

    this.apiService.getAvailableSpells(this.characterId).subscribe({
      next: (spells: any[]) => {
        const maxLevel = this.getMaxSpellLevel();
        this.availableSpells = spells.filter(s => s.level === 0 || s.level <= maxLevel)
          .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
        this.filteredAvailableSpells = [...this.availableSpells];
        this.spellSearchQuery = '';
        this.isSpellModalOpen = true;
      },
      error: () => console.error('Error loading available spells')
    });
  }

  filterSpells(event: any) {
    const query = event.detail.value?.toLowerCase() || '';
    this.spellSearchQuery = query;
    if (!query) {
      this.filteredAvailableSpells = [...this.availableSpells];
      return;
    }
    this.filteredAvailableSpells = this.availableSpells.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.school.toLowerCase().includes(query)
    );
  }

  selectSpell(spellId: string) {
    this.isSpellModalOpen = false;
    this.addSpell(spellId);
  }

  // Adds a spell to this character's spellbook
  addSpell(spellId: string) {
    if (!this.characterId) return;
    this.apiService.addSpellToCharacter(this.characterId, spellId).subscribe({
      next: () => this.loadCharacter(this.characterId!),
      error: (err) => console.error('Error adding spell:', err)
    });
  }

  // Removes a spell from this character's spellbook
  removeSpell(characterSpellId: number) {
    if (!this.characterId) return;
    this.apiService.removeSpellFromCharacter(this.characterId, characterSpellId).subscribe({
      next: () => this.loadCharacter(this.characterId!),
      error: (err) => console.error('Error removing spell:', err)
    });
  }

  // Toggles the preparation status of a spell
  toggleSpellPrepare(characterSpellId: number) {
    if (!this.characterId) return;
    this.apiService.toggleSpellPrepare(this.characterId, characterSpellId).subscribe({
      next: () => this.loadCharacter(this.characterId!),
      error: (err) => console.error('Error toggling spell preparation:', err)
    });
  }

  // Syncs all available class spells to the character
  syncSpells() {
    if (!this.characterId) return;
    this.apiService.syncClassSpells(this.characterId).subscribe({
      next: () => this.loadCharacter(this.characterId!),
      error: (err) => console.error('Error syncing class spells:', err)
    });
  }

  clearUnpreparedSpells() {
    if (!this.characterId) return;

    this.apiService.removeUnpreparedSpells(this.characterId).subscribe({
      next: () => this.loadCharacter(this.characterId!),
      error: (err) => console.error('Error clearing unprepared spells:', err)
    });
  }

  // --- UI LOGIC ---

  // Cambia de pestaña (Atributos, Inventario, Magia)
  segmentChanged(event: any) {
    this.currentTab = event.detail.value;
  }

  openLevelUpModal() {
    if (!this.rawCharacter) return;

    this.isLevelUpModalOpen = true;
    
    // Reset data
    this.levelUpData = {
      hpBonus: 0,
      statChanges: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      choicesJson: JSON.parse(JSON.stringify(this.pj.choicesJson || {})), // Deep copy
      selectedSpells: [],
      subclassId: null
    };

    this.showSubclassPicker = false;
    this.levelUpSubclasses = [];

    this.levelUpNewFeatures = [];
    this.cantripsToChoose = 0;
    this.spellsToChoose = 0;
    this.levelUpAvailableSpells = [];

    // If there's only one class and it's not multiclassing, we can pre-select it
    if (!this.rawCharacter.classLevels || this.rawCharacter.classLevels.length <= 1) {
      this.selectExistingClass(this.rawCharacter.dndClass.id);
    }
  }

  updateLevelUpFeatures() {
    if (!this.rawCharacter) return;
    
    // Determine which class we are leveling up and what its NEW level will be
    let targetClass: any = null;
    let targetSubclass: any = null;
    let newClassLevel = 1;

    if (this.levelUpMode === 'MULTICLASS' && this.levelUpData.newClassId) {
      targetClass = this.allClasses.find(c => c.id === this.levelUpData.newClassId);
      newClassLevel = 1;
    } else if (this.levelUpMode === 'EXISTING' && this.levelUpData.classToLevelId) {
       const cl = (this.rawCharacter.classLevels || []).find((l: any) => l.dndClass.id === this.levelUpData.classToLevelId);
       if (cl) {
         targetClass = cl.dndClass;
         targetSubclass = cl.subclass;
         newClassLevel = cl.level + 1;
       } else if (this.rawCharacter.dndClass?.id === this.levelUpData.classToLevelId) {
         targetClass = this.rawCharacter.dndClass;
         targetSubclass = this.rawCharacter.subclass;
         newClassLevel = this.pj.level + 1; // Fallback if classLevels missing
       }
    }

    if (!targetClass) {
      this.levelUpNewFeatures = [];
      return;
    }

    // Build the list of features that grant choices for the NEW level of THIS class
    const allPossibleFeatures = [
      ...(targetClass.features || []),
      ...(targetClass.classFeatures?.features || []),
      ...this.extractSubclassFeatures(targetSubclass?.subclassFeatures)
    ];

    this.levelUpNewFeatures = [];
    const seenNames = new Set<string>();

    allPossibleFeatures.forEach(f => {
      const reqLevel = parseInt(f.levelRequired, 10);
      // We only care about features gained at THIS specific level of THIS class
      // OR features that gain new choices at this level (like Warlock Invocations)
      if (reqLevel <= newClassLevel && !seenNames.has(f.name)) {
        const isNew = reqLevel === newClassLevel;

        // Calculate max choices for current class level vs next class level
        const currentMax = this.calculateMaxChoices(f, newClassLevel - 1);
        const nextMax = this.calculateMaxChoices(f, newClassLevel);
        const gainedNewChoices = nextMax > currentMax;

        if (isNew || gainedNewChoices) {
          const optsArray = this.getFeatureOptionsArray(f);

          // Filter options by level
          const filteredOptions = optsArray.filter((opt: any) => {
            const optReq = opt.levelRequired ?? f.levelRequired;
            return parseInt(optReq, 10) <= newClassLevel;
          });

          if (isNew || (gainedNewChoices && filteredOptions.length > 0)) {
            this.levelUpNewFeatures.push({
              ...f,
              calculatedMaxChoices: nextMax,
              filteredOptions: filteredOptions
            });
            seenNames.add(f.name);
          }
        }
      }
    });

    // Check if we gain a subclass at this level
    const subclassLevel = targetClass.classFeatures?.subclassLevel || 3;
    if (newClassLevel >= subclassLevel && !targetSubclass && !this.levelUpData.subclassId) {
      this.showSubclassPicker = true;
      this.apiService.getSubclasses(targetClass.id).subscribe({
        next: (subs) => this.levelUpSubclasses = subs,
        error: (err) => console.error('Error fetching subclasses:', err)
      });
    } else {
      this.showSubclassPicker = false;
    }

    // Calculate Spells/Cantrips to choose for this class level
    this.calculateSpellsToChoose(targetClass, targetSubclass, newClassLevel);
  }

  selectLevelUpSubclass(sub: any) {
    this.levelUpData.subclassId = sub.id;
    // We might need to refresh features to include the new subclass's features
    this.updateLevelUpFeatures();
  }

  private calculateSpellsToChoose(dndClass: any, subclass: any, newClassLevel: number) {
    const sc = subclass?.subclassFeatures?.spellcasting || dndClass?.classFeatures?.spellcasting;
    if (!sc) {
      this.cantripsToChoose = 0;
      this.spellsToChoose = 0;
      this.levelUpAvailableSpells = [];
      return;
    }

    const currentIdx = Math.min(Math.max(newClassLevel - 2, 0), 19);
    const nextIdx = Math.min(Math.max(newClassLevel - 1, 0), 19);

    const style = sc.preparationStyle || sc.preparation_style || 'KNOWN';
    const type = sc.spellcastingType || sc.spellcasting_type || sc.type;
    const lowName = dndClass?.name?.toLowerCase() || '';

    const spellsKnownTable = sc.spellsKnown || sc.spells_known;
    const hasSpellsKnownTable = Array.isArray(spellsKnownTable) && spellsKnownTable.length > 0;

    const cantripsKnownTable = sc.cantripsKnown || sc.cantrips_known;
    const currentCantrips = newClassLevel === 1 ? 0 : (cantripsKnownTable?.[currentIdx] || 0);
    const nextCantrips = cantripsKnownTable?.[nextIdx] || 0;
    this.cantripsToChoose = Math.max(0, nextCantrips - currentCantrips);

    let currentSpells = 0;
    let nextSpells = 0;

    const knowledgeStyle = sc.knowledgeStyle || sc.knowledge_style || (lowName.includes('wizard') || lowName.includes('mago') ? 'LEARNED' : 'ALL_LIST');

    if (hasSpellsKnownTable) {
      currentSpells = newClassLevel === 1 ? 0 : (spellsKnownTable[currentIdx] || 0);
      nextSpells = spellsKnownTable[nextIdx] || 0;
      this.spellsToChoose = Math.max(0, nextSpells - currentSpells);
    } else if (style === 'KNOWN' || knowledgeStyle === 'LEARNED') {
      // Fallback logic for Homebrew classes without explicit tables
      if (lowName.includes('wizard') || lowName.includes('mago')) {
        this.spellsToChoose = newClassLevel === 1 ? 6 : 2; // Wizards gain 6 at L1, then 2
      } else if (type === 'Full Caster') {
        this.spellsToChoose = newClassLevel === 1 ? 2 : 1;
      } else if (type === 'Half Caster') {
        this.spellsToChoose = (newClassLevel % 2 === 0) ? 1 : 0; // Approximate
      } else if (type === 'Pact Magic') {
        this.spellsToChoose = 1;
      } else {
        this.spellsToChoose = 0;
      }
    } else {
      this.spellsToChoose = 0;
    }

    if (this.spellsToChoose > 0 || this.cantripsToChoose > 0) {
      this.fetchAvailableSpellsForLevelUp(newClassLevel);
    } else {
      this.levelUpAvailableSpells = [];
    }
  }

  private fetchAvailableSpellsForLevelUp(targetClassLevel: number) {
    // We should ideally filter by class name or ID here if the backend supports it
    // For now, we use the character's total level for slot capacity but we could use the class level
    // Actually, available spells depend on the level in THAT class (max slot level)
    this.apiService.getAvailableSpells(this.pj.id, targetClassLevel).subscribe({
      next: (spells: any[]) => {
        this.levelUpAvailableSpells = spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      },
      error: (err) => console.error('Error fetching level up spells:', err)
    });
  }


  toggleLevelUpSpell(spellId: string) {
    const idx = this.levelUpData.selectedSpells.indexOf(spellId);
    if (idx > -1) {
      this.levelUpData.selectedSpells.splice(idx, 1);
    } else {
      const spell = this.levelUpAvailableSpells.find(s => s.id === spellId);
      if (!spell) return;

      const isCantrip = spell.level === 0;
      const currentCantrips = this.levelUpData.selectedSpells.filter((id: string) =>
        this.levelUpAvailableSpells.find(s => s.id === id)?.level === 0).length;
      const currentSpells = this.levelUpData.selectedSpells.length - currentCantrips;

      if (isCantrip && currentCantrips < this.cantripsToChoose) {
        this.levelUpData.selectedSpells.push(spellId);
      } else if (!isCantrip && currentSpells < this.spellsToChoose) {
        this.levelUpData.selectedSpells.push(spellId);
      }
    }
  }

  isLevelUpSpellSelected(spellId: string): boolean {
    return this.levelUpData.selectedSpells.includes(spellId);
  }

  rollLevelUpHp() {
    this.levelUpData.hpBonus = Math.floor(Math.random() * this.currentLevelUpHitDie) + 1;
  }

  takeAverageHp() {
    // So it's floor(HD/2) + 1. 
    this.levelUpData.hpBonus = Math.floor(this.currentLevelUpHitDie / 2) + 1;
  }

  async manualLevelUpHp() {
    const alert = await this.alertController.create({
      header: 'Introducir Tirada',
      message: `Introduce el resultado del d${this.currentLevelUpHitDie}:`,
      inputs: [
        {
          name: 'roll',
          type: 'number',
          placeholder: 'Resultado',
          min: 1,
          max: this.currentLevelUpHitDie
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const val = parseInt(data.roll);
            if (!isNaN(val) && val > 0 && val <= this.currentLevelUpHitDie) {
              this.levelUpData.hpBonus = val;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  isASIDue(): boolean {
    const nextLevel = this.pj.level + 1;
    return [4, 8, 12, 16, 19].includes(nextLevel);
  }

  getTotalASISpent(): number {
    return Object.values(this.levelUpData.statChanges).reduce((a: any, b: any) => a + b, 0) as number;
  }

  incrementStat(key: string) {
    if (this.getTotalASISpent() < 2 && this.pj.stats[key] + this.levelUpData.statChanges[key] < 20) {
      this.levelUpData.statChanges[key]++;
    }
  }

  decrementStat(key: string) {
    if (this.levelUpData.statChanges[key] > 0) {
      this.levelUpData.statChanges[key]--;
    }
  }

  // Feature Options Logic (Reusing Forge Character logic)
  calculateMaxChoices(feature: any, level?: number): number {
    const lvl = level || this.pj.level;
    const options = feature.options;
    if (!options) return 0;

    // Use choiceCount if present, or count the available options if no specific count is set
    let total = options.choiceCount || 0;

    if (options.progression && Array.isArray(options.progression)) {
      const applicable = options.progression
        .filter((p: any) => lvl >= p.level)
        .reduce((sum: number, p: any) => sum + (p.additionalChoices || 0), 0);
      total += applicable;
    }

    // Fallback: if there are options but total is 0, assume at least 1 choice is allowed
    if (total === 0 && options.options?.length > 0) return 1;

    return total;
  }

  toggleFeatureOption(feature: any, optionName: string) {
    if (!this.levelUpData.choicesJson.featureOptions) {
      this.levelUpData.choicesJson.featureOptions = {};
    }

    const choices = { ...this.levelUpData.choicesJson.featureOptions };
    const selected = [...(choices[feature.name] || [])];

    if (selected.includes(optionName)) {
      choices[feature.name] = selected.filter((o: string) => o !== optionName);
    } else {
      const max = this.calculateMaxChoices(feature, this.pj.level + 1);
      if (selected.length < max) {
        choices[feature.name] = [...selected, optionName];
      }
    }

    // Trigger change detection by re-assigning the nested objects
    this.levelUpData.choicesJson = {
      ...this.levelUpData.choicesJson,
      featureOptions: choices
    };
  }

  onFeatureChoiceChange(feature: any, selection: any) {
    const key = feature.id ? feature.id.toString() : feature.name;
    this.levelUpData.choicesJson[key] = selection;
  }

  isFeatureOptionSelected(feature: any, optionName: string): boolean {
    const choices = this.levelUpData.choicesJson.featureOptions || {};
    return (choices[feature.name] || []).includes(optionName);
  }

  isFeatureMaxed(feature: any): boolean {
    const choices = this.levelUpData.choicesJson.featureOptions || {};
    const selected = choices[feature.name] || [];
    return selected.length >= this.calculateMaxChoices(feature, this.pj.level + 1);
  }

  getFeatureOptionsArray(feature: any): any[] {
    if (!feature) return [];

    // 1. If the feature itself has a choices array (some legacy structures)
    if (Array.isArray(feature.choices)) return feature.choices;
    if (Array.isArray(feature.options)) return feature.options;

    const opt = feature.options;
    if (!opt || typeof opt !== 'object') return [];

    // 2. Direct key checks (standard structures)
    if (Array.isArray(opt.options)) return opt.options;
    if (Array.isArray(opt.choices)) return opt.choices;
    if (Array.isArray(opt.choicePool)) return opt.choicePool;
    if (Array.isArray(opt.choice_pool)) return opt.choice_pool;
    if (Array.isArray(opt.pool)) return opt.pool;

    // 3. Broad search: return the first property that is a non-empty array
    for (const key of Object.keys(opt)) {
      if (Array.isArray(opt[key]) && opt[key].length > 0) {
        return opt[key];
      }
    }

    return [];
  }

  isLevelUpValid(): boolean {
    if (this.levelUpData.hpBonus <= 0) return false;
    if (this.isASIDue() && this.getTotalASISpent() < 2) return false;

    // Check spells
    const selectedCantrips = this.levelUpData.selectedSpells.filter((id: string) =>
      this.levelUpAvailableSpells.find(s => s.id === id)?.level === 0).length;
    const selectedSpells = this.levelUpData.selectedSpells.length - selectedCantrips;
    if (selectedCantrips < this.cantripsToChoose || selectedSpells < this.spellsToChoose) return false;

    // Check if all features with options have choices made
    for (const f of this.levelUpNewFeatures) {
      if (f.options) {
        const key = f.id ? f.id.toString() : f.name;
        const selected = this.levelUpData.choicesJson[key];
        
        // Basic validation: if there are options, there must be a choice
        if (!selected) return false;
        
        // If it's a list (SELECT_MANY), check the count
        if (Array.isArray(selected)) {
          const max = this.calculateMaxChoices(f, this.pj.level + 1);
          if (selected.length < max) return false;
        }
      }
    }
    return true;
  }

  confirmLevelUp() {
    if (!this.characterId) return;

    const conMod = getModifier(this.pj.stats.con + this.levelUpData.statChanges.con);
    const oldConMod = getModifier(this.pj.stats.con);
    const retroactive = (conMod - oldConMod) * this.pj.level;
    const finalHpBonus = this.levelUpData.hpBonus + conMod + retroactive;

    const request: any = {
      hpBonus: finalHpBonus,
      statChanges: this.levelUpData.statChanges,
      choicesJson: this.levelUpData.choicesJson,
      newSpells: this.levelUpData.selectedSpells,
      multiclassId: this.levelUpMode === 'MULTICLASS' ? this.levelUpData.newClassId : null,
      classToLevelId: this.levelUpMode === 'EXISTING' ? this.levelUpData.classToLevelId : null,
      subclassId: this.levelUpData.subclassId
    };

    this.apiService.levelUpCharacter(this.characterId, request).subscribe({
      next: () => {
        this.isLevelUpModalOpen = false;
        this.loadCharacter(this.characterId!);
      },
      error: (err) => {
        console.error('Error leveling up:', err);
        const msg = err.error?.message || 'Error desconocido al subir de nivel';
        this.alertController.create({
          header: 'Error',
          message: msg,
          buttons: ['OK']
        }).then(a => a.present());
      }
    });
  }

  isClassAlreadyTaken(classId: number): boolean {
    if (!this.rawCharacter) return false;
    if (this.rawCharacter.dndClass?.id === classId) return true;
    return (this.rawCharacter.classLevels || []).some((cl: any) => cl.dndClass.id === classId);
  }

  validatePrereq(cls: any): { met: boolean; text: string } {
    const prereqs = cls.classFeatures?.multiclassingPrerequisites;
    if (!prereqs || !prereqs.requirements || prereqs.requirements.length === 0) {
      return { met: true, text: 'Sin requisitos' };
    }

    const requirements = prereqs.requirements;
    const logic = prereqs.logic || 'AND';
    const scores = this.pj.stats; // Use current effective stats

    const results = requirements.map((req: any) => {
      const ability = (req.ability || '').toUpperCase();
      const minScore = req.minScore || 13;
      const key = ability.substring(0, 3).toLowerCase();
      const score = scores[key] || 0;
      return { 
        ability: this.statLabels[key] || ability, 
        met: score >= minScore, 
        current: score, 
        required: minScore 
      };
    });

    const metCount = results.filter((r: any) => r.met).length;
    const isMet = logic === 'OR' ? metCount > 0 : metCount === requirements.length;

    const text = results.map((r: any) => `${r.ability} ${r.required}`).join(', ');
    return { met: isMet, text };
  }

  selectMulticlass(cls: any) {
    this.levelUpData.newClassId = cls.id;
    this.levelUpData.classToLevelId = null;
    this.levelUpMode = 'MULTICLASS';
    this.updateLevelUpFeatures();
  }

  selectExistingClass(classId: number) {
    this.levelUpData.classToLevelId = classId;
    this.levelUpData.newClassId = null;
    this.levelUpMode = 'EXISTING';
    this.updateLevelUpFeatures();
  }

  isClassActive(classId: number): boolean {
    if (this.levelUpMode === 'EXISTING' && this.levelUpData.classToLevelId === classId) return true;
    if (this.levelUpMode === 'MULTICLASS' && this.levelUpData.newClassId === classId) return true;
    return false;
  }

  // Performs a short rest
  async performShortRest() {
    const alert = await this.alertController.create({
      header: 'Descanso Corto',
      message: '¿Realizar un descanso corto? Se restaurarán recursos como los Puntos de Ki y podrás gastar Dados de Golpe para curarte.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Descansar',
          handler: () => {
            const recoveredMessages: string[] = [];

            // Restore resources that reset on Short Rest
            this.resourcePools.forEach(p => {
              if (p.reset === 'SHORT_REST') p.current = p.max;
            });

            // Auto-restore magic item charges that recharge on Short Rest
            this.pj.inventory
              .filter((item: any) => item.properties?.recharge === 'SHORT_REST')
              .forEach((item: any) => {
                const key = this.getItemChargeKey(item);
                const current = this.getItemCharges(item);
                const max = item.properties?.charges ?? 0;
                if (current < max) {
                  const recovered = this.rollRecharge(item, max);
                  const newTotal = Math.min(max, current + recovered);
                  this.pj.resourceCounters[key] = newTotal;
                  
                  const actualRecovered = newTotal - current;
                  if (actualRecovered > 0) {
                    recoveredMessages.push(`🪄 ${item.name} recuperó ${actualRecovered} cargas`);
                  }
                }
              });

            // Sync all changes to backend in one single network call
            this.syncResourceCounters();
            
            // Also suggest spending hit dice
            this.updateHitDiceAlert();

            if (recoveredMessages.length > 0) {
              this.presentToast(recoveredMessages.join('\n'));
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Performs a long rest
  async performLongRest() {
    const alert = await this.alertController.create({
      header: 'Descanso Largo',
      message: '¿Estás seguro de que quieres realizar un descanso largo? Se restaurarán tus HP, espacios de conjuro y parte de tus dados de golpe.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Descansar',
          handler: () => {
            this.apiService.performLongRest(this.characterId!).subscribe({
              next: () => {
                const recoveredMessages: string[] = [];

                // Reset local resource pools
                this.resourcePools.forEach(p => p.current = p.max);

                // Auto-restore magic item charges that recharge on Long or Short Rest
                this.pj.inventory
                  .filter((item: any) =>
                    item.properties?.recharge === 'LONG_REST' ||
                    item.properties?.recharge === 'SHORT_REST'
                  )
                  .forEach((item: any) => {
                    const key = this.getItemChargeKey(item);
                    const current = this.getItemCharges(item);
                    const max = item.properties?.charges ?? 0;
                    if (current < max) {
                      const recovered = this.rollRecharge(item, max);
                      const newTotal = Math.min(max, current + recovered);
                      this.pj.resourceCounters[key] = newTotal;
                      
                      const actualRecovered = newTotal - current;
                      if (actualRecovered > 0) {
                        recoveredMessages.push(`🪄 ${item.name} recuperó ${actualRecovered} cargas`);
                      }
                    }
                  });

                // Manually sync counters and wait for it to finish BEFORE reloading
                // This prevents the race condition where loadCharacter fetches old data
                const counters: Record<string, number> = { ...(this.pj.resourceCounters || {}) };
                this.resourcePools.forEach(p => counters[p.name] = p.current);
                this.pj.resourceCounters = counters;

                this.apiService.updateResourceCounters(this.characterId!, counters).subscribe({
                  next: () => {
                    this.loadCharacter(this.characterId!);
                    if (recoveredMessages.length > 0) {
                      this.presentToast(recoveredMessages.join('\n'));
                    }
                  }
                });
              },
              error: (err) => console.error('Error performing long rest:', err)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Handles taking damage
  async takeDamage() {
    const alert = await this.alertController.create({
      header: 'Recibir Daño',
      cssClass: 'damage-alert', // Custom CSS class for styling
      inputs: [
        {
          name: 'damageAmount',
          type: 'number',
          placeholder: 'Cantidad de daño',
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aplicar',
          handler: (data) => {
            const damage = parseInt(data.damageAmount, 10);
            if (!isNaN(damage) && damage > 0) {
              this.pj.currentHp = Math.max(0, this.pj.currentHp - damage);
              this.updateCharacterHpOnBackend();
            } else {
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Handles healing
  async healDamage() {
    const alert = await this.alertController.create({
      header: 'Curar Puntos de Vida',
      cssClass: 'heal-alert', // Custom CSS class for styling
      inputs: [
        {
          name: 'healAmount',
          type: 'number',
          placeholder: 'Cantidad a curar',
          min: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aplicar',
          handler: (data) => {
            const heal = parseInt(data.healAmount, 10);
            if (!isNaN(heal) && heal > 0) {
              const totalMax = this.pj.maxHp + this.pj.bonusMaxHp;
              this.pj.currentHp = Math.min(totalMax, this.pj.currentHp + heal);
              this.updateCharacterHpOnBackend();
            } else {
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Opens an alert to update the number of spent hit dice
  async updateHitDiceAlert() {
    const alert = await this.alertController.create({
      header: 'Actualizar Dados de Golpe',
      cssClass: 'heal-alert',
      message: `Total de dados: ${this.pj.hitDiceTotal}d${this.pj.hitDieType}`,
      inputs: [
        {
          name: 'remainingAmount',
          type: 'number',
          placeholder: 'Dados disponibles',
          value: this.pj.hitDiceTotal - this.pj.hitDiceSpent,
          min: 0,
          max: this.pj.hitDiceTotal
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const val = parseInt(data.remainingAmount, 10);
            if (!isNaN(val) && val >= 0 && val <= this.pj.hitDiceTotal) {
              this.pj.hitDiceSpent = this.pj.hitDiceTotal - val;
              this.updateHitDiceOnBackend();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Spends one hit die
  spendOneHitDie() {
    if (this.pj.hitDiceSpent < this.pj.hitDiceTotal) {
      this.pj.hitDiceSpent++;
      this.updateHitDiceOnBackend();
    }
  }

  // Calculates the skill modifier (Stat Mod + Proficiency if applicable)
  getSkillMod(skill: any): string {
    const baseScore = this.pj.stats[skill.stat] || 10;
    const baseMod = Math.floor((Number(baseScore) - 10) / 2);

    const isProficient = !!this.pj.skillProficiencies?.[skill.id];
    const hasExpertise = this.pj.choicesJson?.expertise?.includes(skill.id);
    const profBonus = this.pj.proficiencyBonus || 0;

    let total = baseMod;
    if (hasExpertise) {
      total += (profBonus * 2);
    } else if (isProficient) {
      total += profBonus;
    }

    return total >= 0 ? `+${total}` : `${total}`;
  }

  // Helper to find the highest spell level the character has slots for
  getMaxSpellLevel(characterLevel?: number): number {
    // If a level is provided, we calculate based on the class progression table (for Level Up)
    if (characterLevel !== undefined && this.rawCharacter) {
      const cls = this.rawCharacter.dndClass;
      const rawFeatures = cls?.classFeatures || {};
      const autoSlots = this.getAutoSpellSlots(characterLevel, rawFeatures);

      let max = 0;
      for (let i = 1; i <= 9; i++) {
        if (autoSlots[`level_${i}`]?.max > 0) {
          max = i;
        }
      }
      return max;
    }

    // Default: Calculate based on current character's spell slots
    let max = 0;
    for (let i = 1; i <= 9; i++) {
      if (this.getSpellSlots(i.toString()).max > 0) {
        max = i;
      }
    }
    return max;
  }

  // Helper to group spells by level
  get groupedSpells() {
    if (!this.pj.spells) return [];
    const maxLevel = this.getMaxSpellLevel();
    const groups: any = {};

    // Pre-initialize groups for all levels that have slots (1 to 9)
    if (this.pj.spellSlots) {
      Object.keys(this.pj.spellSlots).forEach(key => {
        const levelMatch = key.match(/level_(\d+)/);
        if (levelMatch) {
          const levelNum = levelMatch[1];
          const slots = this.getSpellSlots(levelNum);
          if (slots.max > 0) {
            groups[levelNum] = [];
          }
        }
      });
    }

    // Always ensure Level 0 (Cantrips) is shown if the character has any
    const hasCantrips = this.pj.spells.some((cs: any) => cs.spell?.level === '0');
    if (hasCantrips) groups['0'] = [];

    this.pj.spells.forEach((cs: any) => {
      if (!cs || !cs.spell) return;
      const level = cs.spell.level;

      // Filter out spells higher than character's capacity
      if (Number(level) > maxLevel && level !== '0') return;

      if (!groups[level]) groups[level] = [];
      groups[level].push(cs);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (na === 0) return -1; // Cantrips always first
        if (nb === 0) return 1;
        return nb - na; // Then highest to lowest
      })
      .map(level => ({
        level: level === '0' ? 'Trucos' : `${level}º Nivel`,
        levelNum: level,
        spells: groups[level]
      }));
  }

  // Helper to get spell slot status — handles that JSON deserialization
  // may return the inner map values as numbers OR nested objects
  getSpellSlots(level: string): { max: number; available: number } {
    const key = `level_${level}`;
    const raw = this.pj.spellSlots?.[key];
    if (!raw) return { max: 0, available: 0 };

    let max = 0;
    let available = 0;

    if (typeof raw === 'object' && raw !== null) {
      max = Number((raw as any).max ?? 0);
      available = Number((raw as any).available ?? max);
    } else if (typeof raw === 'number') {
      max = raw;
      available = raw;
    }

    return { max, available };
  }

  // Returns a typed array of `max` length for @for slot rendering
  // (replaces the brittle [].constructor(N) pattern)
  getSlotArray(level: string): number[] {
    const { max } = this.getSpellSlots(level);
    return Array.from({ length: max }, (_, i) => i);
  }

  // Helper to toggle spell slot availability and SAVE to backend
  toggleSpellSlot(level: string, index: number) {
    const key = `level_${level}`;
    const slots = { ...this.pj.spellSlots };
    const current = this.getSpellSlots(level);

    // Calculate new available count
    let newAvailable = current.available;
    if (current.available > index) {
      newAvailable = index; // Consume slots down to this index
    } else {
      newAvailable = index + 1; // Restore slots up to this index
    }

    slots[key] = { max: current.max, available: newAvailable };
    this.pj.spellSlots = slots;

    // Persist to backend
    if (this.characterId) {
      this.apiService.updateSpellSlots(this.characterId, slots).subscribe();
    }
  }

  // Automated Spell Slot calculation using the class's own slot table with safety fallbacks
  getAutoSpellSlots(level: number, classFeatures?: any): Record<string, any> {
    const slots: Record<string, any> = {};
    const casting = classFeatures?.spellcasting || this.pj?._rawClassFeatures?.spellcasting;
    if (!casting) return slots;

    // 1. Try to use the custom table from the class features
    const table = casting.spellSlots?.slots || casting.spell_slots?.slots;

    if (table && table[level - 1]) {
      const row = table[level - 1];
      row.forEach((count: number, idx: number) => {
        if (count > 0) {
          slots[`level_${idx + 1}`] = { max: count, available: count };
        }
      });
      if (Object.keys(slots).length > 0) return slots;
    }

    // 2. Fallback: If no table, use standard 5e progression based on caster type
    const type = casting.spellcastingType || casting.type;
    console.log(`Spellcasting type detected: ${type} for level ${level}. Applying standard fallback.`);

    const fullCasterRow = [
      [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
      [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
      [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
    ];

    const halfCasterRow = [
      [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
      [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
    ];

    let row: number[] = [];
    if (type === 'Full Caster') row = fullCasterRow[level - 1] || [];
    else if (type === 'Half Caster') row = halfCasterRow[level - 1] || [];
    else if (type === 'Pact Magic') {
      const warlockSlots = level >= 17 ? 4 : (level >= 11 ? 3 : (level >= 2 ? 2 : 1));
      const warlockLvl = level >= 9 ? 5 : (level >= 7 ? 4 : (level >= 5 ? 3 : (level >= 3 ? 2 : 1)));
      slots[`level_${warlockLvl}`] = { max: warlockSlots, available: warlockSlots };
      return slots;
    }

    row.forEach((count, idx) => {
      if (count > 0) slots[`level_${idx + 1}`] = { max: count, available: count };
    });

    return slots;
  }

  // --- Spellcasting stat helpers ---
  // Reads the spellcasting ability from classFeatures, defaulting to INT for Wizards,
  // WIS for Clerics/Druids/Rangers, CHA for Paladins/Bards/Sorcerers/Warlocks.
  getSpellcastingAbility(): string {
    const fromClass = this.pj.proficiencies?._spellcastingAbility
      || this.extractArrayFromClassFeatures(this.pj._rawClassFeatures, 'spellcastingAbility')[0];
    if (fromClass) return fromClass.toUpperCase();
    // Heuristic fallback based on class name
    const cls = (this.pj.dndClass || '').toLowerCase();
    if (['mago', 'wizard'].some(n => cls.includes(n))) return 'INT';
    if (['clérigo', 'clerico', 'druida', 'explorador', 'ranger', 'druid', 'cleric'].some(n => cls.includes(n))) return 'SAB';
    return 'CAR';
  }

  private getSpellcastingMod(): number {
    const ability = this.getSpellcastingAbility();
    const statMap: Record<string, string> = {
      'FUE': 'str', 'STR': 'str',
      'DES': 'dex', 'DEX': 'dex',
      'CON': 'con',
      'INT': 'int',
      'SAB': 'wis', 'WIS': 'wis',
      'CAR': 'cha', 'CHA': 'cha'
    };
    const statKey = statMap[ability] || 'int';
    const score = this.pj.stats?.[statKey] || 10;
    return Math.floor((Number(score) - 10) / 2);
  }

  getSpellSaveDC(): number {
    return 8 + (this.pj.proficiencyBonus || 0) + this.getSpellcastingMod();
  }

  getSpellAttackBonus(): string {
    const total = (this.pj.proficiencyBonus || 0) + this.getSpellcastingMod();
    return total >= 0 ? `+${total}` : `${total}`;
  }

  // --- Prepared Spells Tracking ---
  getMaxPreparedSpells(): number {
    if (!this.pj) return 0;
    const level = this.pj.level || 1;
    const mod = this.getSpellcastingMod();
    const className = (this.pj.dndClass || '').toLowerCase();

    // Half-casters (Paladin, Ranger)
    if (['paladín', 'paladin', 'explorador', 'exploradora', 'ranger'].includes(className)) {
      return Math.max(1, Math.floor(level / 2) + mod);
    }

    // Full-casters (Cleric, Druid, Wizard)
    return Math.max(1, level + mod);
  }

  getPreparedSpellsCount(): number {
    if (!this.pj || !this.pj.spells) return 0;
    // We only count leveled spells (level > 0) that are prepared
    return this.pj.spells.filter((s: any) => s.spell && s.spell.level > 0 && s.isPrepared).length;
  }

  // ── Weapon Properties Engine ──────────────────────────────────────────────

  /**
   * Resolves which stat (STR or DEX) to use for a weapon's attack/damage rolls.
   * Finesse weapons automatically pick whichever modifier is higher.
   */
  private getWeaponStat(item: any): string {
    const weaponProps: string[] = item.properties?.weaponProperties ?? [];
    const baseStat: string = item.properties?.stat ?? 'str';

    if (weaponProps.includes('Finesse')) {
      const strMod = Math.floor(((this.pj.stats?.str ?? 10) - 10) / 2);
      const dexMod = Math.floor(((this.pj.stats?.dex ?? 10) - 10) / 2);
      return strMod >= dexMod ? 'str' : 'dex';
    }

    return baseStat;
  }

  /** Returns short badge labels for weapon property tags, e.g. ['FIN', 'VER']. */
  getWeaponBadges(item: any): string[] {
    const props: string[] = item.properties?.weaponProperties ?? [];
    const labelMap: Record<string, string> = {
      'Finesse':    'FIN',
      'Versatile':  'VER',
      'Two-Handed': '2H',
      'Reach':      'RCH',
      'Heavy':      'HVY',
      'Light':      'LGT',
      'Thrown':     'THR',
      'Range':      'RNG',
      'Loading':    'LOAD',
      'Special':    'ESP',
      'Ammunition': 'AMM',
    };
    return props.map(p => labelMap[p]).filter(Boolean);
  }

  /**
   * Returns true if the weapon has the Heavy property AND the character's
   * race is Small — indicating disadvantage on attack rolls per 5e rules.
   */
  hasDisadvantageWithWeapon(item: any): boolean {
    const props: string[] = item.properties?.weaponProperties ?? [];
    if (!props.includes('Heavy')) return false;
    const size = (this.rawCharacter?.dndRace?.size || 'Medium').toLowerCase();
    return size === 'small';
  }

  // Helper to get weapon attack bonus (Stat + Proficiency + magical bonus)
  getAttackBonus(item: any): string {
    const stat = this.getWeaponStat(item);
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    const magical = Number(item.properties?.magicalBonus) || 0;
    const total = mod + (this.pj.proficiencyBonus || 0) + magical;
    return total >= 0 ? `+${total}` : `${total}`;
  }

  // Builds the full damage string, e.g. "1d8+4 (2H: 1d10+4) Piercing"
  getWeaponDamage(item: any): string {
    const p = item.properties || {};
    const stat = this.getWeaponStat(item);
    const score = this.pj.stats[stat] || 10;
    const statMod = Math.floor((score - 10) / 2);
    const magical = Number(p.magicalBonus) || 0;
    const damageBonus = Number(p.damageBonus) || 0;
    const totalBonus = statMod + magical + damageBonus;
    const bonusPart = totalBonus > 0 ? `+${totalBonus}` : totalBonus < 0 ? `${totalBonus}` : '';

    // Normal dice
    const count = p.damageDiceCount ?? null;
    const die = p.damageDieType ?? null;
    let dicePart = '';
    if (count && die) {
      dicePart = `${count}${die}`;
    } else if (p.damageDice) {
      dicePart = p.damageDice; // legacy free-text fallback
    }

    // Versatile two-handed dice (shown as secondary info)
    const weaponProps: string[] = p.weaponProperties ?? [];
    const vCount = p.versatileDiceCount ?? null;
    const vDie = p.versatileDieType ?? null;
    const versatilePart = (weaponProps.includes('Versatile') && vCount && vDie)
      ? ` (2H: ${vCount}${vDie}${bonusPart})`
      : '';

    // Damage type
    let dmgType = '';
    if (Array.isArray(p.damageType) && p.damageType.length > 0) {
      dmgType = p.damageType[0];
    } else if (typeof p.damageType === 'string' && p.damageType) {
      dmgType = p.damageType;
    }

    const fullDice = dicePart + bonusPart + versatilePart;
    return [fullDice, dmgType].filter(Boolean).join(' ') || '—';
  }

  // Helper to get damage modifier string (kept for backward compatibility)
  getDamageMod(item: any): string {
    const stat = item.properties?.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    if (mod === 0) return '';
    return mod > 0 ? `+${mod}` : `${mod}`;
  }

  getNaturalWeaponAttackBonus(nw: any): string {
    const stat = nw.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    const total = mod + (this.pj.proficiencyBonus || 0);
    return total >= 0 ? `+${total}` : `${total}`;
  }

  getNaturalWeaponDamage(nw: any): string {
    const stat = nw.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    const bonusPart = mod > 0 ? `+${mod}` : mod < 0 ? `${mod}` : '';
    const dicePart = `${nw.diceCount || 1}${nw.dieType || 'd6'}`;
    const dmgType = nw.damageType || '';
    return `${dicePart}${bonusPart} ${dmgType}`.trim() || '—';
  }

  // Calcula el modificador de tirada de salvación (Modificador de Stat + Competencia si aplica)
  // Calcula el modificador de tirada de salvación (Modificador de Stat + Competencia si aplica)
  getSavingThrowMod(statKey: string): string {
    const baseScore = this.pj.stats[statKey] || 10;
    const baseMod = Math.floor((Number(baseScore) - 10) / 2);

    // Mapeo de claves para ser robustos con diferentes convenciones de nombres (str vs Strength)
    const longKeys: Record<string, string[]> = {
      str: ['str', 'Strength', 'Fuerza', 'FUE'],
      dex: ['dex', 'Dexterity', 'Destreza', 'DES'],
      con: ['con', 'Constitution', 'Constitución', 'CON'],
      int: ['int', 'Intelligence', 'Inteligencia', 'INT'],
      wis: ['wis', 'Wisdom', 'Sabiduría', 'SAB'],
      cha: ['cha', 'Charisma', 'Carisma', 'CAR']
    };

    const synonyms = longKeys[statKey] || [statKey];
    const isProficient = synonyms.some(key => !!this.pj.savingThrowsProficiencies?.[key] || !!this.pj.savingThrowsProficiencies?.[key.toLowerCase()]);

    const profBonus = this.pj.proficiencyBonus || 0;
    const total = isProficient ? baseMod + profBonus : baseMod;

    return total >= 0 ? `+${total}` : `${total}`;
  }

  // Helper for the UI to check proficiency with synonyms
  isProficientInSave(statKey: string): boolean {
    if (!this.pj?.savingThrowsProficiencies) return false;
    const longKeys: Record<string, string[]> = {
      str: ['str', 'Strength', 'Fuerza', 'FUE'],
      dex: ['dex', 'Dexterity', 'Destreza', 'DES'],
      con: ['con', 'Constitution', 'Constitución', 'CON'],
      int: ['int', 'Intelligence', 'Inteligencia', 'INT'],
      wis: ['wis', 'Wisdom', 'Sabiduría', 'SAB'],
      cha: ['cha', 'Charisma', 'Carisma', 'CAR']
    };
    const synonyms = longKeys[statKey] || [statKey];
    return synonyms.some(key => !!this.pj.savingThrowsProficiencies?.[key] || !!this.pj.savingThrowsProficiencies?.[key.toLowerCase()]);
  }

  // Calcula el modificador de D&D a partir de la puntuación base (Ej: 16 -> +3)
  getMod(score: any): string {
    const mod = this.getModifierNumber(score);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  getModifierNumber(score: any): number {
    const num = Number(score);
    return Math.floor((num - 10) / 2);
  }

  // Sends HP update to the backend
  updateCharacterHpOnBackend() {
    if (!this.characterId) {
      console.error('Character ID is not available for HP update.');
      return;
    }

    const hpValue = Math.floor(Number(this.pj.currentHp));
    console.log(`Enviando actualización de HP a la BD: ID=${this.characterId}, HP=${hpValue}`);

    // Assuming apiService.updateCharacterHp exists and takes characterId and newHp
    this.apiService.updateCharacterHp(this.characterId!, hpValue).subscribe({
      next: () => { },
      error: (err) => {
        console.error('Error detallado de MasterForge:', err);
      }
    });
  }

  private updateHitDiceOnBackend() {
    if (!this.characterId) return;

    const spentValue = Math.floor(Number(this.pj.hitDiceSpent));

    this.apiService.updateHitDice(this.characterId!, spentValue).subscribe({
      next: () => { },
      error: (err) => {
        console.error('Error actualizando dados de golpe:', err);
      }
    });
  }

  async updateBonusMaxHpAlert() {
    const alert = await this.alertController.create({
      header: 'Bono Vida Máxima',
      cssClass: 'heal-alert',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          placeholder: 'Ej: +10 o -5',
          value: this.pj.bonusMaxHp
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Actualizar',
          handler: (data) => {
            const amount = parseInt(data.amount, 10);
            if (!isNaN(amount)) {
              this.pj.bonusMaxHp = amount;
              this.updateBonusMaxHpOnBackend();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private updateBonusMaxHpOnBackend() {
    if (!this.characterId) return;
    this.apiService.updateBonusMaxHp(this.characterId, this.pj.bonusMaxHp).subscribe({
      next: () => console.log('Bonus Max HP updated successfully in DB'),
      error: (err: any) => console.error("Error updating bonus max HP:", err)
    });
  }

  // --- Dynamic Resource Pool Logic ---
  calculateResourcePools() {
    if (!this.rawCharacter) return;
    const pools: any[] = [];
    
    // 1. Scan Class & Subclass Features
    this.pj.features.forEach((feat: any) => {
      const itemsToScan = [feat, ...(feat.selectedOptions || [])];
      itemsToScan.forEach(obj => {
        let pool = this.detectResourceInFeature(obj);
        if (pool) pools.push(pool);
      });
    });

    // 2. Scan Racial Traits
    this.pj.traits.forEach((trait: any) => {
      let pool = this.detectResourceInFeature(trait);
      if (pool) pools.push(pool);
    });

    this.checkAndAddHardcodedPools(pools);
    this.resourcePools = pools;
  }

  calculateAutomatedEffects() {
    const res: Set<string> = new Set();
    const imm: Set<string> = new Set();
    const conditionImm: Set<string> = new Set();
    const senses: Set<string> = new Set();

    const allFeatures = this.getAllCharacterFeatures(this.rawCharacter);

    allFeatures.forEach(f => {
      // 1. Check global feature effects
      const globalEffects = f.properties?.effects || [];
      globalEffects.forEach((e: any) => this.applyEffect(e, res, imm, conditionImm, senses));

      // 2. Check selected options effects
      if (f.selectedOptions && f.options?.choices) {
        f.selectedOptions.forEach((selectedId: string) => {
          // Find option object by ID, label or name
          const optionObj = f.options.choices.find((c: any) => 
            c.id === selectedId || c.label === selectedId || c.name === selectedId
          );
          if (optionObj) {
            const optionEffects = optionObj.effects || optionObj.properties?.effects || [];
            optionEffects.forEach((e: any) => this.applyEffect(e, res, imm, conditionImm, senses));
          }
        });
      }
    });

    // 3. Check racial base senses
    const racialSenses = this.rawCharacter?.dndRace?.raceFeatures?.senses || {};
    Object.entries(racialSenses).forEach(([sense, value]) => {
      if (value && typeof value === 'number' && value > 0) {
        senses.add(`${sense} ${value}ft`);
      }
    });

    // 4. Check core Race/Subclass properties (Resistances, Immunities)
    const toScan = [
      this.rawCharacter.dndRace?.raceFeatures,
      this.rawCharacter.dndClass?.classFeatures,
      ...(this.rawCharacter.classLevels || []).map((cl: any) => cl.subclass?.subclassFeatures)
    ].filter(Boolean);

    toScan.forEach(obj => {
      (obj.damageResistances || []).forEach((r: string) => res.add(r));
      (obj.damageImmunities || []).forEach((i: string) => imm.add(i));
      (obj.conditionImmunities || []).forEach((c: string) => conditionImm.add(c));
    });

    this.pj.resistances = Array.from(res);
    this.pj.immunities = Array.from(imm);
    this.pj.conditionImmunities = Array.from(conditionImm);
    this.pj.senses = Array.from(senses);
  }

  private applyEffect(e: any, res: Set<string>, imm: Set<string>, conditionImm: Set<string>, senses: Set<string>) {
    const type = e.type || 'STAT_MODIFIER';
    const target = e.target || e.customTarget || '';
    if (!target) return;

    if (type === 'DAMAGE_RESISTANCE') res.add(target);
    if (type === 'DAMAGE_IMMUNITY') imm.add(target);
    if (type === 'CONDITION_IMMUNITY') conditionImm.add(target);
    if (type === 'SENSE') {
      const val = e.value || 0;
      const unit = (val.toString().includes('ft')) ? '' : 'ft';
      senses.add(`${target} ${val}${unit}`);
    }
  }

  private detectResourceInFeature(feat: any): any | null {
    const props = feat.properties || feat.options || {};
    if (props.resourcePool) {
      const rp = props.resourcePool;
      const max = this.calculateResourceMax(rp, feat);
      const current = this.pj.resourceCounters[rp.name] ?? max;
      return { ...rp, max, current, featureName: feat.name };
    }
    return null;
  }

  private checkAndAddHardcodedPools(existingPools: any[]) {
    const classLevels = this.rawCharacter.classLevels || [];
    const monk = classLevels.find((cl: any) => cl.dndClass.name.toLowerCase().includes('monk') || cl.dndClass.name.toLowerCase().includes('monje'));
    if (monk && !existingPools.find(p => p.name === 'Puntos de Ki')) {
      const max = monk.level;
      const current = this.pj.resourceCounters['Puntos de Ki'] ?? max;
      existingPools.push({ name: 'Puntos de Ki', max, current, reset: 'SHORT_REST' });
    }
    const sorc = classLevels.find((cl: any) => cl.dndClass.name.toLowerCase().includes('sorcerer') || cl.dndClass.name.toLowerCase().includes('hechicero'));
    if (sorc && sorc.level >= 2 && !existingPools.find(p => p.name === 'Puntos de Hechicería')) {
      const max = sorc.level;
      const current = this.pj.resourceCounters['Puntos de Hechicería'] ?? max;
      existingPools.push({ name: 'Puntos de Hechicería', max, current, reset: 'LONG_REST' });
    }
    const barb = classLevels.find((cl: any) => cl.dndClass.name.toLowerCase().includes('barbarian') || cl.dndClass.name.toLowerCase().includes('bárbaro'));
    if (barb && !existingPools.find(p => p.name === 'Furias')) {
      const rageTable = [0, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 999];
      const max = rageTable[barb.level] || 2;
      const current = this.pj.resourceCounters['Furias'] ?? max;
      existingPools.push({ name: 'Furias', max, current, reset: 'LONG_REST' });
    }
  }

  private calculateResourceMax(rp: any, feat?: any): number {
    let max = rp.max;

    // Handle "level" keyword (dynamic scaling)
    if (max === 'level') {
      // If we have a class context, use class level
      const className = feat?._className || feat?.dndClass?.name;
      if (className) {
        const cl = (this.rawCharacter.classLevels || []).find((l: any) => 
          l.dndClass.name.toLowerCase() === className.toLowerCase()
        );
        return cl?.level || this.pj.level;
      }
      // Default to character total level
      return this.pj.level;
    }

    // Handle "PB" keyword (Proficiency Bonus scaling)
    if (max === 'PB' || max === 'pb') {
      return this.pj.proficiencyBonus || 2;
    }

    // Handle legacy/other resource types
    if (rp.type === 'CLASS_LEVEL') {
      const cl = (this.rawCharacter.classLevels || []).find((l: any) => l.dndClass.name === rp.className);
      return cl?.level || 0;
    }
    if (rp.type === 'FIXED_TABLE') {
      const cl = (this.rawCharacter.classLevels || []).find((l: any) => l.dndClass.name === rp.className);
      return rp.table[cl?.level || 0] || 0;
    }
    
    return Number(max) || 0;
  }

  useResource(pool: any) {
    if (pool.current > 0) {
      pool.current--;
      this.syncResourceCounters();
    }
  }

  restoreResource(pool: any) {
    if (pool.current < pool.max) {
      pool.current++;
      this.syncResourceCounters();
    }
  }

  private syncResourceCounters() {
    // Preserve existing counters (like magic item charges) that are not part of resourcePools
    const counters: Record<string, number> = { ...(this.pj.resourceCounters || {}) };
    
    this.resourcePools.forEach(p => {
      counters[p.name] = p.current;
    });
    
    this.pj.resourceCounters = counters;
    if (this.characterId) {
      this.apiService.updateResourceCounters(this.characterId, counters).subscribe();
    }
  }

  // --- Advanced AC Engine ---
  private calculateEffectiveAC(data: any, stats: any): number {
    const dexMod = getModifier(stats.dex);
    const inventory = data.inventory || [];
    const armor = inventory.find((s: any) => s.equipped && s.item.type === 'ARMOR');
    const shield = inventory.find((s: any) => s.equipped && s.item.type === 'SHIELD');

    // Get features that the character actually has at their current level
    const allFeatures = this.getAllCharacterFeatures(data);

    let calculations: number[] = [];

    // 1. Base / Armor Path
    if (armor) {
      const props = armor.item.properties || {};
      let base = props.baseAc || 10;
      let appliedDex = dexMod;
      if (props.dexBonus === false || props.noDex === true) appliedDex = 0;
      else if (typeof props.dexLimit === 'number') appliedDex = Math.min(dexMod, props.dexLimit);
      
      calculations.push(base + appliedDex);
    } else {
      // Unarmored Path (Default)
      calculations.push(10 + dexMod);

      // --- DATA-DRIVEN AC CALCULATIONS (Homebrew Support) ---
      allFeatures.forEach(f => {
        const props = f.properties || f.options || {};
        if (props.acCalculation) {
          const calc = props.acCalculation;
          // Most special calculations (Unarmored Defense) don't work with armor
          // but we check if the feature explicitly allows it
          if (calc.requiresNoArmor === false || !armor) {
            let val = calc.base || 10;
            if (calc.stats) {
              calc.stats.forEach((s: string) => {
                const statVal = stats[s.toLowerCase()];
                if (statVal !== undefined) val += getModifier(statVal);
              });
            }
            calculations.push(val);
          }
        }
      });

      // --- RACE NATURAL ARMOR ---
      const natArmor = data.dndRace?.raceFeatures?.naturalArmor;
      if (natArmor && natArmor.enabled) {
        let val = natArmor.baseAC || 10;
        if (natArmor.addDex) val += dexMod;
        calculations.push(val);
      }

      // --- HARDCODED FALLBACKS (Standard 5e) ---
      const conMod = getModifier(stats.con);
      const wisMod = getModifier(stats.wis);
      // Barbarian: 10 + DEX + CON
      if (this.hasFeature(data, ['Defensa sin armadura', 'Unarmored Defense'], 'Barbarian')) {
        calculations.push(10 + dexMod + conMod);
      }
      // Monk: 10 + DEX + WIS
      if (this.hasFeature(data, ['Defensa sin armadura', 'Unarmored Defense'], 'Monk')) {
        calculations.push(10 + dexMod + wisMod);
      }
      // Draconic Resilience / Natural Armor (13 + DEX)
      if (this.hasFeature(data, ['Resiliencia Dracónica', 'Draconic Resilience', 'Armadura Natural', 'Natural Armor'])) {
        calculations.push(13 + dexMod);
      }
    }

    // Pick the best base calculation
    let finalAc = Math.max(...calculations);

    // 2. Add Flat Bonuses
    // - Shields
    if (shield) {
      finalAc += (shield.item.properties?.acBonus || 2);
    }

    // - Racial flat bonus (legacy field)
    finalAc += (data.dndRace?.bonusArmorClass || 0);

    // - Data-driven Flat Bonuses (Homebrew Support)
    allFeatures.forEach(f => {
      // Check base feature and all selected options
      const itemsToScan = [f, ...(f.selectedOptions || [])];
      
      itemsToScan.forEach(obj => {
        const props = obj.properties || obj.options || {};
        if (props.acBonus !== undefined && props.acBonus !== null) {
          const bonus = Number(props.acBonus);
          const armorOnly = !!props.acBonusArmorOnly;
          // Apply if: (requires armor and we have it) OR (does not require armor)
          if (!armorOnly || (armorOnly && armor)) {
            finalAc += bonus;
          }
        }
      });
    });

    // - Magic Items (additive AC bonuses)
    inventory.filter((s: any) => s.equipped && s.item.properties?.bonusAc).forEach((s: any) => {
      finalAc += Number(s.item.properties.bonusAc);
    });

    return finalAc;
  }

  private hasFeature(data: any, names: string[], className?: string): boolean {
    return this.getAllCharacterFeatures(data).some(f => {
      const matchName = names.some(n => f.name.toLowerCase().includes(n.toLowerCase()));
      if (!className) return matchName;
      // Also check subclasses if class name matches
      const featClassName = (f.dndClass?.name || '').toLowerCase();
      return matchName && featClassName.includes(className.toLowerCase());
    });
  }

  /**
   * Returns all features and traits that the character currently possesses
   * based on their levels and race, respecting the new schema.
   */
  private getAllCharacterFeatures(data: any): any[] {
    const allFeats: any[] = [];
    
    // 1. Race traits
    if (data.dndRace?.traits) {
      allFeats.push(...data.dndRace.traits);
    }

    // 2. Class and Subclass features (respecting current levels)
    if (data.classLevels && data.classLevels.length > 0) {
      data.classLevels.forEach((cl: any) => {
        const classFeats = [
          ...(cl.dndClass?.features || []),
          ...(cl.dndClass?.classFeatures?.features || []),
          ...this.extractSubclassFeatures(cl.subclass?.subclassFeatures)
        ];
        // Attach class name to features for context-aware mechanics
        const mapped = classFeats
          .filter(f => parseInt(f.levelRequired, 10) <= cl.level)
          .map(f => ({ ...f, _className: cl.dndClass.name }));
        allFeats.push(...mapped);
      });
    } else {
      // Fallback
      const classFeats = [
        ...(data.dndClass?.features || []),
        ...(data.dndClass?.classFeatures?.features || []),
        ...this.extractSubclassFeatures(data.subclass?.subclassFeatures)
      ];
      const mapped = classFeats
        .filter(f => parseInt(f.levelRequired, 10) <= (data.level || 1))
        .map(f => ({ ...f, _className: data.dndClass?.name }));
      allFeats.push(...mapped);
    }

    // 3. Attach selected options ( Fighting Styles, Eldritch Invocations, etc.)
    return allFeats.map(f => {
      const selectedOptions = (data.choicesJson?.featureOptions?.[f.name] || []);
      return { ...f, selectedOptions };
    });
  }

  getActionTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'ACTION': 'Acción',
      'BONUS_ACTION': 'Acción Adicional',
      'REACTION': 'Reacción',
      'NO_ACTION': 'Sin Acción',
      'SPECIAL': 'Especial',
      'PASSIVE': 'Pasivo'
    };
    return map[type] || '';
  }
}



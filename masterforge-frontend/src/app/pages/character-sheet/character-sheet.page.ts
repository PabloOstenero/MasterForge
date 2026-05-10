import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonBadge, IonList, IonIcon, IonButton, IonFooter, IonBackButton, IonButtons,
  AlertController, ActionSheetController, ModalController, IonSearchbar, IonModal
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';
import { addIcons } from 'ionicons';
import { statsChart, sparkles, shield, briefcase, trash, add, addCircleOutline, trashOutline, syncOutline, book, bookOutline, settingsOutline } from 'ionicons/icons';

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
    IonIcon, IonButton, IonFooter, IonBackButton, IonButtons, IonSearchbar, IonModal
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

  // We initialize with default values so that the screen doesn't break while waiting for the backend
  pj: any = {
    name: 'Cargando...',
    level: 0,
    dndClass: '...',
    subclass: '...',
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    armorClass: 0,
    speed: 0,
    proficiencyBonus: 0, // Nuevo
    initiative: 0,       // Nuevo
    passivePerception: 0, // Nuevo
    hitDiceTotal: 0,
    hitDiceSpent: 0,
    hitDieType: 8,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
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
    preparationStyle: 'KNOWN'
  };

  private characterId: string | null = null;

  // Inyectamos el servicio en el constructor
  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController
  ) {
    addIcons({
      'stats-chart': statsChart,
      'sparkles': sparkles,
      'shield': shield,
      'briefcase': briefcase,
      'trash': trash,
      'add': add,
      'add-circle-outline': addCircleOutline,
      'trash-outline': trashOutline,
      'sync-outline': syncOutline,
      'book': book,
      'book-outline': bookOutline,
      'settings-outline': settingsOutline
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
  }

  // --- BACKEND CONNECTION LOGIC ---
  loadCharacter(id: string) {
    this.apiService.getCharacter(id).subscribe({
      next: (data) => {
        console.log('Raw data from DB:', data);

        // Calculate final stats including racial bonuses first
        // Use base stats directly (Character Forge already adds racial bonuses before saving)
        const stats: any = {
          str: data.baseStr || 10,
          dex: data.baseDex || 10,
          con: data.baseCon || 10,
          int: data.baseInt || 10,
          wis: data.baseWis || 10,
          cha: data.baseCha || 10
        };

        // Dex modifier calculation for AC: (Score - 10) / 2
        const dexMod = Math.floor((stats.dex - 10) / 2);
        const wisMod = Math.floor((stats.wis - 10) / 2);

        // Cálculo del Bono de Competencia
        const proficiencyBonus = Math.floor((data.level - 1) / 4) + 2;

        // --- CÁLCULO DINÁMICO DE CA (REGLAS 5E) ---
        const inventorySlots = data.inventory || [];
        const equippedArmor = inventorySlots.find((s: any) => s.equipped && s.item.type === 'ARMOR');
        const equippedShield = inventorySlots.find((s: any) => s.equipped && s.item.type === 'SHIELD');

        let baseAc = 10;
        let appliedDexMod = dexMod;

        if (equippedArmor) {
          const props = equippedArmor.item.properties || {};
          baseAc = props.baseAc || 10;
          if (props.dexBonus === false) appliedDexMod = 0;
          else if (typeof props.dexLimit === 'number' && props.dexLimit !== null) appliedDexMod = Math.min(dexMod, props.dexLimit);
        }

        const shieldBonus = equippedShield ? (equippedShield.item.properties?.acBonus || 2) : 0;
        const finalAc = baseAc + appliedDexMod + (data.dndRace?.bonusArmorClass || 0) + shieldBonus;

        // Cálculo de Percepción Pasiva
        const isPerceptionProficient = !!data.skillProficiencies?.perception;
        const passivePerception = 10 + wisMod + (isPerceptionProficient ? proficiencyBonus : 0);

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
          choicesJson: data.choicesJson || {},
          maxHp: data.maxHp ?? 10,
          currentHp: data.currentHp ?? 10,
          tempHp: data.tempHp || 0,
          speed: data.speed || 30,
          proficiencyBonus: proficiencyBonus,
          passivePerception: passivePerception,
          initiative: dexMod,
          armorClass: finalAc,
          hitDiceTotal: data.hitDiceTotal || 0,
          deathSaves: { success: 0, failure: 0 },
          hitDiceSpent: data.hitDiceSpent || 0,
          hitDieType: data.dndClass?.hitDie || 8,
          stats: stats,
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
          features: [
            ...(data.dndClass?.features || []),
            ...this.extractSubclassFeatures(data.subclass?.subclassFeatures)
          ].map(f => ({
            ...f,
            selectedOptions: (data.choicesJson?.featureOptions?.[f.name] || [])
          })),
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
          preparationStyle: data.dndClass?.classFeatures?.['spellcasting']?.['preparationStyle'] || 'KNOWN'
        };
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
          text: 'Guardar',
          handler: (data) => {
            const val = parseInt(data.amount, 10);
            if (!isNaN(val) && val >= 0 && this.characterId) {
              this.pj.tempHp = val;
              this.apiService.updateTempHp(this.characterId, val).subscribe({
                next: () => console.log('Temporary HP updated successfully in DB'),
                error: (err: any) => console.error("Error updating temporary HP:", err)
              });
            }
          }
        }
      ]
    });
    await alert.present();
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
      isSubclassFeature: true   // flag for optional styling in the template
    }));
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

  // --- UI LOGIC ---

  // Cambia de pestaña (Atributos, Inventario, Magia)
  segmentChanged(event: any) {
    this.currentTab = event.detail.value;
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
              this.pj.currentHp = Math.min(this.pj.maxHp, this.pj.currentHp + heal);
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
  getMaxSpellLevel(): number {
    let max = 0;
    // Iterate through slots level_1 to level_9
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
    
    // Extract names and descriptions of spells granted by race to exempt them from the filter
    const racialTraitsText = (this.pj.traits || [])
    const groups: any = {};
    this.pj.spells.forEach((cs: any) => {
      if (!cs || !cs.spell) return;
      
      const level = cs.spell.level;
      
      // Filter out spells higher than character's capacity
      if (Number(level) > maxLevel && level !== '0') return;
      
      if (!groups[level]) groups[level] = [];
      groups[level].push(cs);
    });
    return Object.keys(groups).sort((a, b) => Number(a) - Number(b)).map(level => ({
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

  // Helper to get weapon attack bonus (Stat + Proficiency + magical bonus)
  getAttackBonus(item: any): string {
    const stat = item.properties?.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    const magical = Number(item.properties?.magicalBonus) || 0;
    const total = mod + (this.pj.proficiencyBonus || 0) + magical;
    return total >= 0 ? `+${total}` : `${total}`;
  }

  // Builds the full damage string from the homebrew item's separate fields.
  // e.g. "2d6+3 Slashing" from { damageDiceCount:2, damageDieType:'d6', damageBonus:3, damageType:['Slashing'], ... }
  getWeaponDamage(item: any): string {
    const p = item.properties || {};
    const stat = p.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const statMod = Math.floor((score - 10) / 2);
    const magical = Number(p.magicalBonus) || 0;
    const damageBonus = Number(p.damageBonus) || 0;
    const totalBonus = statMod + magical + damageBonus;
    const bonusPart = totalBonus > 0 ? `+${totalBonus}` : totalBonus < 0 ? `${totalBonus}` : '';

    // Compose normal dice portion
    const count = p.damageDiceCount ?? null;
    const die = p.damageDieType ?? null;
    let dicePart = '';
    if (count && die) {
      dicePart = `${count}${die}`;
    } else if (p.damageDice) {
      dicePart = p.damageDice; // legacy free-text fallback
    }

    // Compose versatile dice portion (two-handed damage)
    const vCount = p.versatileDiceCount ?? null;
    const vDie = p.versatileDieType ?? null;
    const versatilePart = (vCount && vDie) ? `(${vCount}${vDie}) ` : '';

    // Damage type: stored as array by the homebrew form
    let dmgType = '';
    if (Array.isArray(p.damageType) && p.damageType.length > 0) {
      dmgType = p.damageType[0];
    } else if (typeof p.damageType === 'string' && p.damageType) {
      dmgType = p.damageType;
    }

    const fullDice = dicePart + versatilePart + bonusPart;
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
    // Forzamos a que el valor se convierta en número por seguridad
    const num = Number(score);
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
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
}
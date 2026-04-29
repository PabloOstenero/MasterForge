import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, 
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonBadge, IonList, IonIcon, IonButton, IonFooter, IonBackButton, IonButtons,
  AlertController
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';
import { addIcons } from 'ionicons';
import { statsChart, sparkles, shield, briefcase, trash, add } from 'ionicons/icons';

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
    IonIcon, IonButton, IonFooter, IonBackButton, IonButtons
  ],
  encapsulation: ViewEncapsulation.None // Re-enabled to allow styling the Alert pop-ups
})
export class CharacterSheetPage implements OnInit {

  // Controls which tab we are viewing (Stats, Inventory, Magic)
  currentTab: string = 'stats';

  // Skills dictionary
  skills = DND_SKILLS;
  
  statLabels: any = { str: 'FU', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

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
    deathSaves: { success: 0, failure: 0 },
    skillProficiencies: {}, // Matches the Map structure from the backend
    savingThrowsProficiencies: {}
  };

  private characterId: string | null = null;

  // Inyectamos el servicio en el constructor
  constructor(
    private apiService: ApiService, 
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {
    addIcons({ statsChart, sparkles, shield, briefcase, trash, add });
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
        const stats: any = {
          str: (data.baseStr || 10) + (data.dndRace?.bonusStr || 0),
          dex: (data.baseDex || 10) + (data.dndRace?.bonusDex || 0),
          con: (data.baseCon || 10) + (data.dndRace?.bonusCon || 0),
          int: (data.baseInt || 10) + (data.dndRace?.bonusInt || 0),
          wis: (data.baseWis || 10) + (data.dndRace?.bonusWis || 0),
          cha: (data.baseCha || 10) + (data.dndRace?.bonusCha || 0)
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
          // Si es armadura pesada (dexBonus: false) o tiene límite (dexLimit)
          if (props.dexBonus === false) appliedDexMod = 0;
          else if (typeof props.dexLimit === 'number' && props.dexLimit !== null) appliedDexMod = Math.min(dexMod, props.dexLimit);
        }

        const shieldBonus = equippedShield ? (equippedShield.item.properties?.acBonus || 2) : 0;
        const finalAc = baseAc + appliedDexMod + (data.dndRace?.bonusArmorClass || 0) + shieldBonus;

        // Cálculo de Percepción Pasiva (10 + Modificador de Sabiduría + Bono de Competencia si es competente en Percepción)
        const isPerceptionProficient = !!data.skillProficiencies?.perception;
        const passivePerception = 10 + wisMod + (isPerceptionProficient ? proficiencyBonus : 0);

        // Combine base class saving throws with character specific ones
        const classSaves = data.dndClass?.savingThrows || {};
        const charSaves = data.savingThrowsProficiencies || {};
        const mergedSaves = { ...classSaves, ...charSaves };

        // Mapeamos los datos de la base de datos a la estructura que espera nuestro HTML
        this.pj = {
          name: data.name,
          level: data.level,
          dndClass: data.dndClass?.name || 'Aventurero', 
          subclass: data.subclass?.name || 'Sin subclase',
          choicesJson: data.choicesJson || {},
          maxHp: data.maxHp ?? data.max_hp ?? 10,
          currentHp: Number(data.currentHp ?? data.current_hp ?? 10),
          // Defensive check for camelCase and snake_case mapping for Temp HP
          tempHp: data.tempHp ?? data.temp_hp ?? 0,
          armorClass: finalAc,
          speed: data.speed ?? 30,
          proficiencyBonus: proficiencyBonus,
          initiative: dexMod,
          passivePerception: passivePerception,
          hitDiceTotal: data.hitDiceTotal || 0,
          deathSaves: { success: 0, failure: 0 }, // Initial state
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
          skillProficiencies: data.skillProficiencies || {}, // Look up from the data map
          savingThrowsProficiencies: mergedSaves
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
      next: () => {},
      error: (err) => console.error("Error updating money:", err)
    });
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

  // Helper to get weapon attack bonus (Stat + Proficiency)
  getAttackBonus(item: any): string {
    const stat = item.properties?.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    const total = mod + (this.pj.proficiencyBonus || 0);
    return total >= 0 ? `+${total}` : `${total}`;
  }

  // Helper to get damage modifier string
  getDamageMod(item: any): string {
    const stat = item.properties?.stat || 'str';
    const score = this.pj.stats[stat] || 10;
    const mod = Math.floor((score - 10) / 2);
    if (mod === 0) return '';
    return mod > 0 ? `+${mod}` : `${mod}`;
  }

  // Calcula el modificador de tirada de salvación (Modificador de Stat + Competencia si aplica)
  getSavingThrowMod(statKey: string): string {
    const baseScore = this.pj.stats[statKey] || 10;
    const baseMod = Math.floor((Number(baseScore) - 10) / 2);
    
    const isProficient = !!this.pj.savingThrowsProficiencies?.[statKey];
    const profBonus = this.pj.proficiencyBonus || 0; // Usamos el bono de competencia ya calculado
    
    const total = isProficient ? baseMod + profBonus : baseMod;
    return total >= 0 ? `+${total}` : `${total}`;
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
      next: () => {},
      error: (err) => {
        console.error('Error detallado de MasterForge:', err);
      }
    });
  }

  private updateHitDiceOnBackend() {
    if (!this.characterId) return;
    
    const spentValue = Math.floor(Number(this.pj.hitDiceSpent));
    
    this.apiService.updateHitDice(this.characterId!, spentValue).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error actualizando dados de golpe:', err);
      }
    });
  }
}
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, 
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonBadge, IonList, IonIcon, IonButton, IonFooter, AlertController
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';
import { addIcons } from 'ionicons';
import { statsChart, sparkles, shield } from 'ionicons/icons';

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
    IonIcon, IonButton, IonFooter
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
    armorClass: 0,
    speed: 0,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    gold: 0,
    inventory: [],
    skillProficiencies: {} // Matches the Map structure from the backend
  };

  private characterId: string | null = null;

  // Inyectamos el servicio en el constructor
  constructor(
    private apiService: ApiService, 
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {
    addIcons({ statsChart, sparkles, shield });
  }

  ngOnInit() {
    // ⚠️ ATENCIÓN: Pega aquí el ID larguísimo (UUID) de un personaje que hayas creado en Postman
    const routeId = this.route.snapshot.paramMap.get('id');
    
    // Solo llamamos a la base de datos si hemos puesto un ID válido
    if (routeId) {
      console.log("Abriendo ficha del personaje ID:", routeId);
      this.characterId = routeId; // Store the ID for later updates
      this.loadCharacter(routeId);
    } else {
      console.error("No se ha pasado ningún ID en la URL");
    }
  }

  // --- BACKEND CONNECTION LOGIC ---
  loadCharacter(id: string) {
    this.apiService.getCharacter(id).subscribe({
      next: (data) => {
        console.log('Datos puros de PostgreSQL:', data);
        
        // Calculate final stats including racial bonuses first
        const stats = {
          str: (data.baseStr || 10) + (data.dndRace?.bonusStr || 0),
          dex: (data.baseDex || 10) + (data.dndRace?.bonusDex || 0),
          con: (data.baseCon || 10) + (data.dndRace?.bonusCon || 0),
          int: (data.baseInt || 10) + (data.dndRace?.bonusInt || 0),
          wis: (data.baseWis || 10) + (data.dndRace?.bonusWis || 0),
          cha: (data.baseCha || 10) + (data.dndRace?.bonusCha || 0)
        };

        // Dex modifier calculation for AC: (Score - 10) / 2
        const dexMod = Math.floor((stats.dex - 10) / 2);

        // Mapeamos los datos de la base de datos a la estructura que espera nuestro HTML
        this.pj = {
          name: data.name,
          level: data.level,
          // Añadimos el "?" por si la relación viene nula no nos dé error
          dndClass: data.dndClass?.name || 'Aventurero', 
          subclass: data.subclass?.name || 'Sin subclase',
          // Intentamos leer camelCase o snake_case para evitar NaN
          maxHp: data.maxHp || data.max_hp || 10,
          currentHp: Number((data.currentHp !== undefined) ? data.currentHp : (data.current_hp !== undefined ? data.current_hp : 10)),
          // AC = Base Armor Value (from DB) + Final Dex Modifier + Racial AC Bonuses
          armorClass: (data.armorClass || 10) + dexMod + (data.dndRace?.bonusArmorClass || 0),
          speed: data.speed,
          stats: stats,
          gold: data.gp, // Mapeamos las monedas de oro
          inventory: data.inventory ? data.inventory.map((slot: any) => ({
          name: slot.item.name,
          quantity: slot.quantity,
          equipped: slot.isEquipped
          })) : [],
          skillProficiencies: data.skillProficiencies || {} // Look up from the data map
        };
      },
      error: (err) => {
        console.error("Error crítico al cargar la ficha del personaje", err);
        alert("No se ha podido conectar con la base de datos de MasterForge.");
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

  // Calculates the skill modifier (Stat Mod + Proficiency if applicable)
  getSkillMod(skill: any): string {
    const baseScore = this.pj.stats[skill.stat] || 10;
    const baseMod = Math.floor((Number(baseScore) - 10) / 2);
    
    const isProficient = !!this.pj.skillProficiencies?.[skill.id];
    const profBonus = Math.floor((this.pj.level - 1) / 4) + 2;
    
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
  private updateCharacterHpOnBackend() {
    if (!this.characterId) {
      console.error('Character ID is not available for HP update.');
      return;
    }

    const hpValue = Math.floor(Number(this.pj.currentHp));
    console.log(`Enviando actualización de HP a la BD: ID=${this.characterId}, HP=${hpValue}`);

    // Assuming apiService.updateCharacterHp exists and takes characterId and newHp
    this.apiService.updateCharacterHp(this.characterId, hpValue).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error detallado de MasterForge:', err);
      }
    });
  }
}
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, 
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonItem, IonBadge, IonList, IonIcon, IonButton
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-character-sheet',
  templateUrl: './character-sheet.page.html',
  styleUrls: ['./character-sheet.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonSegment, IonSegmentButton, IonLabel, IonGrid, IonRow, IonCol, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonBadge, IonList, IonIcon, IonButton
  ]
})
export class CharacterSheetPage implements OnInit {

  // Controls which tab we are viewing (Stats, Inventory, Magic)
  currentTab: string = 'stats'; 

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
    inventory: []
  };

  // Inyectamos el servicio en el constructor
  constructor(private apiService: ApiService) { }

  ngOnInit() {
    // ⚠️ ATENCIÓN: Pega aquí el ID larguísimo (UUID) de un personaje que hayas creado en Postman
    const idDePrueba = 'a545080f-4585-4e2c-bce6-786b3f791aa0'; 
    
    // Solo llamamos a la base de datos si hemos puesto un ID válido
    if (idDePrueba == 'a545080f-4585-4e2c-bce6-786b3f791aa0') {
      this.loadCharacter(idDePrueba);
    }
  }

  // --- BACKEND CONNECTION LOGIC ---
  loadCharacter(id: string) {
    this.apiService.getCharacter(id).subscribe({
      next: (data) => {
        console.log('Datos puros de PostgreSQL:', data);
        
        // Mapeamos los datos de la base de datos a la estructura que espera nuestro HTML
        this.pj = {
          name: data.name,
          level: data.level,
          // Añadimos el "?" por si la relación viene nula no nos dé error
          dndClass: data.dndClass?.name || 'Aventurero', 
          subclass: data.subclass?.name || 'Sin subclase',
          maxHp: data.maxHp,
          currentHp: data.currentHp,
          armorClass: data.armorClass,
          speed: data.speed,
          stats: {
            str: data.baseStr,
            dex: data.baseDex,
            con: data.baseCon,
            int: data.baseInt,
            wis: data.baseWis,
            cha: data.baseCha
          },
          gold: data.gp, // Mapeamos las monedas de oro
          inventory: data.inventory ? data.inventory.map((slot: any) => ({
          name: slot.item.name,
          quantity: slot.quantity,
          equipped: slot.isEquipped
          })) : []
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

  // Calcula el modificador de D&D a partir de la puntuación base (Ej: 16 -> +3)
  getMod(score: any): string {
    // Forzamos a que el valor se convierta en número por seguridad
    const num = Number(score); 
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }
}
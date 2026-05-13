import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonBadge,
  IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonModal,
  IonSpinner, IonList, IonItem, IonLabel, IonNote, IonButtons, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  skull, heart, shield, addCircle, eye, search, 
  close, map, informationCircle, arrowForward,
  star, flash, helpCircle
} from 'ionicons/icons';
import { ApiService, CampaignDetailDto } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { getModifier } from '../../utils/dnd-utils';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-bestiary',
  templateUrl: './bestiary.page.html',
  styleUrls: ['./bestiary.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonBadge, IonSearchbar, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonModal, IonSpinner, IonList, IonItem, 
    IonLabel, IonNote, IonButtons, IonFooter, RouterLink
  ],
})
export class BestiaryPage implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  allMonsters: any[] = [];
  filteredMonsters: any[] = [];
  loading = true;
  searchTerm = '';

  // Campaign Selection Modal
  isCampaignModalOpen = false;
  selectedMonsterToStore: any = null;
  myCampaigns: CampaignDetailDto[] = [];
  loadingCampaigns = false;

  // Details Modal
  isDetailsModalOpen = false;
  selectedMonster: any = null;

  constructor() {
    addIcons({ 
      skull, heart, shield, 'add-circle': addCircle, eye, search, 
      close, map, 'information-circle': informationCircle, 
      'arrow-forward': arrowForward, star, flash, 'help-circle': helpCircle
    });
  }

  ngOnInit() {
    this.loadMonsters();
  }

  loadMonsters() {
    this.loading = true;
    this.apiService.getMonsters().subscribe({
      next: (monsters) => {
        this.allMonsters = monsters;
        this.filteredMonsters = monsters;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading monsters:', err);
        this.loading = false;
        this.notificationService.showError('No se pudieron cargar los monstruos.');
      }
    });
  }

  filterMonsters(event: any) {
    const query = event.detail.value.toLowerCase();
    this.searchTerm = query;
    this.filteredMonsters = this.allMonsters.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.type.toLowerCase().includes(query) ||
      m.challengeRating.toString().includes(query)
    );
  }

  openDetails(monster: any) {
    this.selectedMonster = monster;
    this.isDetailsModalOpen = true;
  }

  openCampaignSelection(monster: any) {
    this.selectedMonsterToStore = monster;
    this.loadMyCampaigns();
    this.isCampaignModalOpen = true;
  }

  loadMyCampaigns() {
    this.loadingCampaigns = true;
    console.log('Fetching campaigns for DM...');
    this.apiService.getDmCampaigns().subscribe({
      next: (campaigns) => {
        console.log('Campaigns received:', campaigns);
        this.myCampaigns = campaigns || [];
        this.loadingCampaigns = false;
        if (this.myCampaigns.length === 0) {
          console.warn('No campaigns found for this user in /campaigns/my');
        }
      },
      error: (err) => {
        console.error('Error loading campaigns:', err);
        this.loadingCampaigns = false;
        this.notificationService.showError('No se pudieron cargar tus campañas.');
      }
    });
  }

  addToCampaign(campaign: CampaignDetailDto) {
    if (!this.selectedMonsterToStore) return;

    // 1. Initialize or get combat state
    const state = campaign.combatState || {
      participants: [],
      turnIndex: -1,
      isCombatActive: false,
      round: 1
    };

    // 2. Prepare the monster participant
    const monster = this.selectedMonsterToStore;
    const count = state.participants.filter((p: any) => p.id === monster.id).length;
    const name = count > 0 ? `${monster.name} ${count + 1}` : monster.name;
    const instanceId = `${monster.id}-${Date.now()}`;

    const newParticipant = {
      instanceId: instanceId,
      id: monster.id,
      name: name,
      initiative: 0,
      currentHp: monster.hitPoints,
      maxHp: monster.hitPoints,
      tempHp: 0,
      type: 'MONSTER',
      dexMod: getModifier(monster.dex),
      isTurn: false,
      armorClass: monster.armorClass || 10,
      description: `${monster.size} ${monster.type}`
    };

    // 3. Update state
    state.participants.push(newParticipant);

    // 4. Save
    this.apiService.updateCombatState(campaign.id, state).subscribe({
      next: () => {
        this.notificationService.showSuccess(`${monster.name} añadido a ${campaign.name}`);
        this.isCampaignModalOpen = false;
      },
      error: (err) => {
        console.error('Error updating combat state:', err);
        this.notificationService.showError('Error al añadir el monstruo a la campaña.');
      }
    });
  }

  // --- Helper Methods for Stat Block (Ported from CombatTracker) ---

  getModifier(val: number): string {
    if (val === undefined || val === null) return '+0';
    const mod = Math.floor((val - 10) / 2);
    return (mod >= 0 ? '+' : '') + mod;
  }

  getSavingThrow(attr: string, val: number): string {
    const mechanics = this.selectedMonster?.combatMechanics;
    if (!mechanics) return this.getModifier(val);
    
    const saves = mechanics.savingThrows || mechanics.saves || mechanics.saving_throws || {};
    const key = attr.toLowerCase();
    
    const s = saves[key] ?? saves[`${key}_save`] ?? saves[this.getFullAttrName(key)];
    if (s !== undefined) return (s >= 0 ? '+' : '') + s;
    
    return this.getModifier(val);
  }

  getFullAttrName(short: string): string {
    const map: any = { 
      'str': 'strength', 'dex': 'dexterity', 'con': 'constitution', 
      'int': 'intelligence', 'wis': 'wisdom', 'cha': 'charisma' 
    };
    return map[short] || short;
  }

  getListMechanic(type: string): string {
    const m = this.selectedMonster?.combatMechanics;
    if (!m) return '—';
    
    const keys = [
      type, 
      `damage${type.charAt(0).toUpperCase() + type.slice(1)}`, 
      `damage_${type}`, 
      `${type}_damage`, 
      type.replace('resistances', 'resistance').replace('immunities', 'immunity').replace('vulnerabilities', 'vulnerability')
    ];

    let val: any = null;
    for (const k of keys) {
      if (m[k] !== undefined) {
        val = m[k];
        break;
      }
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return '—';
      return val.map(v => typeof v === 'object' ? (v.name || JSON.stringify(v)) : v).join(', ');
    }
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val)
        .map(([key, v]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${v}`)
        .join(', ');
    }
    return val || '—';
  }

  formatSenses(): string {
    const senses = this.selectedMonster?.combatMechanics?.senses || this.selectedMonster?.combatMechanics?.sense;
    if (!senses) return '—';
    if (typeof senses === 'string') return senses;
    if (typeof senses === 'object') {
      return Object.entries(senses)
        .filter(([key]) => key !== 'languages')
        .map(([key, val]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${val}`)
        .join(', ');
    }
    return '—';
  }

  getSkills(): string {
    const mechanics = this.selectedMonster?.combatMechanics;
    if (!mechanics) return '—';
    const skills = mechanics.skills || mechanics.skill_proficiencies || mechanics.skills_proficiencies;
    if (!skills) return '—';
    
    if (Array.isArray(skills)) {
      return skills.map((s: any) => {
        if (typeof s === 'object') {
          const name = s.name || s.skill || 'Skill';
          const bonus = s.bonus !== undefined ? s.bonus : s.value;
          return `${name}: ${bonus >= 0 ? '+' : ''}${bonus}`;
        }
        return s;
      }).join(', ');
    }
    
    if (typeof skills === 'object') {
      return Object.entries(skills)
        .map(([name, bonus]: [string, any]) => `${name}: ${bonus >= 0 ? '+' : ''}${bonus}`)
        .join(', ');
    }
    return skills;
  }

  getMechanics(type: string): any[] {
    if (!this.selectedMonster || !this.selectedMonster.combatMechanics) return [];
    const mechanics = this.selectedMonster.combatMechanics;
    
    let list: any[] = [];
    if (type === 'traits') list = mechanics.abilities || mechanics.traits || mechanics.special_abilities || mechanics.features || mechanics.special_traits || [];
    if (type === 'actions') list = mechanics.actions || mechanics.attacks || mechanics.action_list || [];
    if (type === 'reactions') list = mechanics.reactions || mechanics.reaction_list || [];
    if (type === 'legendaryActions') list = mechanics.legendary_actions || mechanics.legendaryActions || mechanics.legendary_action_list || [];
    
    return (Array.isArray(list) ? list : []).map(item => {
      let desc = item.desc || item.description || item.text || '';
      
      const bonusVal = item.attackBonus !== undefined ? item.attackBonus : item.attack_bonus;
      const diceVal = item.damageDice !== undefined ? item.damageDice : item.damage_dice;
      const damageBonusVal = item.damageBonus !== undefined ? item.damageBonus : item.damage_bonus;
      const typeVal = item.damageType !== undefined ? item.damageType : item.damage_type;
      const reachVal = item.reach !== undefined ? item.reach : item.range;

      return { 
        ...item, 
        desc,
        attackData: (bonusVal !== undefined || diceVal !== undefined) ? {
          bonus: bonusVal !== undefined ? `${bonusVal >= 0 ? '+' : ''}${bonusVal}` : null,
          damage: diceVal ? `${diceVal}${damageBonusVal ? (damageBonusVal >= 0 ? '+' : '') + damageBonusVal : ''}` : null,
          type: typeVal || null,
          reach: reachVal || null
        } : null
      };
    });
  }
}
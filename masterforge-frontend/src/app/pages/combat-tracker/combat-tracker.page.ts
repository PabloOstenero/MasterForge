import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonBadge,
  IonList, IonItem, IonLabel, IonNote, IonButtons, IonBackButton, IonInput,
  IonModal, IonSearchbar, IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  add, remove, shield, heart, flash, arrowForward, refresh, 
  trash, close, informationCircleOutline, skull, statsChart,
  addCircle, eyeOutline, handRightOutline, warningOutline, flashOutline,
  trashOutline
} from 'ionicons/icons';
import { ApiService, CampaignPlayerDto, CharacterSimpleDto } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { getModifier } from '../../utils/dnd-utils';

interface Participant {
  instanceId: string; // Unique ID for the tracker
  id: string; // Character ID or Monster Template ID
  name: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  tempHp: number;
  type: 'PLAYER' | 'MONSTER';
  dexMod: number;
  isTurn: boolean;
  armorClass: number;
  description?: string;
  hpChangeInput?: number;
}

@Component({
  selector: 'app-combat-tracker',
  templateUrl: './combat-tracker.page.html',
  styleUrls: ['./combat-tracker.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonBadge, IonList, IonItem, IonLabel, IonNote,
    IonButtons, IonBackButton, IonInput, IonModal, IonSearchbar, IonGrid,
    IonRow, IonCol, IonCard, IonCardContent, IonSelect, IonSelectOption
  ]
})
export class CombatTrackerPage implements OnInit {
  campaignId: string | null = null;
  participants: Participant[] = [];
  turnIndex: number = -1;
  isCombatActive: boolean = false;
  round: number = 1;

  // Monster Library Modal
  isMonsterModalOpen = false;
  allMonsters: any[] = [];
  filteredMonsters: any[] = [];
  searchTerm = '';
  // Campaign Characters
  campaignCharacters: any[] = [];
  isCharacterModalOpen = false;

  // Monster Details Modal
  isDetailsModalOpen = false;
  selectedMonster: any = null;

  // Access control
  accessDenied = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      add, remove, shield, heart, flash, 'arrow-forward': arrowForward, 
      refresh, trash, close, 'information-circle-outline': informationCircleOutline,
      skull, 'stats-chart': statsChart, 'add-circle': addCircle,
      'eye-outline': eyeOutline, 'hand-right-outline': handRightOutline,
      'warning-outline': warningOutline, 'flash-outline': flashOutline
    });
  }

  ngOnInit() {
    this.campaignId = this.route.snapshot.paramMap.get('id');
    if (this.campaignId) {
      this.checkAccessAndLoad();
    }
  }

  openMonsterModal() {
    this.isMonsterModalOpen = true;
    this.searchTerm = '';
    this.loadMonsterLibrary();
  }

  checkAccessAndLoad() {
    if (!this.campaignId) return;
    this.apiService.getCampaignById(this.campaignId).subscribe({
      next: (campaign) => {
        const userId = this.authService.getUserIdFromToken();
        // Campaign owner is the DM. Check if current user is the owner.
        if (campaign.owner?.id !== userId) {
          this.accessDenied = true;
        } else {
          let hasState = false;
          // If there is a saved combat state, load it.
          if (campaign.combatState && campaign.combatState.participants) {
            this.participants = campaign.combatState.participants;
            this.turnIndex = campaign.combatState.turnIndex ?? -1;
            this.isCombatActive = campaign.combatState.isCombatActive ?? false;
            this.round = campaign.combatState.round ?? 1;
            this.sortParticipants();
            hasState = true;
          }
          this.loadCampaignCharacters(hasState);
        }
      },
      error: () => this.accessDenied = true
    });
  }

  saveCombatState() {
    if (!this.campaignId) return;
    const state = {
      participants: this.participants,
      turnIndex: this.turnIndex,
      isCombatActive: this.isCombatActive,
      round: this.round
    };
    this.apiService.updateCombatState(this.campaignId, state).subscribe({
      error: (err) => console.error('Error saving combat state:', err)
    });
  }

  loadCampaignCharacters(hasState: boolean) {
    if (!this.campaignId) return;
    this.apiService.getCampaignPlayers(this.campaignId).subscribe({
      next: (players) => {
        this.campaignCharacters = [];
        players.forEach(p => {
          p.characters.forEach(c => {
            this.campaignCharacters.push({
              ...c,
              playerName: p.name
            });
            
            // If NOT loading from state, add to current participants
            if (!hasState) {
              this.loadFullCharacter(c.id);
            }
          });
        });
      }
    });
  }

  loadFullCharacter(charId: string) {
    this.apiService.getCharacter(charId).subscribe({
      next: (fullChar) => {
        const dexMod = getModifier(fullChar.baseDex + (fullChar.dndRace?.bonusDex || 0));
        this.participants.push({
          instanceId: fullChar.id,
          id: fullChar.id,
          name: fullChar.name,
          initiative: 0,
          currentHp: fullChar.currentHp,
          maxHp: fullChar.maxHp + (fullChar.bonusMaxHp || 0),
          tempHp: fullChar.tempHp || 0,
          type: 'PLAYER',
          dexMod: dexMod,
          isTurn: false,
          armorClass: fullChar.armorClass || 10
        });
        this.sortParticipants();
        this.saveCombatState();
      }
    });
  }

  loadMonsterLibrary() {
    this.apiService.getMonsters(this.searchTerm || undefined, undefined, undefined, 30).subscribe({
      next: (monsters) => {
        this.filteredMonsters = monsters;
      }
    });
  }

  filterMonsters(event: any) {
    const query = event?.detail?.value || '';
    this.searchTerm = query;
    this.loadMonsterLibrary();
  }

  addMonsterToCombat(monster: any) {
    const count = this.participants.filter(p => p.id === monster.id).length;
    const name = count > 0 ? `${monster.name} ${count + 1}` : monster.name;
    const instanceId = `${monster.id}-${Date.now()}`;

    this.participants.push({
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
      armorClass: monster.armorClass || 10
    });

    this.sortParticipants();
    this.saveCombatState();
    this.isMonsterModalOpen = false;
  }

  removeParticipant(instanceId: string) {
    this.participants = this.participants.filter(p => p.instanceId !== instanceId);
    if (this.isCombatActive && this.turnIndex >= this.participants.length) {
      this.turnIndex = 0;
    }
    this.saveCombatState();
    this.updateTurnDisplay();
  }

  sortParticipants() {
    // Sort by initiative (desc), then by dexMod (desc)
    this.participants.sort((a, b) => b.initiative - a.initiative || b.dexMod - a.dexMod);
  }

  updateHp(p: Participant, amount: number) {
    p.currentHp = Math.max(0, Math.min(p.maxHp, p.currentHp + amount));
    this.saveCombatState();
  }

  applyHpChange(p: Participant, sign: number) {
    const val = p.hpChangeInput;
    const amount = (val !== undefined && val !== null && !isNaN(val) && val !== 0) ? Math.abs(val) : 1;
    this.updateHp(p, sign * amount);
    p.hpChangeInput = undefined;
  }

  updateInitiative(p: Participant, value: any) {
    p.initiative = Number(value);
    this.sortParticipants();
    this.saveCombatState();
  }

  startCombat() {
    if (this.participants.length === 0) return;
    this.isCombatActive = true;
    this.turnIndex = 0;
    this.round = 1;
    this.updateTurnDisplay();
    this.saveCombatState();
  }

  nextTurn() {
    if (!this.isCombatActive || this.participants.length === 0) return;
    
    this.turnIndex++;
    if (this.turnIndex >= this.participants.length) {
      this.turnIndex = 0;
      this.round++;
    }
    
    this.updateTurnDisplay();
    this.saveCombatState();
  }

  resetCombat() {
    this.isCombatActive = false;
    this.turnIndex = -1;
    this.round = 1;
    
    // Filter out monsters, keep only players
    this.participants = this.participants.filter(p => p.type === 'PLAYER');
    
    // Reset player initiatives
    this.participants.forEach(p => {
      p.initiative = 0;
      p.isTurn = false;
    });
    
    this.saveCombatState();
  }

  updateTurnDisplay() {
    this.participants.forEach((p, index) => {
      p.isTurn = (index === this.turnIndex);
    });
  }


  openMonsterDetails(p: Participant) {
    if (p.type !== 'MONSTER') return;
    const cached = this.filteredMonsters.find(m => m.id === p.id);
    if (cached) {
      this.selectedMonster = cached;
      this.isDetailsModalOpen = true;
      return;
    }

    this.apiService.getMonsterById(p.id).subscribe({
      next: (monster) => {
        this.selectedMonster = monster;
        this.isDetailsModalOpen = true;
      },
      error: (err) => {
        console.error('Error fetching monster details:', err);
      }
    });
  }

  getMechanics(type: string): any[] {
    if (!this.selectedMonster || !this.selectedMonster.combatMechanics) return [];
    const mechanics = this.selectedMonster.combatMechanics;
    
    let list: any[] = [];
    if (type === 'traits') list = mechanics.abilities || mechanics.traits || mechanics.special_abilities || mechanics.features || mechanics.special_traits || [];
    if (type === 'actions') list = mechanics.actions || mechanics.attacks || mechanics.action_list || [];
    if (type === 'reactions') list = mechanics.reactions || mechanics.reaction_list || [];
    if (type === 'legendaryActions') list = mechanics.legendary_actions || mechanics.legendaryActions || mechanics.legendary_action_list || [];
    
    // Ensure each item has a description/desc field for the template
    return (Array.isArray(list) ? list : []).map(item => {
      let desc = item.desc || item.description || item.text || '';
      
      const bonusVal = item.attackBonus !== undefined ? item.attackBonus : item.attack_bonus;
      const diceVal = item.damageDice !== undefined ? item.damageDice : item.damage_dice;
      const damageBonusVal = item.damageBonus !== undefined ? item.damageBonus : item.damage_bonus;
      const typeVal = item.damageType !== undefined ? item.damageType : item.damage_type;
      const reachVal = item.reach !== undefined ? item.reach : item.range;

      // Add structured data for styling
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
    
    // Check common keys like 'str', 'str_save', 'strength'
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
    
    // Support multiple naming conventions based on user feedback
    const keys = [
      type, 
      `damage${type.charAt(0).toUpperCase() + type.slice(1)}`, // camelCase: damageImmunities
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
      // If array of objects, try to find a name property
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
        .filter(([key]) => key !== 'languages') // Filter out languages
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
}

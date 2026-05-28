import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonSpinner, IonList, IonItem, IonLabel, IonButton,
  IonSegment, IonSegmentButton, IonModal,
  IonToolbar, IonTitle, IonContent, IonIcon,
  IonFooter, IonSearchbar, IonPopover
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eye, close, skull, heart, shield, flash, star,
  informationCircle, book, colorWand, people, hammer,
  search, trash, pencil, checkmarkCircle, card, arrowDown
} from 'ionicons/icons';

import { HomebrewService, HomebrewSummary, HomebrewItem, ContentType } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationComponent } from '../search-campaigns/components/toast-notification/toast-notification.component';
import { getModifier } from '../../utils/dnd-utils';

@Component({
  selector: 'app-homebrew',
  templateUrl: './homebrew.page.html',
  styleUrls: ['./homebrew.page.scss'],
  standalone: true,
  imports: [
    IonSpinner, IonList, IonItem, IonLabel, IonButton,
    IonSegment, IonSegmentButton, IonModal,
    IonToolbar, IonTitle, IonContent, IonIcon,
    IonFooter, IonSearchbar, IonPopover,
    CommonModule, FormsModule, RouterLink,
    ToastNotificationComponent
  ]
})
export class HomebrewPage implements OnInit {

  selectedTab: 'mine' | 'community' = 'mine';
  selectedCategory: string = 'all';

  private _searchQuery: string = '';
  get searchQuery(): string {
    return this._searchQuery;
  }
  set searchQuery(value: string) {
    this._searchQuery = value;
    this.resetLimits();
  }

  categoryLimits: Record<string, number> = {
    classes: 6,
    subclasses: 6,
    races: 6,
    monsters: 6,
    spells: 6,
    items: 6
  };

  homebrewItems: HomebrewSummary = {
    classes: [], subclasses: [], races: [], monsters: [], spells: [], items: []
  };
  communityItems: HomebrewSummary = {
    classes: [], subclasses: [], races: [], monsters: [], spells: [], items: []
  };

  loading = false;
  error: string | null = null;
  deletingId: string | null = null;
  purchasingId: string | null = null;
  currentUser: any = null;

  sectionNames: Record<string, string> = {
    classes: 'Clases',
    subclasses: 'Subclases',
    races: 'Razas',
    monsters: 'Monstruos',
    spells: 'Hechizos',
    items: 'Objetos'
  };

  categoryIcons: Record<string, string> = {
    classes: 'book',
    subclasses: 'color-wand',
    races: 'people',
    monsters: 'skull',
    spells: 'flash',
    items: 'hammer'
  };

  // Preview Modal
  isPreviewModalOpen = false;
  selectedPreviewItem: HomebrewItem | null = null;
  previewDetails: any = null;
  loadingPreview = false;

  constructor(
    private homebrewService: HomebrewService,
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    addIcons({
      eye, close, skull, heart, shield, flash, star,
      'information-circle': informationCircle, book,
      'color-wand': colorWand, people, hammer, search, trash, pencil,
      'checkmark-circle': checkmarkCircle, card, 'arrow-down': arrowDown
    });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.resetLimits();
    this.loadContent();
  }

  loadContent(): void {
    if (this.selectedTab === 'mine') {
      this.loadMyHomebrew();
    } else {
      this.loadCommunityHomebrew();
    }
  }

  loadMyHomebrew(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      my: this.homebrewService.getMyHomebrew(),
      community: this.homebrewService.getCommunityHomebrew()
    }).subscribe({
      next: ({ my, community }) => {
        const merged: HomebrewSummary = {
          classes: [], subclasses: [], races: [], monsters: [], spells: [], items: []
        };
        const keys: (keyof HomebrewSummary)[] = ['classes', 'subclasses', 'races', 'monsters', 'spells', 'items'];
        for (const key of keys) {
          const myArr = my[key] || [];
          const ownedCommunityArr = (community[key] || []).filter(item => item.isOwned);
          
          const seenIds = new Set<string>();
          const combined: HomebrewItem[] = [];
          
          for (const item of myArr) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push({ ...item, isAuthor: true });
            }
          }
          for (const item of ownedCommunityArr) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push({ ...item, isAuthor: false });
            }
          }
          
          merged[key] = combined;
        }
        this.homebrewItems = merged;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar homebrew propio y adquirido', err);
        this.error = err?.message ?? 'Error al cargar el contenido homebrew';
        this.loading = false;
      }
    });
  }

  loadCommunityHomebrew(): void {
    this.loading = true;
    this.error = null;
    this.homebrewService.getCommunityHomebrew().subscribe({
      next: (data) => {
        this.communityItems = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar homebrew de la comunidad', err);
        this.error = err?.message ?? 'Error al cargar el contenido de la comunidad';
        this.loading = false;
      }
    });
  }

  onTabChange(event: any): void {
    this.selectedTab = event.detail.value;
    this.resetLimits();
    this.loadContent();
  }

  resetLimits(): void {
    const limit = this.selectedCategory === 'all' ? 6 : 30;
    this.categoryLimits = {
      classes: limit,
      subclasses: limit,
      races: limit,
      monsters: limit,
      spells: limit,
      items: limit
    };
  }

  getFilteredItemsFull(key: string): HomebrewItem[] {
    const currentItems = this.selectedTab === 'mine' ? this.homebrewItems : this.communityItems;
    const items = currentItems[key as keyof HomebrewSummary] || [];
    
    let filtered = items;
    if (this._searchQuery) {
      const query = this._searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => item.name.toLowerCase().includes(query));
    }
    return filtered;
  }

  getFilteredItems(key: string): HomebrewItem[] {
    const filtered = this.getFilteredItemsFull(key);
    const defaultLimit = this.selectedCategory === 'all' ? 6 : 30;
    const limit = this.categoryLimits[key] || defaultLimit;
    return filtered.slice(0, limit);
  }

  hasMoreItems(key: string): boolean {
    const filtered = this.getFilteredItemsFull(key);
    const defaultLimit = this.selectedCategory === 'all' ? 6 : 30;
    const limit = this.categoryLimits[key] || defaultLimit;
    return filtered.length > limit;
  }

  loadMoreItems(key: string): void {
    const increment = this.selectedCategory === 'all' ? 6 : 30;
    const currentLimit = this.categoryLimits[key] || increment;
    this.categoryLimits[key] = currentLimit + increment;
  }

  getCategoryCount(key: string): number {
    const currentItems = this.selectedTab === 'mine' ? this.homebrewItems : this.communityItems;
    const items = currentItems[key as keyof HomebrewSummary] || [];
    return items.length;
  }

  getFilteredTotalCount(): number {
    return ['classes', 'subclasses', 'races', 'monsters', 'spells', 'items']
      .reduce((sum, key) => sum + this.getFilteredItems(key).length, 0);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.resetLimits();
  }

  purchaseItem(item: HomebrewItem): void {
    if (item.price > (this.currentUser?.balance || 0)) {
      this.notificationService.showError(`Saldo insuficiente. El item cuesta ${item.price}€ y tienes ${this.currentUser?.balance || 0}€`);
      return;
    }

    const confirmPurchase = window.confirm(`¿Quieres adquirir "${item.name}" por ${item.price}€?`);
    if (!confirmPurchase) return;

    this.purchasingId = item.id;
    this.error = null;
    this.homebrewService.purchaseItem(item.contentType, item.id).subscribe({
      next: () => {
        item.isOwned = true;
        this.purchasingId = null;
        this.notificationService.showSuccess(`¡"${item.name}" adquirido correctamente!`);
        this.authService.getMe().subscribe(user => this.currentUser = user);
      },
      error: (err) => {
        console.error('Error al adquirir item', err);
        this.notificationService.showError(err?.error?.message ?? 'Error al adquirir el item');
        this.purchasingId = null;
      }
    });
  }

  canManageItem(item: HomebrewItem): boolean {
    return this.selectedTab === 'mine' && item.isAuthor === true;
  }

  navigateToCreate(type: ContentType): void {
    const routeMap: Record<ContentType, string> = {
      CLASS:    '/homebrew/class/new',
      SUBCLASS: '/homebrew/subclass/new',
      RACE:     '/homebrew/race/new',
      MONSTER:  '/homebrew/monster/new',
      SPELL:    '/homebrew/spell/new',
      ITEM:     '/homebrew/item/new',
    };
    this.router.navigate([routeMap[type]]);
  }

  navigateToEdit(type: ContentType, id: string): void {
    const editMap: Record<ContentType, string> = {
      CLASS:    `/homebrew/class/${id}/edit`,
      SUBCLASS: `/homebrew/subclass/${id}/edit`,
      RACE:     `/homebrew/race/${id}/edit`,
      MONSTER:  `/homebrew/monster/${id}/edit`,
      SPELL:    `/homebrew/spell/${id}/edit`,
      ITEM:     `/homebrew/item/${id}/edit`,
    };
    this.router.navigate([editMap[type]]);
  }

  navigateToEditItem(item: HomebrewItem): void {
    if (!this.canManageItem(item)) {
      return;
    }

    this.navigateToEdit(item.contentType, item.id);
  }

  confirmDelete(item: HomebrewItem): void {
    if (!this.canManageItem(item)) {
      return;
    }

    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar "${item.name}"?`);
    if (confirmed) {
      this.deleteItem(item);
    }
  }

  deleteItem(item: HomebrewItem): void {
    if (!this.canManageItem(item)) {
      return;
    }

    this.deletingId = item.id;
    this.error = null;

    this.homebrewService.deleteItem(item.contentType, item.id).subscribe({
      next: () => {
        const listKeyMap: Record<ContentType, keyof HomebrewSummary> = {
          CLASS:    'classes',
          SUBCLASS: 'subclasses',
          RACE:     'races',
          MONSTER:  'monsters',
          SPELL:    'spells',
          ITEM:     'items',
        };
        const key = listKeyMap[item.contentType];
        this.homebrewItems = {
          ...this.homebrewItems,
          [key]: this.homebrewItems[key].filter(i => i.id !== item.id),
        };
        this.deletingId = null;
      },
      error: (err) => {
        console.error('Error al eliminar el item homebrew', err);
        this.error = err?.error?.message ?? err?.message ?? 'Error al eliminar el contenido homebrew';
        this.deletingId = null;
      }
    });
  }

  previewItem(item: HomebrewItem): void {
    this.selectedPreviewItem = item;
    this.loadingPreview = true;
    this.isPreviewModalOpen = true;
    this.previewDetails = null;

    const detailObs = this.getDetailObservable(item.contentType, item.id);
    if (!detailObs) {
      this.loadingPreview = false;
      return;
    }

    detailObs.subscribe({
      next: (details) => {
        this.previewDetails = details;
        this.loadingPreview = false;
      },
      error: (err) => {
        console.error('Error loading preview details', err);
        this.error = 'No se pudieron cargar los detalles del item';
        this.loadingPreview = false;
      }
    });
  }

  private getDetailObservable(type: ContentType, id: string) {
    switch (type) {
      case 'CLASS':    return this.homebrewService.getClass(id);
      case 'SUBCLASS': return this.homebrewService.getSubclass(id);
      case 'RACE':     return this.homebrewService.getRace(id);
      case 'MONSTER':  return this.homebrewService.getMonster(id);
      case 'SPELL':    return this.homebrewService.getSpell(id);
      case 'ITEM':     return this.homebrewService.getItem(id);
      default:         return null;
    }
  }

  closePreview(): void {
    this.isPreviewModalOpen = false;
    this.selectedPreviewItem = null;
    this.previewDetails = null;
  }

  // --- Stat Block Helpers (Mostly for Monsters) ---
  getModifier(val: number): string {
    if (val === undefined || val === null) return '+0';
    const mod = Math.floor((val - 10) / 2);
    return (mod >= 0 ? '+' : '') + mod;
  }

  getSavingThrow(attr: string, val: number): string {
    const mechanics = this.previewDetails?.combatMechanics;
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
    const m = this.previewDetails?.combatMechanics;
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
    const senses = this.previewDetails?.combatMechanics?.senses || this.previewDetails?.combatMechanics?.sense;
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
    const mechanics = this.previewDetails?.combatMechanics;
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
    if (!this.previewDetails || !this.previewDetails.combatMechanics) return [];
    const mechanics = this.previewDetails.combatMechanics;
    
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

  getSavingThrowsString(): string {
    const attrMap: { [key: string]: string } = {
      'str': 'Fue', 'strength': 'Fue',
      'dex': 'Des', 'dexterity': 'Des',
      'con': 'Con', 'constitution': 'Con',
      'int': 'Int', 'intelligence': 'Int',
      'wis': 'Sab', 'wisdom': 'Sab',
      'cha': 'Car', 'charisma': 'Car'
    };
    
    const attrOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    
    const mechanics = this.previewDetails?.combatMechanics;
    if (!mechanics) return '';
    
    const saves = mechanics.savingThrows || mechanics.saves || mechanics.saving_throws;
    if (!saves || typeof saves !== 'object') return '';
    
    const entries = Object.entries(saves);
    if (entries.length === 0) return '';
    
    const formatted = entries
      .map(([key, bonus]: [string, any]) => {
        const shortKey = key.toLowerCase().substring(0, 3);
        const displayName = attrMap[key.toLowerCase()] || attrMap[shortKey] || key;
        const b = typeof bonus === 'number' ? bonus : parseInt(bonus);
        if (isNaN(b)) return null;
        return {
          key: shortKey,
          display: `${displayName} ${b >= 0 ? '+' : ''}${b}`
        };
      })
      .filter((item): item is { key: string, display: string } => item !== null);
      
    formatted.sort((a, b) => {
      const idxA = attrOrder.indexOf(a.key);
      const idxB = attrOrder.indexOf(b.key);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
    
    return formatted.map(f => f.display).join(', ');
  }

  getChallengeXp(cr: any): string {
    if (cr === undefined || cr === null) return '0';
    const numericCr = typeof cr === 'string' ? parseFloat(cr) : cr;
    
    const xpMap: { [key: number]: string } = {
      0: '10',
      0.125: '25',
      0.25: '50',
      0.5: '100',
      1: '200',
      2: '450',
      3: '700',
      4: '1,100',
      5: '1,800',
      6: '2,300',
      7: '2,900',
      8: '3,900',
      9: '5,000',
      10: '5,900',
      11: '7,200',
      12: '8,400',
      13: '10,000',
      14: '11,500',
      15: '13,000',
      16: '15,000',
      17: '18,000',
      18: '20,000',
      19: '22,000',
      20: '25,000',
      21: '33,000',
      22: '41,000',
      23: '50,000',
      24: '62,000',
      25: '75,000',
      26: '90,000',
      27: '105,000',
      28: '120,000',
      29: '135,000',
      30: '155,000'
    };

    return xpMap[numericCr] || '—';
  }

  getClassFeatures(): any[] {
    if (!this.previewDetails) return [];
    
    // 1. Try to get from the 'features' list directly (Hibernate relationship)
    if (Array.isArray(this.previewDetails.features) && this.previewDetails.features.length > 0) {
      return this.previewDetails.features;
    }
    
    // 2. If empty, check the JSON-serialized properties
    if (this.selectedPreviewItem?.contentType === 'CLASS') {
      return this.previewDetails.classFeatures?.features || [];
    }
    
    if (this.selectedPreviewItem?.contentType === 'SUBCLASS') {
      const sf = this.previewDetails.subclassFeatures;
      return sf?.features || sf?.subclassFeatureEntries || [];
    }
    
    return [];
  }

  getSavingThrowsList(): string {
    if (!this.previewDetails || !this.previewDetails.savingThrows) return '—';
    return Object.entries(this.previewDetails.savingThrows)
      .filter(([_, value]) => value === true)
      .map(([key]) => key)
      .join(', ');
  }

  getItemRarityAndAttunement(item: any): string {
    if (!item) return '';
    const p = item.properties || {};
    const parts: string[] = [];
    
    let typeStr = item.type || 'Objeto';
    if (typeStr === 'Weapon') typeStr = 'Arma';
    else if (typeStr === 'Armor') typeStr = 'Armadura';
    else if (typeStr === 'Shield') typeStr = 'Escudo';
    else if (typeStr === 'Potion') typeStr = 'Poción';
    else if (typeStr === 'Ammunition') typeStr = 'Munición';
    else if (typeStr === 'Wondrous Item') typeStr = 'Objeto maravilloso';
    else if (typeStr === 'Ring') typeStr = 'Anillo';
    else if (typeStr === 'Rod') typeStr = 'Bastón';
    else if (typeStr === 'Staff') typeStr = 'Báculo';
    else if (typeStr === 'Wand') typeStr = 'Varita';
    else if (typeStr === 'Adventuring Gear') typeStr = 'Equipo de aventuras';
    else if (typeStr === 'Tool') typeStr = 'Herramienta';
    else if (typeStr === 'Mount') typeStr = 'Montura';
    else if (typeStr === 'Vehicle') typeStr = 'Vehículo';
    else if (typeStr === 'Treasure') typeStr = 'Tesoro';

    let rarityStr = p.rarity || '';
    if (rarityStr) {
      const rMap: Record<string, string> = {
        'Common': 'común',
        'Uncommon': 'infrecuente',
        'Rare': 'rara',
        'Very Rare': 'muy rara',
        'Legendary': 'legendaria',
        'Artifact': 'artefacto'
      };
      rarityStr = rMap[rarityStr] || rarityStr.toLowerCase();
    }

    if (rarityStr) {
      parts.push(`${typeStr}, ${rarityStr}`);
    } else {
      parts.push(typeStr);
    }

    if (p.requiresAttunement) {
      let attuneStr = 'requiere sintonización';
      if (p.attunementBy) {
        attuneStr += ` por ${p.attunementBy}`;
      }
      parts.push(`(${attuneStr})`);
    }

    return parts.join(' ');
  }

  getItemPropertiesList(item: any): any[] {
    if (!item) return [];
    const p = item.properties || {};
    const props: any[] = [];

    if (item.weight !== undefined && item.weight !== null) {
      props.push({ label: 'Peso', value: `${item.weight} lb.` });
    }
    if (p.valueGp !== undefined && p.valueGp !== null) {
      props.push({ label: 'Valor', value: `${p.valueGp} po` });
    }

    const itemType = item.type;
    if (itemType === 'Weapon') {
      if (p.damageDieType) {
        const diceCount = p.damageDiceCount || 1;
        const bonus = (p.damageBonus || 0) + (p.magicalBonus || 0);
        const bonusStr = bonus !== 0 ? `+${bonus}` : '';
        const typeStr = p.damageType?.[0] ? ` ${this.translateDamageType(p.damageType[0])}` : '';
        props.push({ label: 'Daño', value: `${diceCount}${p.damageDieType}${bonusStr}${typeStr}` });
      }
      if (p.versatileDieType) {
        const diceCount = p.versatileDiceCount || 1;
        const bonus = (p.damageBonus || 0) + (p.magicalBonus || 0);
        const bonusStr = bonus !== 0 ? `+${bonus}` : '';
        const typeStr = p.damageType?.[0] ? ` ${this.translateDamageType(p.damageType[0])}` : '';
        props.push({ label: 'Daño Versátil', value: `${diceCount}${p.versatileDieType}${bonusStr}${typeStr}` });
      }
      if (p.rangeNormal) {
        props.push({ label: 'Alcance', value: `${p.rangeNormal}/${p.rangeLong || '—'} pies` });
      }
      if (p.stat) {
        props.push({ label: 'Aptitud', value: p.stat === 'dex' ? 'Destreza' : 'Fuerza' });
      }
      if (p.weaponProperties?.length > 0) {
        props.push({ label: 'Propiedades', value: p.weaponProperties.map((pr: string) => this.translateWeaponProperty(pr)).join(', ') });
      }
      if (p.attackBonus !== undefined || p.magicalBonus > 0) {
        const atk = (p.attackBonus || 0) + (p.magicalBonus || 0);
        if (atk > 0) {
          props.push({ label: 'Bono de Ataque', value: `+${atk}` });
        }
      }
    } else if (itemType === 'Armor') {
      if (p.baseAc !== undefined) {
        const ac = (p.baseAc || 0) + (p.magicalBonus || 0);
        props.push({ label: 'CA', value: `${ac}` });
      }
      if (p.armorCategory) {
        props.push({ label: 'Categoría', value: this.translateArmorCategory(p.armorCategory) });
      }
      props.push({ label: 'Bono DES', value: p.dexBonus ? (p.dexLimit ? `Sí (máx +${p.dexLimit})` : 'Sí') : 'No' });
      props.push({ label: 'Sigilo', value: p.stealthDisadvantage ? 'Desventaja' : 'Normal' });
      if (p.strengthRequirement) {
        props.push({ label: 'Fuerza requerida', value: `${p.strengthRequirement}` });
      }
    } else if (itemType === 'Shield') {
      if (p.acBonus !== undefined) {
        const ac = (p.acBonus || 0) + (p.magicalBonus || 0);
        props.push({ label: 'Bono de CA', value: `+${ac}` });
      }
    } else if (itemType === 'Potion') {
      if (p.healingDieType) {
        const diceCount = p.healingDiceCount || 1;
        const bonus = p.healingAmount || 0;
        const bonusStr = bonus !== 0 ? `+${bonus}` : '';
        props.push({ label: 'Curación', value: `${diceCount}${p.healingDieType}${bonusStr}` });
      }
    } else if (['Wondrous Item', 'Ring', 'Rod', 'Staff', 'Wand'].includes(itemType)) {
      if (p.charges !== undefined && p.charges !== null) {
        let rechargeStr = '';
        if (p.recharge) {
          const rOpts: Record<string, string> = {
            'SHORT_REST': 'descanso corto',
            'LONG_REST': 'descanso largo',
            'MANUAL': 'manual'
          };
          rechargeStr = ` (recarga: ${rOpts[p.recharge] || p.recharge})`;
        }
        props.push({ label: 'Cargas', value: `${p.charges}${rechargeStr}` });
      }
    } else if (itemType === 'Ammunition') {
      if (p.damageBonus !== undefined || p.magicalBonus > 0) {
        const bonus = (p.damageBonus || 0) + (p.magicalBonus || 0);
        props.push({ label: 'Bono de daño', value: `+${bonus}` });
      }
    }

    return props;
  }

  getItemBuffsList(item: any): string[] {
    if (!item) return [];
    const p = item.properties || {};
    const buffs: string[] = [];

    const stats = [
      { key: 'Str', label: 'FUE' },
      { key: 'Dex', label: 'DES' },
      { key: 'Con', label: 'CON' },
      { key: 'Int', label: 'INT' },
      { key: 'Wis', label: 'SAB' },
      { key: 'Cha', label: 'CAR' }
    ];

    for (const s of stats) {
      const bonus = p[`bonus${s.key}`];
      if (bonus !== undefined && bonus !== null) {
        buffs.push(`${s.label} +${bonus}`);
      }
      const override = p[`override${s.key}`];
      if (override !== undefined && override !== null) {
        buffs.push(`${s.label} fijado en ${override}`);
      }
    }

    if (p.bonusMaxHp !== undefined && p.bonusMaxHp !== null) {
      buffs.push(`Puntos de vida máx +${p.bonusMaxHp}`);
    }

    return buffs;
  }

  translateDamageType(t: string): string {
    const map: Record<string, string> = {
      'acid': 'ácido', 'bludgeoning': 'contundente', 'cold': 'frío', 'fire': 'fuego',
      'force': 'fuerza', 'lightning': 'relámpago', 'necrotic': 'necrótico', 'piercing': 'perforante',
      'poison': 'veneno', 'psychic': 'psíquico', 'radiant': 'radiante', 'slashing': 'cortante',
      'thunder': 'trueno', 'Acid': 'ácido', 'Bludgeoning': 'contundente', 'Cold': 'frío', 'Fire': 'fuego',
      'Force': 'fuerza', 'Lightning': 'relámpago', 'Necrotic': 'necrótico', 'Piercing': 'perforante',
      'Poison': 'veneno', 'Psychic': 'psíquico', 'Radiant': 'radiante', 'Slashing': 'cortante',
      'Thunder': 'trueno'
    };
    return map[t] || t;
  }

  translateWeaponProperty(pr: string): string {
    const map: Record<string, string> = {
      'Finesse': 'Sutil', 'Versatile': 'Versátil', 'Thrown': 'Arrojadiza', 'Range': 'A distancia',
      'Two-Handed': 'A dos manos', 'Light': 'Ligera', 'Heavy': 'Pesada', 'Reach': 'Alcance',
      'Loading': 'Recarga', 'Special': 'Especial', 'Ammunition': 'Munición'
    };
    return map[pr] || pr;
  }

  translateArmorCategory(c: string): string {
    const map: Record<string, string> = {
      'Light': 'Ligera', 'Medium': 'Media', 'Heavy': 'Pesada'
    };
    return map[c] || c;
  }

  getRaceSize(race: any): string {
    if (!race) return '—';
    const sz = race.size || race.raceFeatures?.size || 'Medium';
    const map: Record<string, string> = {
      'Tiny': 'Diminuto',
      'Small': 'Pequeño',
      'Medium': 'Mediano',
      'Large': 'Grande',
      'Huge': 'Enorme',
      'Gargantuan': 'Gargantuesco'
    };
    return map[sz] || sz;
  }

  getRaceSpeeds(race: any): string {
    if (!race) return '—';
    const s = race.raceFeatures?.speeds || race.speeds || {};
    const parts: string[] = [];
    if (s.walk) parts.push(`Caminar ${s.walk} pies`);
    if (s.swim) parts.push(`Nadar ${s.swim} pies`);
    if (s.climb) parts.push(`Escalar ${s.climb} pies`);
    if (s.fly) parts.push(`Volar ${s.fly} pies`);
    return parts.join(', ') || '—';
  }

  getRaceBonuses(race: any): string {
    if (!race) return '';
    const BONUS_LABELS = [
      { field: 'bonusStr', label: 'FUE' },
      { field: 'bonusDex', label: 'DES' },
      { field: 'bonusCon', label: 'CON' },
      { field: 'bonusInt', label: 'INT' },
      { field: 'bonusWis', label: 'SAB' },
      { field: 'bonusCha', label: 'CAR' },
    ];
    const parts = BONUS_LABELS
      .map(({ field, label }) => {
        const val = (race.raceFeatures && typeof race.raceFeatures[field] === 'number')
          ? race.raceFeatures[field]
          : (typeof race[field] === 'number' ? race[field] : 0);
        return { val, label };
      })
      .filter(({ val }) => val !== 0)
      .map(({ val, label }) => `${val > 0 ? '+' : ''}${val} ${label}`);
    
    const flex = race.raceFeatures?.flexibleAsi || race.flexibleAsi;
    if (flex) {
      const choices = flex.choicesCount || 1;
      parts.push(`+${flex.amount || 1} a elección (${choices})`);
    }

    return parts.join(', ') || 'Ninguno';
  }

  getRaceLanguages(race: any): string {
    if (!race) return '—';
    const rf = race.raceFeatures || {};
    const langs: string[] = [];
    if (Array.isArray(rf.languages?.fixed)) {
      rf.languages.fixed.forEach((l: string) => {
        langs.push(this.translateLanguage(l));
      });
    }
    if (rf.languages?.choiceCount > 0) {
      langs.push(`+${rf.languages.choiceCount} a elección`);
    }
    return langs.join(', ') || '—';
  }

  translateLanguage(l: string): string {
    const map: Record<string, string> = {
      'Common': 'Común', 'Dwarvish': 'Enano', 'Elvish': 'Élfico', 'Giant': 'Gigante',
      'Gnomish': 'Gnomo', 'Goblin': 'Goblin', 'Halfling': 'Mediano', 'Orc': 'Orco',
      'Abyssal': 'Abisal', 'Celestial': 'Celestial', 'Draconic': 'Dracónico',
      'Deep Speech': 'Habla Profunda', 'Infernal': 'Infernal', 'Primordial': 'Primordial',
      'Sylvan': 'Silvano', 'Undercommon': 'Infracomún'
    };
    return map[l] || l;
  }

  getRaceTraits(race: any): any[] {
    if (!race) return [];
    if (Array.isArray(race.traits) && race.traits.length > 0) {
      return race.traits;
    }
    if (Array.isArray(race.raceFeatures?.traits) && race.raceFeatures.traits.length > 0) {
      return race.raceFeatures.traits;
    }
    return [];
  }

  translateAbility(ability: string): string {
    if (!ability) return '—';
    const map: Record<string, string> = {
      'Strength': 'Fuerza',
      'Dexterity': 'Destreza',
      'Constitution': 'Constitución',
      'Intelligence': 'Inteligencia',
      'Wisdom': 'Sabiduría',
      'Charisma': 'Carisma',
      'str': 'Fuerza',
      'dex': 'Destreza',
      'con': 'Constitución',
      'int': 'Inteligencia',
      'wis': 'Sabiduría',
      'cha': 'Carisma'
    };
    return map[ability] || ability;
  }

  translateClassName(cls: string): string {
    if (!cls) return '—';
    const map: Record<string, string> = {
      'Barbarian': 'Bárbaro', 'Bard': 'Bardo', 'Cleric': 'Clérigo', 'Druid': 'Druida',
      'Fighter': 'Guerrero', 'Monk': 'Monje', 'Paladin': 'Paladín', 'Ranger': 'Explorador',
      'Rogue': 'Pícaro', 'Sorcerer': 'Hechicero', 'Warlock': 'Brujo', 'Wizard': 'Mago'
    };
    return map[cls] || cls;
  }

  translateSpellcastingType(type: string): string {
    if (!type) return '—';
    const map: Record<string, string> = {
      'Full Caster': 'Lanzador completo',
      'Half Caster': 'Medio lanzador',
      'Third Caster': 'Tercio de lanzador',
      'Pact Magic': 'Magia de pacto'
    };
    return map[type] || type;
  }

  translatePrepStyle(style: string): string {
    if (!style) return 'Conocidos';
    const map: Record<string, string> = {
      'PREPARED': 'Preparados',
      'KNOWN': 'Conocidos'
    };
    return map[style] || style;
  }

  formatProficienciesList(profs: string[]): string {
    if (!profs || profs.length === 0) return 'Ninguna';
    const map: Record<string, string> = {
      'Light Armor': 'Armadura ligera',
      'Medium Armor': 'Armadura media',
      'Heavy Armor': 'Armadura pesada',
      'Shields': 'Escudos',
      'Simple Weapons': 'Armas sencillas',
      'Martial Weapons': 'Armas marciales'
    };
    return profs.map(p => map[p] || p).join(', ');
  }

  formatSkillProficiencies(skills: any): string {
    if (!skills) return 'Ninguna';
    const parts: string[] = [];
    const map: Record<string, string> = {
      'Acrobatics': 'Acrobacias', 'Animal Handling': 'Trato con Animales', 'Arcana': 'Arcana',
      'Athletics': 'Atletismo', 'Deception': 'Engaño', 'History': 'Historia',
      'Insight': 'Perspicacia', 'Intimidation': 'Intimidación', 'Investigation': 'Investigación',
      'Medicine': 'Medicina', 'Nature': 'Naturaleza', 'Perception': 'Percepción',
      'Performance': 'Interpretación', 'Persuasion': 'Persuasión', 'Religion': 'Religión',
      'Sleight of Hand': 'Juego de Manos', 'Stealth': 'Sigilo', 'Survival': 'Supervivencia'
    };

    if (Array.isArray(skills.fixed) && skills.fixed.length > 0) {
      const fixedStr = skills.fixed.map((s: string) => map[s] || s).join(', ');
      parts.push(fixedStr);
    }

    if (skills.choiceCount > 0 && Array.isArray(skills.choicePool) && skills.choicePool.length > 0) {
      const poolStr = skills.choicePool.map((s: string) => map[s] || s).join(', ');
      parts.push(`Elige ${skills.choiceCount} de: [${poolStr}]`);
    } else if (skills.choiceCount > 0) {
      parts.push(`Elige ${skills.choiceCount} habilidades cualesquiera`);
    }

    return parts.join('; ') || 'Ninguna';
  }

  formatMulticlassRequirements(prereqs: any): string {
    if (!prereqs || !prereqs.requirements || prereqs.requirements.length === 0) return 'Ninguno';
    const requirements = prereqs.requirements.map((req: any) => {
      return `${this.translateAbility(req.ability)} ${req.minScore || 13}`;
    });
    const connector = prereqs.logic === 'OR' ? ' o ' : ' y ';
    return requirements.join(connector);
  }

  formatResistancesList(res: string[]): string {
    if (!res || res.length === 0) return 'Ninguna';
    const map: Record<string, string> = {
      'acid': 'ácido', 'bludgeoning': 'contundente', 'cold': 'frío', 'fire': 'fuego',
      'force': 'fuerza', 'lightning': 'relámpago', 'necrotic': 'necrótico', 'piercing': 'perforante',
      'poison': 'veneno', 'psychic': 'psíquico', 'radiant': 'radiante', 'slashing': 'cortante',
      'thunder': 'trueno', 'Acid': 'ácido', 'Bludgeoning': 'contundente', 'Cold': 'frío', 'Fire': 'fuego',
      'Force': 'fuerza', 'Lightning': 'relámpago', 'Necrotic': 'necrótico', 'Piercing': 'perforante',
      'Poison': 'veneno', 'Psychic': 'psíquico', 'Radiant': 'radiante', 'Slashing': 'cortante',
      'Thunder': 'trueno'
    };
    return res.map(r => map[r] || r).join(', ');
  }

  formatConditionsList(conds: string[]): string {
    if (!conds || conds.length === 0) return 'Ninguna';
    const map: Record<string, string> = {
      'Blinded': 'Cegado', 'Charmed': 'Encantado', 'Deafened': 'Ensordecido',
      'Exhaustion': 'Agotamiento', 'Frightened': 'Asustado', 'Grappled': 'Agarrado',
      'Incapacitated': 'Incapacitado', 'Invisible': 'Invisible', 'Paralyzed': 'Paralizado',
      'Petrified': 'Petrificado', 'Poisoned': 'Envenenado', 'Prone': 'Derribado',
      'Restrained': 'Apresado', 'Stunned': 'Aturdido', 'Unconscious': 'Inconsciente'
    };
    return conds.map(c => map[c] || c).join(', ');
  }

  formatExpandedSpells(spells: any[]): string {
    if (!spells || spells.length === 0) return 'Ninguno';
    return spells.map((s: any) => `${s.name} (Nvl ${s.level})`).join(', ');
  }



  get isPro(): boolean {
    return this.authService.isPro(this.currentUser);
  }

  get totalHomebrewCount(): number {
    const keys: (keyof HomebrewSummary)[] = ['classes', 'subclasses', 'races', 'monsters', 'spells', 'items'];
    return keys.reduce<number>((sum: number, key) => {
      const items = this.homebrewItems[key] || [];
      return sum + items.filter(item => item.isAuthor === true).length;
    }, 0);
  }

  get limitReached(): boolean {
    return !this.isPro && this.totalHomebrewCount >= 5;
  }
}

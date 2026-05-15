import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonSpinner, IonList, IonItem, IonLabel, IonButton,
  IonSegment, IonSegmentButton, IonModal, IonHeader,
  IonToolbar, IonTitle, IonContent, IonButtons, IonIcon,
  IonBadge, IonNote, IonGrid, IonRow, IonCol, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eye, close, skull, heart, shield, flash, star, informationCircle } from 'ionicons/icons';

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
    IonSegment, IonSegmentButton, IonModal, IonHeader,
    IonToolbar, IonTitle, IonContent, IonButtons, IonIcon,
    IonBadge, IonNote, IonGrid, IonRow, IonCol, IonFooter,
    CommonModule, FormsModule, RouterLink,
    ToastNotificationComponent
  ]
})
export class HomebrewPage implements OnInit {

  selectedTab: 'mine' | 'community' = 'mine';
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
    addIcons({ eye, close, skull, heart, shield, flash, star, 'information-circle': informationCircle });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
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
    this.homebrewService.getMyHomebrew().subscribe({
      next: (data) => {
        this.homebrewItems = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar homebrew propio', err);
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
    this.loadContent();
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

  confirmDelete(item: HomebrewItem): void {
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar "${item.name}"?`);
    if (confirmed) {
      this.deleteItem(item);
    }
  }

  deleteItem(item: HomebrewItem): void {
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
    const mod = getModifier(val);
    return (mod >= 0 ? '+' : '') + mod;
  }

  getSavingThrow(attr: string, val: number): string {
    const mechanics = this.previewDetails?.combatMechanics;
    if (!mechanics) return this.getModifier(val);
    const saves = mechanics.savingThrows || mechanics.saves || {};
    const key = attr.toLowerCase();
    const s = saves[key] ?? saves[`${key}_save`];
    return s !== undefined ? (s >= 0 ? '+' : '') + s : this.getModifier(val);
  }

  getListMechanic(type: string): string {
    const m = this.previewDetails?.combatMechanics;
    if (!m) return '—';
    const val = m[type];
    if (Array.isArray(val)) return val.length === 0 ? '—' : val.join(', ');
    return val || '—';
  }

  getMechanics(type: string): any[] {
    if (!this.previewDetails || !this.previewDetails.combatMechanics) return [];
    const mechanics = this.previewDetails.combatMechanics;
    let list: any[] = [];
    if (type === 'traits') list = mechanics.traits || mechanics.abilities || [];
    if (type === 'actions') list = mechanics.actions || [];
    if (type === 'reactions') list = mechanics.reactions || [];
    if (type === 'legendaryActions') list = mechanics.legendaryActions || [];
    return list;
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

  get isPro(): boolean {
    return this.authService.isPro(this.currentUser);
  }

  get totalHomebrewCount(): number {
    return (this.homebrewItems.classes?.length || 0) +
           (this.homebrewItems.subclasses?.length || 0) +
           (this.homebrewItems.races?.length || 0) +
           (this.homebrewItems.monsters?.length || 0) +
           (this.homebrewItems.spells?.length || 0) +
           (this.homebrewItems.items?.length || 0);
  }

  get limitReached(): boolean {
    return !this.isPro && this.totalHomebrewCount >= 5;
  }
}

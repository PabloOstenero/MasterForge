import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonSpinner, IonList, IonItem, IonLabel, IonButton
} from '@ionic/angular/standalone';

import { HomebrewService, HomebrewSummary, HomebrewItem, ContentType } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-homebrew',
  templateUrl: './homebrew.page.html',
  styleUrls: ['./homebrew.page.scss'],
  standalone: true,
  imports: [IonSpinner, IonList, IonItem, IonLabel, IonButton, CommonModule, FormsModule]
})
export class HomebrewPage implements OnInit {

  homebrewItems: HomebrewSummary = {
    classes: [],
    subclasses: [],
    races: [],
    monsters: [],
    spells: [],
    items: []
  };
  loading = false;
  error: string | null = null;
  deletingId: string | null = null;

  constructor(
    private homebrewService: HomebrewService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMyHomebrew();
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
        console.error('Error al cargar homebrew', err);
        this.error = err?.message ?? 'Error al cargar el contenido homebrew';
        this.loading = false;
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
    if (type === 'CLASS') {
      this.router.navigate([`/homebrew/class/${id}/edit`]);
    } else if (type === 'RACE') {
      this.router.navigate([`/homebrew/race/${id}/edit`]);
    } else if (type === 'MONSTER') {
      this.router.navigate([`/homebrew/monster/${id}/edit`]);
    } else if (type === 'SPELL') {
      this.router.navigate([`/homebrew/spell/${id}/edit`]);
    } else if (type === 'ITEM') {
      this.router.navigate([`/homebrew/item/${id}/edit`]);
    }
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
        // Map each ContentType to the corresponding list key in homebrewItems
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

}

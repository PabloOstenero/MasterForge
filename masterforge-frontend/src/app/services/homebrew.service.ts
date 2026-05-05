import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Types and interfaces
// ---------------------------------------------------------------------------

export type ContentType = 'CLASS' | 'SUBCLASS' | 'RACE' | 'MONSTER' | 'SPELL' | 'ITEM';

export interface HomebrewItem {
  id: string;
  name: string;
  contentType: ContentType;
}

export interface HomebrewSummary {
  classes: HomebrewItem[];
  subclasses: HomebrewItem[];
  races: HomebrewItem[];
  monsters: HomebrewItem[];
  spells: HomebrewItem[];
  items: HomebrewItem[];
}

export interface CreateClassDto {
  name: string;
  hitDie: number;
  savingThrows: Record<string, boolean>;
  price: number;
  authorId: string;
}

export interface CreateSubclassDto {
  name: string;
  description: string;
  parentClassId: number;
  authorId: string;
}

export interface CreateRaceDto {
  name: string;
  price: number;
  bonusStr: number;
  bonusDex: number;
  bonusCon: number;
  bonusInt: number;
  bonusWis: number;
  bonusCha: number;
  authorId: string;
}

export interface CreateMonsterDto {
  name: string;
  type: string;
  size: string;
  armorClass: number;
  hitPoints: number;
  speed: string;
  str: number;
  dex: number;
  con: number;
  intStat: number;
  wis: number;
  cha: number;
  challengeRating: number;
  xp: number;
  authorId: string;
}

export interface CreateSpellDto {
  name: string;
  level: number;
  school: string;
  description: string;
  authorId: string;
}

export interface CreateItemDto {
  name: string;
  type: string;
  weight: number;
  properties?: Record<string, any>;
  authorId: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class HomebrewService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getMyHomebrew(): Observable<HomebrewSummary> {
    return this.http.get<HomebrewSummary>('/api/homebrew/my');
  }

  getClasses(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>('/api/dnd-classes');
  }

  createClass(dto: CreateClassDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-classes', { ...dto, authorId });
  }

  createSubclass(dto: CreateSubclassDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-subclasses', { ...dto, authorId });
  }

  createRace(dto: CreateRaceDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-races', { ...dto, authorId });
  }

  createMonster(dto: CreateMonsterDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/monsters', { ...dto, authorId });
  }

  createSpell(dto: CreateSpellDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/spells', { ...dto, authorId });
  }

  createItem(dto: CreateItemDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/items', {
      ...dto,
      properties: dto.properties ?? {},
      authorId,
    });
  }

  deleteItem(type: ContentType, id: string): Observable<void> {
    const endpointMap: Record<ContentType, string> = {
      CLASS: `/api/dnd-classes/${id}`,
      SUBCLASS: `/api/dnd-subclasses/${id}`,
      RACE: `/api/dnd-races/${id}`,
      MONSTER: `/api/monsters/${id}`,
      SPELL: `/api/spells/${id}`,
      ITEM: `/api/items/${id}`,
    };
    return this.http.delete<void>(endpointMap[type]);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { ItemSummary, StructuredEquipment } from '../models/equipment.models';

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

export interface SkillProficiencies {
  fixed: string[];
  choicePool: string[];
  choiceCount: number;
}

export interface MulticlassingPrerequisite {
  ability: string;
  minScore: number;
}

export interface MulticlassingPrerequisites {
  requirements: MulticlassingPrerequisite[];
  logic: 'AND' | 'OR';
}

export interface MulticlassingProficiencies {
  armor: string[];
  weapons: string[];
  tools: string[];
}

export interface SpellSlotTable {
  slots: number[][];
}

export interface Spellcasting {
  ability: string;
  spellcastingType: string;
  ritualCasting: boolean;
  preparationStyle: 'PREPARED' | 'KNOWN';
  cantripsKnown: number[];
  spellsKnown?: number[];
  spellSlots: SpellSlotTable;
}

export interface ClassFeatures {
  primaryAbility: string;
  subclassLevel: number;
  startingEquipment?: string | StructuredEquipment;
  skillProficiencies: SkillProficiencies;
  weaponProficiencies: string[];
  armorProficiencies: string[];
  toolProficiencies: string[];
  multiclassingPrerequisites?: MulticlassingPrerequisites;
  multiclassingProficiencies?: MulticlassingProficiencies;
  spellcasting?: Spellcasting;
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
}

export interface CreateClassDto {
  name: string;
  description?: string;
  hitDie: string;
  savingThrows: Record<string, boolean>;
  price: number;
  classFeatures: ClassFeatures;
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
  description: string;
  size: string;
  bonusStr: number;
  bonusDex: number;
  bonusCon: number;
  bonusInt: number;
  bonusWis: number;
  bonusCha: number;
  raceFeatures: Record<string, any>;
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
  combatMechanics: Record<string, any>;
}

export interface CreateSpellDto {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialComponent: string;
  concentration: boolean;
  ritual: boolean;
  damageTypes: string;       // comma-separated, e.g. "Fire, Cold"
  savingThrow: string;       // e.g. "Dexterity" or "None"
  spellClasses: string;      // comma-separated, e.g. "Wizard, Sorcerer"
  higherLevelDescription: string;
  description: string;
  authorId: string | null;
}

export interface CreateItemDto {
  name: string;
  type: string;
  weight: number;
  properties?: Record<string, any>;
  authorId?: string;
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

  getClass(id: string): Observable<any> {
    return this.http.get<any>(`/api/dnd-classes/${id}`);
  }

  createClass(dto: CreateClassDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-classes', { ...dto, authorId });
  }

  updateClass(id: string, dto: CreateClassDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.put<any>(`/api/dnd-classes/${id}`, { ...dto, authorId });
  }

  createClassFeature(dto: { name: string; description: string; levelRequired: number; classId: number }): Observable<any> {
    const { classId, ...rest } = dto;
    return this.http.post<any>('/api/class-features', { ...rest, dndClassId: classId });
  }

  updateClassFeature(id: number, dto: { name: string; description: string; levelRequired: number; classId: number }): Observable<any> {
    const { classId, ...rest } = dto;
    return this.http.put<any>(`/api/class-features/${id}`, { ...rest, dndClassId: classId });
  }

  deleteClassFeature(id: number): Observable<void> {
    return this.http.delete<void>(`/api/class-features/${id}`);
  }

  createSubclass(dto: CreateSubclassDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-subclasses', { ...dto, authorId });
  }

  createRace(dto: CreateRaceDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/dnd-races', { ...dto, authorId });
  }

  getRace(id: string): Observable<any> {
    return this.http.get<any>(`/api/dnd-races/${id}`);
  }

  updateRace(id: string, dto: CreateRaceDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.put<any>(`/api/dnd-races/${id}`, { ...dto, authorId });
  }

  createRaceTrait(dto: { name: string; description: string; raceId: number }): Observable<any> {
    return this.http.post<any>('/api/race-traits', dto);
  }

  updateRaceTrait(id: number, dto: { name: string; description: string; raceId: number }): Observable<any> {
    return this.http.put<any>(`/api/race-traits/${id}`, dto);
  }

  deleteRaceTrait(id: number): Observable<void> {
    return this.http.delete<void>(`/api/race-traits/${id}`);
  }

  createMonster(dto: CreateMonsterDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/monsters', { ...dto, authorId });
  }

  getMonster(id: string): Observable<any> {
    return this.http.get<any>(`/api/monsters/${id}`);
  }

  updateMonster(id: string, dto: CreateMonsterDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.put<any>(`/api/monsters/${id}`, { ...dto, authorId });
  }

  getAllSpells(): Observable<any[]> {
    return this.http.get<any[]>('/api/spells');
  }

  createSpell(dto: CreateSpellDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/spells', { ...dto, authorId });
  }

  getSpell(id: string): Observable<any> {
    return this.http.get<any>(`/api/spells/${id}`);
  }

  updateSpell(id: string, dto: CreateSpellDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.put<any>(`/api/spells/${id}`, { ...dto, authorId });
  }

  getItem(id: string): Observable<any> {
    return this.http.get<any>(`/api/items/${id}`);
  }

  getAllItems(): Observable<ItemSummary[]> {
    return this.http.get<ItemSummary[]>('/api/items');
  }

  createItem(dto: CreateItemDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.post<any>('/api/items', {
      ...dto,
      properties: dto.properties ?? {},
      authorId,
    });
  }

  updateItem(id: string, dto: CreateItemDto): Observable<any> {
    const authorId = this.authService.getUserIdFromToken();
    return this.http.put<any>(`/api/items/${id}`, { ...dto, authorId });
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

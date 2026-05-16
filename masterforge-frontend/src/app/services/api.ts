import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // URL to the Kotlin backend
  private apiUrl = 'http://localhost:8080/api'; 
  
  constructor(private http: HttpClient) { }

  // Fetch the master list of all items in the system
  getAllItems(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/items`);
  }

  // Function to fetch users from the database
  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/users`);
  }

  // Function to create a new user in the database
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, userData);
  }

  // Function to fetch characters from the database
  getCharacter(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/characters/${id}`);
  }

  // Function to update character current HP
  updateCharacterHp(id: string, currentHp: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${id}/hp`, { currentHp: Number(currentHp) });
  }

  // Function to update character hit dice spent
  updateHitDice(id: string, hitDiceSpent: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${id}/hit-dice`, { hitDiceSpent: Number(hitDiceSpent) });
  }

  // Updates the character's money
  updateMoney(id: string, money: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${id}/money`, money);
  }

  // Toggles the equipped status of an item
  toggleEquip(charId: string, slotId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${charId}/inventory/${slotId}/toggle-equip`, {});
  }

  toggleAttune(charId: string, slotId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${charId}/inventory/${slotId}/toggle-attune`, {});
  }

  // Consumes one use of an item
  useItem(charId: string, slotId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${charId}/inventory/${slotId}/use`, {});
  }

  // Removes an item entirely from the inventory
  removeInventoryItem(charId: string, slotId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/characters/${charId}/inventory/${slotId}`);
  }

  // Adds a new item from the master list to the character
  addItemToInventory(charId: string, itemId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/characters/${charId}/inventory/${itemId}`, {});
  }

  // Fetches spells available for a character (filtered by class, excluding already known)
  getAvailableSpells(charId: string, level?: number): Observable<any[]> {
    let url = `${this.apiUrl}/characters/${charId}/available-spells`;
    if (level) url += `?level=${level}`;
    return this.http.get<any[]>(url);
  }

  // Adds a spell to the character's spellbook
  addSpellToCharacter(charId: string, spellId: string, isPrepared = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/characters/${charId}/spells`, { spellId, isPrepared });
  }

  // Removes a spell from the character's spellbook by CharacterSpell row ID
  removeSpellFromCharacter(charId: string, characterSpellId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/characters/${charId}/spells/${characterSpellId}`);
  }

  // Toggles the preparation status of a spell
  toggleSpellPrepare(charId: string, characterSpellId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${charId}/spells/${characterSpellId}/toggle-prepare`, {});
  }

  // Syncs all available class spells to the character
  syncClassSpells(charId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/characters/${charId}/spells/sync-class`, {});
  }

  // Deletes all unprepared spells for the character
  removeUnpreparedSpells(charId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/characters/${charId}/spells/unprepared`);
  }

  /**
 * Actualiza los puntos de vida temporales del personaje en la base de datos.
 * @param characterId UUID del personaje.
 * @param tempHp Cantidad de vida temporal a establecer.
 */
updateTempHp(characterId: string, tempHp: number): Observable<any> {
  // Cambiamos PATCH a PUT para mantener la consistencia con el resto de la API de MasterForge
  return this.http.put(`${this.apiUrl}/characters/${characterId}/temp-hp`, { tempHp: Number(tempHp) });
}

/**
 * Actualiza la vida máxima adicional (ej: hechizo 'Aid')
 * @param characterId UUID del personaje
 * @param bonusMaxHp Cantidad de vida máxima adicional
 */
updateBonusMaxHp(characterId: string, bonusMaxHp: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/characters/${characterId}/bonus-max-hp`, { bonusMaxHp: Number(bonusMaxHp) });
}

performLongRest(characterId: string): Observable<any> {
  return this.http.post(`${this.apiUrl}/characters/${characterId}/long-rest`, {});
}

levelUpCharacter(characterId: string, data: { hpBonus: number, statChanges: any, choicesJson: any, newSpells: string[], multiclassId: number | null, classToLevelId: number | null }): Observable<any> {
  return this.http.put(`${this.apiUrl}/characters/${characterId}/level-up`, data);
}

  updateSpellSlots(characterId: string, spellSlots: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${characterId}/spell-slots`, { spellSlots });
  }

  updateResourceCounters(characterId: string, resourceCounters: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${characterId}/resource-counters`, { resourceCounters });
  }

  getSpells(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/spells`);
  }

  // Fetch all campaigns
  getCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns`);
  }

  // Fetch only the campaigns owned by the authenticated DM
  getDmCampaigns(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/campaigns/my`);
  }

  // Create a new campaign
  createCampaign(dto: {
    name: string;
    description: string;
    ownerId: string;
    maxPlayers: number;
    joinPrice: number;
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/campaigns`, dto);
  }

  // Fetch all sessions
  getSessions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sessions`);
  }

  // Create a new session
  createSession(dto: { name: string; scheduledDate: string; price: number; campaignId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions`, dto);
  }

  // Authenticate user and retrieve JWT token
  login(email: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/auth/login`, { email, password });
  }

  // Fetch all monsters
  getMonsters(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/monsters`);
  }

  // Fetch the unique player count for the authenticated DM
  getPlayerCount(): Observable<{ playerCount: number }> {
    return this.http.get<{ playerCount: number }>(`${this.apiUrl}/users/me/player-count`);
  }

  // Fetch all available D&D races
  getRaces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dnd-races`);
  }

  // Fetch all available D&D classes
  getClasses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dnd-classes`);
  }

  // Fetch all available D&D subclasses, optionally filtered by class ID
  getSubclasses(classId?: number): Observable<any[]> {
    if (classId !== undefined) {
      return this.http.get<any[]>(`${this.apiUrl}/dnd-subclasses/class/${classId}`);
    }
    return this.http.get<any[]>(`${this.apiUrl}/dnd-subclasses`);
  }

  // Delete a character by ID
  deleteCharacter(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/characters/${id}`);
  }

  // Create a new character
  createCharacter(dto: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/characters`, dto);
  }

  // Fetch all characters for the authenticated user
  getCharactersByUser(userId: string): Observable<CharacterSummary[]> {
    return this.http.get<CharacterSummary[]>(`${this.apiUrl}/characters/user/${userId}`);
  }

  // Fetch the player's next scheduled session date
  getNextSession(): Observable<NextSessionDto> {
    return this.http.get<NextSessionDto>(`${this.apiUrl}/users/me/next-session`);
  }

  // Fetch the DM's next scheduled session (scoped to the DM's own campaigns)
  getDmNextSession(): Observable<DmNextSessionDto> {
    return this.http.get<DmNextSessionDto>(`${this.apiUrl}/users/me/dm-next-session`);
  }

  // Fetch the count of campaigns the player is enrolled in
  getActiveCampaigns(): Observable<ActiveCampaignsDto> {
    return this.http.get<ActiveCampaignsDto>(`${this.apiUrl}/users/me/active-campaigns`);
  }

  // Fetch the count of characters owned by the player
  getActiveCharacters(): Observable<ActiveCharactersDto> {
    return this.http.get<ActiveCharactersDto>(`${this.apiUrl}/users/me/active-characters`);
  }

  // Fetch the list of campaigns the player is enrolled in as an attendee
  getPlayerCampaigns(): Observable<PlayerCampaignSummary[]> {
    return this.http.get<PlayerCampaignSummary[]>(`${this.apiUrl}/users/me/player-campaigns`);
  }

  // Fetch the list of players (and their characters) in campaigns owned by the authenticated DM
  // Validates: Requirements 2.1
  getCampaignPlayers(): Observable<CampaignPlayerDto[]>;
  // Fetch the players enrolled in a specific campaign (with their campaign characters)
  // Validates: Requirements 3.3
  getCampaignPlayers(id: string): Observable<CampaignPlayerDto[]>;
  getCampaignPlayers(id?: string): Observable<CampaignPlayerDto[]> {
    if (id !== undefined) {
      return this.http.get<CampaignPlayerDto[]>(`${this.apiUrl}/campaigns/${id}/players`);
    }
    return this.http.get<CampaignPlayerDto[]>(`${this.apiUrl}/users/me/campaign-players`);
  }

  // Fetch the details of a specific campaign by ID
  // Validates: Requirements 3.1
  getCampaignById(id: string): Observable<CampaignDetailDto> {
    return this.http.get<CampaignDetailDto>(`${this.apiUrl}/campaigns/${id}`);
  }

  // Fetch the sessions for a specific campaign
  // Validates: Requirements 3.2
  getCampaignSessions(id: string): Observable<SessionSummaryDto[]> {
    return this.http.get<SessionSummaryDto[]>(`${this.apiUrl}/campaigns/${id}/sessions`);
  }

  // Assign a character to a campaign
  // Validates: Requirements 4.7
  assignCharacterToCampaign(characterId: string, campaignId: string): Observable<CharacterResponseDto> {
    return this.http.put<CharacterResponseDto>(
      `${this.apiUrl}/characters/${characterId}/campaign/${campaignId}`,
      {}
    );
  }

  // Create a character spell association
  createCharacterSpell(dto: { characterId: string; spellId: string; isPrepared: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/character-spells`, dto);
  }

  // Update campaign combat state
  updateCombatState(campaignId: string, combatState: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/campaigns/${campaignId}/combat-state`, combatState);
  }

}

// Interfaces for player summary cards
export interface NextSessionDto {
  nextSessionDate: string | null;
  campaignId: string | null;
}

// Interface for DM next session (scoped to DM's own campaigns)
export interface DmNextSessionDto {
  nextSessionDate: string | null;
  campaignId: string | null;
}

export interface ActiveCampaignsDto {
  activeCampaigns: number;
}

export interface ActiveCharactersDto {
  activeCharacters: number;
}

// Interface for character summary (used in My Characters page)
export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  dndClass: string;
  dndRace: string;
  subclass?: string;  // opcional, solo presente si el personaje tiene subclase
}

// Interface for player campaign summary (used in Player Dashboard Campaign_List)
// Validates: Requirement 5.2
export interface PlayerCampaignSummary {
  campaignId: string;
  campaignName: string;
  dmName: string;
  nextSessionDate: string | null;
}

// Interfaces for DM campaign players (used in DM Players page)
// Validates: Requirements 2.1
export interface CharacterSimpleDto {
  id: string;
  name: string;
  level: number;
  dndClass: string;
  dndRace: string;
}

export interface ClassFeatureDto {
  id: number | null;
  name: string;
  description: string;
  levelRequired: number;
  dndClassId: number;
  options?: any;
  properties?: any;
}

export interface RaceTraitDto {
  id: number | null;
  name: string;
  description: string;
  raceId: number;
  levelRequired: number;
  options?: any;
  properties?: any;
}

export interface CharacterSpellResponseDto {
  id: number | null;
  spell: any; // We can refine this if needed, but 'any' is safe for now given the complexity of SpellDto
  isPrepared: boolean;
}

export interface CampaignPlayerDto {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  discordUsername?: string;
  characters: CharacterSimpleDto[];
}

// Interface for campaign detail page (used in Campaign Detail Page)
// Validates: Requirements 3.4
export interface CampaignDetailDto {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
  joinPrice: number;
  visibility: string;
  owner: {
    id: string;
    name: string;
    email: string;
    discordUsername?: string;
  };
  combatState?: any;
}

// Interface for session summary (used in Campaign Detail Page)
// Validates: Requirements 3.5
export interface SessionSummaryDto {
  id: string;
  name: string;
  scheduledDate: string;
  price: number;
}

// Interface for character assignment response (used in Campaign Detail Page)
// Validates: Requirements 4.7
export interface CharacterResponseDto {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  bonusMaxHp: number;
  speed: number;
  hitDiceTotal: number;
  hitDiceSpent: number;
  background: string;
  alignment: string;
  xp: number;
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  baseStr: number;
  baseDex: number;
  baseCon: number;
  baseInt: number;
  baseWis: number;
  baseCha: number;
  savingThrowsProficiencies: Record<string, any>;
  skillProficiencies: Record<string, any>;
  spellSlots: Record<string, any>;
  dndRace: {
    id: number;
    name: string;
    bonusStr: number;
    bonusDex: number;
    bonusCon: number;
    bonusInt: number;
    bonusWis: number;
    bonusCha: number;
    traits: RaceTraitDto[];
    raceFeatures?: Record<string, any>;
  };
  dndClass: {
    id: number;
    name: string;
    hitDie: number;
    savingThrows: Record<string, any>;
    features: ClassFeatureDto[];
    classFeatures?: Record<string, any>;
  };
  campaign: { id: string } | null;
  subclass?: {
    id: number;
    name: string;
    subclassFeatures?: Record<string, any>;
  } | null;

  choicesJson: Record<string, any>;
  inventory: any[];
  spells: CharacterSpellResponseDto[];
}
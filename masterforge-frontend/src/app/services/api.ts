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

  /**
 * Actualiza los puntos de vida temporales del personaje en la base de datos.
 * @param characterId UUID del personaje.
 * @param tempHp Cantidad de vida temporal a establecer.
 */
updateTempHp(characterId: string, tempHp: number): Observable<any> {
  // Cambiamos PATCH a PUT para mantener la consistencia con el resto de la API de MasterForge
  return this.http.put(`${this.apiUrl}/characters/${characterId}/temp-hp`, { tempHp: Number(tempHp) });
}

  // Fetch all campaigns
  getCampaigns(): Observable<any> {
    return this.http.get(`${this.apiUrl}/campaigns`);
  }

  // Create a new campaign
  createCampaign(dto: { name: string; description: string; ownerId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/campaigns`, dto);
  }

  // Fetch all sessions
  getSessions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sessions`);
  }

  // Create a new session
  createSession(dto: { scheduledDate: string; price: number; campaignId: string }): Observable<any> {
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

}
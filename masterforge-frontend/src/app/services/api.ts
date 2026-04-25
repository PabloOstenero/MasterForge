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

  // Toggles the equipped status of an item
  toggleEquip(charId: string, slotId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/characters/${charId}/inventory/${slotId}/toggle-equip`, {});
  }
}
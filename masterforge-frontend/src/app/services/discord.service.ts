import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Service to handle Discord-related API operations.
 */
@Injectable({ providedIn: 'root' })
export class DiscordService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/discord`;

  /**
   * Fetches the Discord authorization URL from the backend.
   */
  getAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.baseUrl}/auth-url`);
  }

  /**
   * Sends the Discord authorization code and state to the backend to link the account.
   */
  callback(code: string, state: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/callback`, { params: { code, state } });
  }

  /**
   * Request the backend to unlink the current user's Discord account.
   */
  unlink(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/unlink`);
  }
}

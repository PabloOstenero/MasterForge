import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';

const TOKEN_KEY = 'mf_token';
const API_URL = 'http://localhost:8080/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Internal state for the logged-in user
  private _currentUser: any = null;

  constructor() {
    const savedUser = localStorage.getItem('mf_user');
    if (savedUser) this._currentUser = JSON.parse(savedUser);
  }

  login(email: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${API_URL}/auth/login`, { email, password });
  }

  storeToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  // Store user profile info (name, id, etc.)
  storeUser(user: any): void {
    this._currentUser = user;
    localStorage.setItem('mf_user', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Decodes the JWT to get the user ID (subject) stored in the token
  getUserIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub; // The 'sub' claim in your Kotlin backend is the UUID
    } catch (e) {
      return null;
    }
  }

  getCurrentUser(): any {
    return this._currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('mf_user');
    this._currentUser = null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  return next(req);
};

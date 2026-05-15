import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest, HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

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

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${API_URL}/auth/login`, { email, password });
  }

  setup2fa(): Observable<any> {
    return this.http.get(`${API_URL}/2fa/setup`);
  }

  enable2fa(secret: string, code: string): Observable<any> {
    return this.http.post(`${API_URL}/2fa/enable`, { secret, code }).pipe(
      tap((updatedUser: any) => this.storeUser(updatedUser))
    );
  }

  disable2fa(): Observable<any> {
    return this.http.post(`${API_URL}/2fa/disable`, {}).pipe(
      tap((updatedUser: any) => this.storeUser(updatedUser))
    );
  }

  verify2fa(mfaToken: string, code: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/verify-2fa`, { mfaToken, code });
  }

  register(name: string, email: string, passwordHash: string): Observable<any> {
    return this.http.post(`${API_URL}/users`, {
      name,
      email,
      passwordHash,
      subscriptionTier: 'FREE',
      balance: 0.0,
      isActive: true
    });
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

  fetchAndStoreUser(userId: string): Observable<any> {
    return this.http.get(`${API_URL}/users/${userId}`).pipe(
      tap((user: any) => this.storeUser(user))
    );
  }

  getMe(): Observable<any> {
    return this.http.get(`${API_URL}/users/me`).pipe(
      tap((user: any) => this.storeUser(user))
    );
  }

  updateMe(user: any): Observable<any> {
    return this.http.put(`${API_URL}/users/me`, user).pipe(
      tap((updatedUser: any) => this.storeUser(updatedUser))
    );
  }

  deleteMe(): Observable<any> {
    return this.http.delete(`${API_URL}/users/me`).pipe(
      tap(() => this.logout())
    );
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // exp is in seconds, Date.now() is in milliseconds
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('mf_user');
    this._currentUser = null;
  }

  isPro(user?: any): boolean {
    const u = user || this._currentUser;
    if (!u) return false;
    
    // Basic tier check
    if (u.subscriptionTier !== 'PRO') return false;
    
    // Date check (if present)
    if (!u.subscriptionExpiresAt) return true; // Assume active if tier is PRO but date is missing
    
    try {
      const expiry = new Date(u.subscriptionExpiresAt);
      return expiry > new Date();
    } catch (e) {
      console.error('Error parsing subscription date', e);
      return true; // Fallback to true if we can't parse but tier is PRO
    }
  }
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_KEY);

  // If token exists but is expired, clear it and redirect to login immediately
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('mf_user');
        router.navigate(['/login']);
        return throwError(() => new Error('Token expired'));
      }
    } catch (e) {
      // Malformed token — treat as expired
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('mf_user');
      router.navigate(['/login']);
      return throwError(() => new Error('Invalid token'));
    }

    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('mf_user');
          router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class PersistentNotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) { }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${environment.apiBaseUrl}/api/notifications/me`);
  }

  updateUnreadCount(): void {
    const token = localStorage.getItem('mf_token');
    if (!token) {
      this.unreadCountSubject.next(0);
      return;
    }
    this.http.get<{count: number}>(`${environment.apiBaseUrl}/api/notifications/me/unread-count`)
      .subscribe({
        next: (res) => this.unreadCountSubject.next(res.count),
        error: () => this.unreadCountSubject.next(0)
      });
  }

  markAsRead(id: string): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/notifications/${id}/read`, {}).pipe(
      tap(() => this.updateUnreadCount())
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/api/notifications/me/read-all`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/notifications/${id}`).pipe(
      tap(() => this.updateUnreadCount())
    );
  }
}

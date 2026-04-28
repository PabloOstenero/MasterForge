import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSegment, IonSegmentButton,
  IonGrid, IonRow, IonCol,
  IonSpinner,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel,
  IonFab, IonFabButton, IonIcon, IonAvatar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSegment, IonSegmentButton,
    IonGrid, IonRow, IonCol,
    IonSpinner,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel,
    IonFab, IonFabButton, IonIcon, IonAvatar,
  ],
})
export class InicioPage implements OnInit {

  activeRole: 'dm' | 'player' = 'dm';

  sessions: any[] = [];
  users: any[] = [];
  monsters: any[] = [];
  playerCount: number = 0;

  loadingSessions = true;
  loadingUsers = true;
  loadingMonsters = true;
  loadingPlayerCount = true;

  errorSessions: string | null = null;
  errorUsers: string | null = null;
  errorMonsters: string | null = null;
  errorPlayerCount: string | null = null;

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit() {
    forkJoin({
      sessions: this.api.getSessions(),
      users: this.api.getUsers(),
      monsters: this.api.getMonsters(),
      playerCount: this.api.getPlayerCount(),
    }).subscribe({
      next: ({ sessions, users, monsters, playerCount }) => {
        this.sessions = sessions;
        this.users = users;
        this.monsters = monsters;
        this.playerCount = playerCount.playerCount;
        this.loadingSessions = false;
        this.loadingUsers = false;
        this.loadingMonsters = false;
        this.loadingPlayerCount = false;
      },
      error: (err) => {
        const msg = err?.message ?? 'Error al cargar datos';
        this.errorSessions = msg;
        this.errorUsers = msg;
        this.errorMonsters = msg;
        this.errorPlayerCount = msg;
        this.loadingSessions = false;
        this.loadingUsers = false;
        this.loadingMonsters = false;
        this.loadingPlayerCount = false;
      },
    });
  }

  get nextSession(): any | null {
    const now = new Date();
    const future = this.sessions
      .filter(s => new Date(s.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    return future.length > 0 ? future[0] : null;
  }

  get monthlyRevenue(): number {
    const now = new Date();
    return this.sessions
      .filter(s => {
        const d = new Date(s.scheduledDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, s) => sum + (s.price ?? 0), 0);
  }

  get pendingPayments(): any[] {
    return this.sessions.filter(s => s.paid === false);
  }

  get allCharacters(): { char: any; userName: string }[] {
    return this.users.reduce((acc: { char: any; userName: string }[], u: any) => {
      const chars = (u.characters ?? []).map((char: any) => ({ char, userName: u.name }));
      return acc.concat(chars);
    }, []);
  }

  formatDate(ts: string): string {
    if (!ts) return '—';
    const date = new Date(ts);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  goToSheet(id: string) {
    this.router.navigate(['/character-sheet', id]);
  }
}

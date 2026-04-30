import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonGrid, IonRow, IonCol,
  IonSpinner,
  IonAvatar,
  IonCard, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge, IonNote,
  IonButton, IonIcon, IonInput, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { forkJoin } from 'rxjs';
import { ApiService, NextSessionDto, ActiveCampaignsDto, ActiveCharactersDto } from '../services/api';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';
import { AsyncPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonNote,
    IonCard, IonCardContent,
    IonContent, IonGrid, IonRow, IonCol, 
    IonSpinner,
    IonList, IonItem, IonLabel, IonBadge,
    IonAvatar,
    IonButton, IonIcon, IonInput,
    IonFab, IonFabButton,
    AsyncPipe
  ],
})
export class HomePage implements OnInit {

  activeRole$ = this.roleService.activeRole$;
  activeTab = 'inicio';

  // Data arrays
  users: any[] = [];
  campaigns: any[] = [];
  sessions: any[] = [];

  // Loading flags
  loadingUsers = false;
  loadingCampaigns = false;
  loadingSessions = false;
  loadingPlayerCount = false;

  // Error strings
  errorUsers: string | null = null;
  errorCampaigns: string | null = null;
  errorSessions: string | null = null;
  errorPlayerCount: string | null = null;

  playerCount = 0;

  // Player summary state
  nextSession: NextSessionDto | null = null;
  activeCampaigns: ActiveCampaignsDto | null = null;
  activeCharacters: ActiveCharactersDto | null = null;
  loadingPlayerSummary = false;
  errorPlayerSummary: string | null = null;

  // Form visibility flags
  showNewCampaignForm = false;
  showNewSessionForm = false;

  // Form models
  newCampaign = { name: '', description: '' };
  newSession = { scheduledDate: '', price: '', campaignId: '' };

  constructor(
    private apiService: ApiService, 
    private router: Router,
    private roleService: RoleService,
    private authService: AuthService
  ) {
    addIcons({ add });
  }

  ngOnInit() {
    this.loadUsers();
    this.loadCampaigns();
    this.loadSessions();
    this.loadPlayerCount();
    this.loadPlayerSummary();
  }

  get nextSessionDate(): string {
    if (this.sessions.length === 0) return 'Sin sesiones';
    const sorted = [...this.sessions].sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
    return this.formatDate(sorted[0].scheduledDate);
  }

  get balance(): number {
    return this.authService.getCurrentUser()?.balance ?? 0;
  }

  loadPlayerSummary(): void {
    this.loadingPlayerSummary = true;
    this.errorPlayerSummary = null;
    forkJoin([
      this.apiService.getNextSession(),
      this.apiService.getActiveCampaigns(),
      this.apiService.getActiveCharacters(),
    ]).subscribe({
      next: ([nextSession, activeCampaigns, activeCharacters]) => {
        this.nextSession = nextSession;
        this.activeCampaigns = activeCampaigns;
        this.activeCharacters = activeCharacters;
        this.loadingPlayerSummary = false;
      },
      error: (err) => {
        console.error('Error al cargar resumen del jugador', err);
        this.errorPlayerSummary = err?.message ?? 'Error al cargar resumen';
        this.loadingPlayerSummary = false;
      }
    });
  }

  get nextPlayerSessionLabel(): string {
    const raw = this.nextSession?.nextSessionDate;
    if (!raw) return 'Sin sesiones';
    const date = new Date(raw);
    if (isNaN(date.getTime())) return 'Sin sesiones';
    return this.formatDate(raw);
  }

  loadUsers() {
    this.loadingUsers = true;
    this.errorUsers = null;
    this.apiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error al cargar usuarios', err);
        this.errorUsers = err?.message ?? 'Error al cargar usuarios';
        this.loadingUsers = false;
      }
    });
  }

  loadPlayerCount() {
    this.loadingPlayerCount = true;
    this.errorPlayerCount = null;
    this.apiService.getPlayerCount().subscribe({
      next: (data) => {
        this.playerCount = data.playerCount;
        this.loadingPlayerCount = false;
      },
      error: (err) => {
        console.error('Error al cargar conteo de jugadores', err);
        this.errorPlayerCount = err?.message ?? 'Error al cargar jugadores';
        this.loadingPlayerCount = false;
      }
    });
  }

  loadCampaigns() {
    this.loadingCampaigns = true;
    this.errorCampaigns = null;
    this.apiService.getCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.loadingCampaigns = false;
      },
      error: (err) => {
        console.error('Error al cargar campañas', err);
        this.errorCampaigns = err?.message ?? 'Error al cargar campañas';
        this.loadingCampaigns = false;
      }
    });
  }

  loadSessions() {
    this.loadingSessions = true;
    this.errorSessions = null;
    this.apiService.getSessions().subscribe({
      next: (data) => {
        this.sessions = data;
        this.loadingSessions = false;
      },
      error: (err) => {
        console.error('Error al cargar sesiones', err);
        this.errorSessions = err?.message ?? 'Error al cargar sesiones';
        this.loadingSessions = false;
      }
    });
  }

  submitCampaign() {
    const trimmedName = this.newCampaign.name.trim();
    if (!trimmedName) {
      this.errorCampaigns = 'El nombre de la campaña no puede estar vacío';
      return;
    }

    const dto = {
      name: trimmedName,
      description: this.newCampaign.description,
      ownerId: this.authService.getCurrentUser()?.id || this.authService.getUserIdFromToken() || ''
    };

    this.apiService.createCampaign(dto).subscribe({
      next: () => {
        this.loadCampaigns();
        this.newCampaign = { name: '', description: '' };
        this.showNewCampaignForm = false;
      },
      error: (err) => {
        console.error('Error al crear campaña', err);
        this.errorCampaigns = err?.message ?? 'Error al crear la campaña';
      }
    });
  }

  submitSession() {
    if (!this.newSession.scheduledDate || !this.newSession.price || !this.newSession.campaignId) {
      this.errorSessions = 'Por favor, rellena todos los campos de la sesión';
      return;
    }

    const dto = {
      scheduledDate: this.newSession.scheduledDate,
      price: Number(this.newSession.price),
      campaignId: this.newSession.campaignId
    };

    this.apiService.createSession(dto).subscribe({
      next: () => {
        this.loadSessions();
        this.newSession = { scheduledDate: '', price: '', campaignId: '' };
        this.showNewSessionForm = false;
      },
      error: (err) => {
        console.error('Error al crear sesión', err);
        this.errorSessions = err?.message ?? 'Error al crear la sesión';
      }
    });
  }

  toggleCampaignForm() {
    this.showNewCampaignForm = !this.showNewCampaignForm;
  }

  toggleSessionForm() {
    this.showNewSessionForm = !this.showNewSessionForm;
  }

  goToSheet(id: string) {
    this.router.navigate(['/character-sheet', id]);
  }

  formatDate(ts: string): string {
    const date = new Date(ts);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  getSessionCount(campaignId: string): number {
    return this.sessions.filter(s => s.campaign?.id === campaignId).length;
  }
}

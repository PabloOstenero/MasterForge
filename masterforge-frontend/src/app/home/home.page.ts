import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle,
  IonSegment, IonSegmentButton,
  IonContent, IonGrid, IonRow, IonCol,
  IonSpinner,
  IonSelect, IonSelectOption,
  IonAvatar,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonBadge,
  IonButton, IonIcon, IonInput
} from '@ionic/angular/standalone';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle,
    IonSegment, IonSegmentButton,
    IonContent, IonGrid, IonRow, IonCol,
    IonSpinner,
    IonSelect, IonSelectOption,
    IonAvatar,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge,
    IonButton, IonIcon, IonInput
  ],
})
export class HomePage implements OnInit {

  // Role toggle
  activeRole: 'dm' | 'player' = 'dm';

  // Data arrays
  users: any[] = [];
  campaigns: any[] = [];
  sessions: any[] = [];

  // Loading flags
  loadingUsers = false;
  loadingCampaigns = false;
  loadingSessions = false;

  // Error strings
  errorUsers: string | null = null;
  errorCampaigns: string | null = null;
  errorSessions: string | null = null;

  // Form visibility flags
  showNewCampaignForm = false;
  showNewSessionForm = false;

  // Form models
  newCampaign = { name: '', description: '' };
  newSession = { scheduledDate: '', price: '', campaignId: '' };

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadUsers();
    this.loadCampaigns();
    this.loadSessions();
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
      ownerId: this.users[0]?.id ?? ''
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

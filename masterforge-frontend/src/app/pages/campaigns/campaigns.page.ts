import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonInput, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-campaigns',
  templateUrl: './campaigns.page.html',
  styleUrls: ['./campaigns.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonInput, IonSelect, IonSelectOption,
  ],
})
export class CampaignsPage implements OnInit {

  campaigns: any[] = [];
  sessions: any[] = [];

  loadingCampaigns = false;
  loadingSessions = false;

  errorCampaigns: string | null = null;
  errorSessions: string | null = null;

  validationErrorCampaign: string | null = null;
  validationErrorSession: string | null = null;

  showNewCampaignForm = false;
  showNewSessionForm = false;

  newCampaign: { name: string; description: string } = { name: '', description: '' };
  newSession: { scheduledDate: string; price: string; campaignId: string } = { scheduledDate: '', price: '', campaignId: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadCampaigns();
    this.loadSessions();
  }

  loadCampaigns() {
    this.loadingCampaigns = true;
    this.api.getCampaigns().subscribe({
      next: (data: any[]) => {
        this.campaigns = data;
        this.loadingCampaigns = false;
      },
      error: (err: any) => {
        this.errorCampaigns = err?.message ?? 'Error al cargar campañas';
        this.loadingCampaigns = false;
      },
    });
  }

  loadSessions() {
    this.loadingSessions = true;
    this.api.getSessions().subscribe({
      next: (data: any[]) => {
        this.sessions = data;
        this.loadingSessions = false;
      },
      error: (err: any) => {
        this.errorSessions = err?.message ?? 'Error al cargar sesiones';
        this.loadingSessions = false;
      },
    });
  }

  submitCampaign() {
    if (!this.newCampaign.name.trim()) {
      this.validationErrorCampaign = 'El nombre de la campaña es obligatorio';
      return;
    }
    this.validationErrorCampaign = null;
    this.api.createCampaign({ ...this.newCampaign, name: this.newCampaign.name.trim(), ownerId: '' }).subscribe({
      next: () => {
        this.showNewCampaignForm = false;
        this.loadCampaigns();
      },
      error: (err: any) => {
        this.errorCampaigns = err?.message ?? 'Error al crear campaña';
      },
    });
  }

  submitSession() {
    this.api.createSession({
      ...this.newSession,
      price: Number(this.newSession.price),
    }).subscribe({
      next: () => {
        this.showNewSessionForm = false;
        this.loadSessions();
      },
      error: (err: any) => {
        this.errorSessions = err?.message ?? 'Error al crear sesión';
      },
    });
  }

  toggleCampaignForm() {
    this.showNewCampaignForm = !this.showNewCampaignForm;
  }

  toggleSessionForm() {
    this.showNewSessionForm = !this.showNewSessionForm;
  }

  getSessionCount(campaignId: string): number {
    return this.sessions.filter(s => s.campaign?.id === campaignId).length;
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
}

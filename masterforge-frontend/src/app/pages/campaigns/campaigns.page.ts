import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonButton, IonInput, IonSelect, IonSelectOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, addCircleOutline, closeOutline, peopleOutline, compassOutline } from 'ionicons/icons';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-campaigns',
  templateUrl: './campaigns.page.html',
  styleUrls: ['./campaigns.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonSpinner,
    IonButton, IonInput, IonSelect, IonSelectOption,
    IonIcon,
  ],
})
export class CampaignsPage implements OnInit {

  campaigns: any[] = [];

  loadingCampaigns = false;
  errorCampaigns: string | null = null;
  validationErrorCampaign: string | null = null;
  currentUser: any = null;

  showNewCampaignForm = false;

  newCampaign: {
    name: string;
    description: string;
    maxPlayers: number;
    joinPrice: number;
    visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
  } = {
    name: '',
    description: '',
    maxPlayers: 1,
    joinPrice: 0,
    visibility: 'PRIVATE',
  };

  constructor(private api: ApiService, private authService: AuthService) {
    addIcons({ mapOutline, addCircleOutline, closeOutline, peopleOutline, compassOutline });
  }

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadCampaigns();
  }

  loadCampaigns() {
    this.loadingCampaigns = true;
    this.errorCampaigns = null;
    this.api.getDmCampaigns().subscribe({
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

  toggleCampaignForm() {
    this.showNewCampaignForm = !this.showNewCampaignForm;
    if (!this.showNewCampaignForm) {
      this.validationErrorCampaign = null;
    }
  }

  submitCampaign() {
    const ownerId = this.authService.getUserIdFromToken();
    if (ownerId === null) {
      this.validationErrorCampaign = 'No se pudo obtener el usuario autenticado. Por favor, inicia sesión de nuevo.';
      return;
    }

    if (!this.newCampaign.name.trim()) {
      this.validationErrorCampaign = 'El nombre de la campaña es obligatorio';
      return;
    }

    if (this.newCampaign.maxPlayers < 1 || !Number.isInteger(this.newCampaign.maxPlayers)) {
      this.validationErrorCampaign = 'El número máximo de jugadores debe ser un entero mayor o igual a 1';
      return;
    }

    if (this.newCampaign.joinPrice < 0) {
      this.validationErrorCampaign = 'El precio de entrada no puede ser negativo';
      return;
    }

    this.validationErrorCampaign = null;
    this.api.createCampaign({
      name: this.newCampaign.name.trim(),
      description: this.newCampaign.description,
      maxPlayers: this.newCampaign.maxPlayers,
      joinPrice: this.newCampaign.joinPrice,
      visibility: this.newCampaign.visibility,
      ownerId,
    }).subscribe({
      next: () => {
        this.showNewCampaignForm = false;
        this.newCampaign = {
          name: '',
          description: '',
          maxPlayers: 1,
          joinPrice: 0,
          visibility: 'PRIVATE',
        };
        this.loadCampaigns();
      },
      error: (err: any) => {
        this.errorCampaigns = err?.message ?? 'Error al crear campaña';
      },
    });
  }

  visibilityLabel(v: string): string {
    switch (v) {
      case 'PUBLIC':      return 'Pública';
      case 'INVITE_ONLY': return 'Solo invitación';
      default:            return 'Privada';
    }
  }

  get isPro(): boolean {
    return this.authService.isPro(this.currentUser);
  }

  get limitReached(): boolean {
    return !this.isPro && this.campaigns.length >= 2;
  }
}

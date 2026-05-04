import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonSpinner,
  IonCard, IonCardContent,
  IonButton, IonText, IonRow, IonCol,
} from '@ionic/angular/standalone';
import { ApiService, PlayerCampaignSummary } from '../../services/api';

@Component({
  selector: 'app-my-campaigns',
  templateUrl: './my-campaigns.page.html',
  styleUrls: ['./my-campaigns.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonSpinner,
    IonCard, IonCardContent,
    IonButton, IonText, IonRow, IonCol,
  ],
})
export class MyCampaignsPage implements OnInit {

  campaigns: PlayerCampaignSummary[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.loading = true;
    this.error = null;

    this.apiService.getPlayerCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Error al cargar tus campañas';
        this.loading = false;
      },
    });
  }

  navigateToCampaign(campaignId: string): void {
    this.router.navigate(['/campaigns', campaignId]);
  }

}

import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonSegment,
  IonSegmentButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';
import {
  ApiService,
  CampaignDetailDto,
  SessionSummaryDto,
  CampaignPlayerDto,
} from '../../services/api';

@Component({
  selector: 'app-campaign-detail',
  templateUrl: './campaign-detail.page.html',
  styleUrls: ['./campaign-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonSpinner,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonSegment,
    IonSegmentButton,
  ],
})
export class CampaignDetailPage implements OnInit {

  campaign: CampaignDetailDto | null = null;
  sessions: SessionSummaryDto[] = [];
  players: CampaignPlayerDto[] = [];

  loadingCampaign = false;
  loadingSessions = false;
  loadingPlayers = false;

  errorCampaign: string | null = null;
  errorSessions: string | null = null;
  errorPlayers: string | null = null;

  activeSegment = 'jugadores';

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private api: ApiService,
  ) {
    addIcons({ arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorCampaign = 'ID de campaña no encontrado.';
      return;
    }

    this.loadingCampaign = true;
    this.loadingSessions = true;
    this.loadingPlayers = true;

    // Three independent subscriptions so a failure in one does not block the others
    this.api.getCampaignById(id).pipe(
      catchError((err) => {
        this.errorCampaign = err?.message ?? 'Error al cargar la campaña.';
        this.loadingCampaign = false;
        return of(null);
      }),
    ).subscribe((data) => {
      if (data !== null) {
        this.campaign = data;
      }
      this.loadingCampaign = false;
    });

    this.api.getCampaignSessions(id).pipe(
      catchError((err) => {
        this.errorSessions = err?.message ?? 'Error al cargar las sesiones.';
        this.loadingSessions = false;
        return of(null);
      }),
    ).subscribe((data) => {
      if (data !== null) {
        this.sessions = data;
      }
      this.loadingSessions = false;
    });

    this.api.getCampaignPlayers(id).pipe(
      catchError((err) => {
        this.errorPlayers = err?.message ?? 'Error al cargar los jugadores.';
        this.loadingPlayers = false;
        return of(null);
      }),
    ).subscribe((data) => {
      if (data !== null) {
        this.players = data;
      }
      this.loadingPlayers = false;
    });
  }

  goBack(): void {
    this.location.back();
  }

  formatDate(ts: string): string {
    if (!ts) return '';
    const date = new Date(ts);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  formatPrice(price: number): string {
    if (price === 0) return 'Gratis';
    return `${price} €`;
  }

  segmentChanged(event: any): void {
    this.activeSegment = event.detail.value;
  }

  get hasAnyCharacters(): boolean {
    return this.players.some((p) => p.characters.length > 0);
  }
}

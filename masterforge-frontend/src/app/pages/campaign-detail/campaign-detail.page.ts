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
  IonButton,
} from '@ionic/angular/standalone';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline, addOutline } from 'ionicons/icons';
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
    ReactiveFormsModule,
    IonContent,
    IonSpinner,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonButton,
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

  showSessionForm = false;
  sessionForm!: FormGroup;
  submittingSession = false;
  errorSession: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private api: ApiService,
    private fb: FormBuilder,
  ) {
    addIcons({ arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline, addOutline });
  }

  ngOnInit(): void {
    this.sessionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      scheduledDate: ['', Validators.required],
    });

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

  openSessionForm(): void {
    this.showSessionForm = true;
    this.errorSession = null;
  }

  cancelSessionForm(): void {
    this.showSessionForm = false;
    this.sessionForm.reset();
    this.errorSession = null;
  }

  private reloadSessions(campaignId: string): void {
    this.loadingSessions = true;
    this.api.getCampaignSessions(campaignId).pipe(
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
  }

  submitSession(): void {
    if (this.sessionForm.invalid || this.submittingSession) return;

    const campaignId = this.route.snapshot.paramMap.get('id')!;
    const { name, scheduledDate } = this.sessionForm.value;

    this.submittingSession = true;
    this.errorSession = null;

    this.api.createSession({
      name,
      scheduledDate: new Date(scheduledDate).toISOString(),
      price: 0,
      campaignId,
    }).pipe(
      catchError((err) => {
        this.errorSession = err?.error?.message ?? 'Error al crear la sesión.';
        this.submittingSession = false;
        return of(null);
      }),
    ).subscribe((result) => {
      if (result !== null) {
        this.showSessionForm = false;
        this.sessionForm.reset();
        this.submittingSession = false;
        this.reloadSessions(campaignId);
      }
    });
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

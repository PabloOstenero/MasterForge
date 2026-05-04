import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline, addOutline, listOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';
import {
  ApiService,
  CampaignDetailDto,
  SessionSummaryDto,
  CampaignPlayerDto,
  CharacterSummary,
  CharacterResponseDto,
} from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-campaign-detail',
  templateUrl: './campaign-detail.page.html',
  styleUrls: ['./campaign-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
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

  // Role-aware state
  isPlayer = false;
  accessDenied = false;
  playerCharacters: CharacterSummary[] = [];
  loadingCharacters = false;
  errorCharacters: string | null = null;
  selectedCharacterId: string | null = null;
  assigningCharacter = false;
  assignSuccess = false;
  errorAssign: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private api: ApiService,
    private fb: FormBuilder,
    private roleService: RoleService,
    private authService: AuthService,
    private router: Router,
  ) {
    addIcons({ arrowBackOutline, calendarOutline, cashOutline, peopleOutline, personOutline, addOutline, listOutline, checkmarkCircleOutline });
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

    this.isPlayer = this.roleService.activeRole === 'player';

    if (this.isPlayer) {
      this.api.getPlayerCampaigns().pipe(
        catchError(() => {
          this.accessDenied = true;
          return of(null);
        }),
      ).subscribe((campaigns) => {
        if (campaigns === null) return;

        const enrolled = campaigns.some((item) => item.campaignId === id);
        if (!enrolled) {
          this.accessDenied = true;
          return;
        }

        // Enrolled — proceed with normal loading
        this.loadCampaignData(id);

        const userId = this.authService.getUserIdFromToken() ?? '';
        this.loadPlayerCharacters(userId);
      });
    } else {
      // DM path — existing behaviour unchanged
      this.loadCampaignData(id);
    }
  }

  private loadCampaignData(id: string): void {
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

  loadPlayerCharacters(userId: string): void {
    this.loadingCharacters = true;
    this.api.getCharactersByUser(userId).pipe(
      catchError((err) => {
        this.errorCharacters = err?.message ?? 'Error al cargar los personajes.';
        this.loadingCharacters = false;
        return of(null);
      }),
    ).subscribe((data) => {
      if (data !== null) {
        this.playerCharacters = data;
      }
      this.loadingCharacters = false;
    });
  }

  assignCharacter(): void {
    if (!this.selectedCharacterId || this.assigningCharacter) return;
    const campaignId = this.route.snapshot.paramMap.get('id')!;
    this.assigningCharacter = true;
    this.errorAssign = null;
    this.assignSuccess = false;
    this.api.assignCharacterToCampaign(this.selectedCharacterId, campaignId).pipe(
      catchError((err) => {
        this.errorAssign = err?.error?.message ?? 'Error al asignar el personaje.';
        this.assigningCharacter = false;
        return of(null);
      }),
    ).subscribe((result) => {
      if (result !== null) {
        this.assignSuccess = true;
        this.assigningCharacter = false;
        // Reload players list
        this.api.getCampaignPlayers(campaignId).pipe(
          catchError(() => of(null)),
        ).subscribe((data) => {
          if (data !== null) this.players = data;
        });
      }
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

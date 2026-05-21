import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { calendarOutline, cashOutline, peopleOutline, personOutline, addOutline, listOutline, checkmarkCircleOutline, skullOutline, logoDiscord, lockOpenOutline, lockClosedOutline, trashOutline, pencilOutline, eyeOutline, personRemoveOutline, shieldCheckmarkOutline, timeOutline, sparklesOutline, playOutline, chevronDownOutline, chevronUpOutline, exitOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
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
    IonIcon
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
  expandedPlayerIds: { [key: string]: boolean } = {};

  togglePlayerExpanded(playerId: string): void {
    this.expandedPlayerIds[playerId] = !this.expandedPlayerIds[playerId];
  }

  showSessionForm = false;
  sessionForm!: FormGroup;
  submittingSession = false;
  errorSession: string | null = null;
  editingSessionId: string | null = null;

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
  unassigningCharacterMap: { [key: string]: boolean } = {};
  kickingPlayerMap: { [key: string]: boolean } = {};
  leavingCampaign = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private fb: FormBuilder,
    private roleService: RoleService,
    private authService: AuthService,
    private router: Router,
  ) {
    addIcons({ calendarOutline, cashOutline, peopleOutline, personOutline, addOutline, listOutline, checkmarkCircleOutline, skullOutline, logoDiscord, lockOpenOutline, lockClosedOutline, trashOutline, pencilOutline, eyeOutline, personRemoveOutline, shieldCheckmarkOutline, timeOutline, sparklesOutline, playOutline, chevronDownOutline, chevronUpOutline, exitOutline });
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

    // Load campaign first to check ownership
    this.loadingCampaign = true;
    this.api.getCampaignById(id).pipe(
      catchError((err) => {
        this.errorCampaign = err?.message ?? 'Error al cargar la campaña.';
        this.loadingCampaign = false;
        return of(null);
      })
    ).subscribe((campaign) => {
      if (!campaign) {
        this.loadingCampaign = false;
        return;
      }
      this.campaign = campaign;
      this.loadingCampaign = false;

      const currentUserId = this.authService.getUserIdFromToken() ?? '';
      const isOwner = campaign.owner.id === currentUserId;

      if (isOwner) {
        // Owner DM path
        this.isPlayer = false;
        this.loadCampaignData(id);
      } else {
        // Player path: Verify enrollment
        this.api.getPlayerCampaigns().pipe(
          catchError(() => {
            this.accessDenied = true;
            return of([]);
          })
        ).subscribe((campaigns) => {
          const enrolled = campaigns.some((item) => item.campaignId === id);
          if (!enrolled) {
            this.accessDenied = true;
            return;
          }

          // Enrolled Player path
          this.isPlayer = true;
          this.loadCampaignData(id);
          this.loadPlayerCharacters(currentUserId);
        });
      }
    });
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
        const currentUserId = this.authService.getUserIdFromToken();
        if (currentUserId) {
          this.expandedPlayerIds[currentUserId] = true;
        }
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
          if (data !== null) {
            this.players = data;
            const currentUserId = this.authService.getUserIdFromToken();
            if (currentUserId) {
              this.expandedPlayerIds[currentUserId] = true;
            }
          }
        });
      }
    });
  }

  openSessionForm(): void {
    this.showSessionForm = true;
    this.errorSession = null;
  }

  cancelSessionForm(): void {
    this.showSessionForm = false;
    this.sessionForm.reset();
    this.errorSession = null;
    this.editingSessionId = null;
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

    const dateISO = new Date(scheduledDate).toISOString();

    const request$ = this.editingSessionId
      ? this.api.updateSession(this.editingSessionId, { name, scheduledDate: dateISO, campaignId })
      : this.api.createSession({ name, scheduledDate: dateISO, campaignId });

    request$.pipe(
      catchError((err) => {
        this.errorSession = err?.error?.message ?? 'Error al guardar la sesión.';
        this.submittingSession = false;
        return of(null);
      }),
    ).subscribe((result) => {
      if (result !== null) {
        this.showSessionForm = false;
        this.sessionForm.reset();
        this.submittingSession = false;
        this.editingSessionId = null;
        this.reloadSessions(campaignId);
      }
    });
  }

  editSession(session: SessionSummaryDto): void {
    this.editingSessionId = session.id;
    const rawDate = new Date(session.scheduledDate);
    const tzOffset = rawDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(rawDate.getTime() - tzOffset)).toISOString().slice(0, 16);

    this.sessionForm.patchValue({
      name: session.name,
      scheduledDate: localISOTime
    });
    this.showSessionForm = true;
    this.errorSession = null;
  }

  deleteSession(session: SessionSummaryDto): void {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la sesión "${session.name}" programada para el ${this.formatDate(session.scheduledDate)}? Esta acción es irreversible.`
    );
    if (!confirmDelete) return;

    this.api.deleteSession(session.id).subscribe({
      next: () => {
        alert('Sesión eliminada correctamente.');
        const campaignId = this.route.snapshot.paramMap.get('id')!;
        this.reloadSessions(campaignId);
      },
      error: (err) => {
        console.error('Error al eliminar la sesión:', err);
        alert(err?.error?.message ?? 'No se pudo eliminar la sesión.');
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

  getMonth(ts: string): string {
    if (!ts) return 'ENE';
    const date = new Date(ts);
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return months[date.getMonth()];
  }

  getDay(ts: string): string {
    if (!ts) return '01';
    const date = new Date(ts);
    return date.getDate().toString().padStart(2, '0');
  }

  segmentChanged(event: any): void {
    this.activeSegment = event.detail.value;
  }

  get hasAnyCharacters(): boolean {
    return this.players.some((p) => p.characters.length > 0);
  }

  get isOwner(): boolean {
    if (!this.campaign) return false;
    const currentUserId = this.authService.getUserIdFromToken();
    return this.campaign.owner.id === currentUserId;
  }

  toggleEnrollment(): void {
    if (!this.campaign) return;
    const campaignId = this.campaign.id;
    this.api.toggleEnrollment(campaignId).subscribe({
      next: (updatedCampaign) => {
        this.campaign = updatedCampaign;
      },
      error: (err) => {
        console.error('Error al cambiar estado de inscripción:', err);
        alert(err?.error?.message ?? 'No se pudo cambiar el estado de inscripción');
      }
    });
  }

  deleteCampaign(): void {
    if (!this.campaign) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la campaña "${this.campaign.name}"? Esta acción es irreversible y se perderán todos los datos y personajes asociados.`
    );
    if (!confirmDelete) return;

    this.api.deleteCampaign(this.campaign.id).subscribe({
      next: () => {
        alert('Campaña eliminada correctamente.');
        this.router.navigate(['/my-campaigns']);
      },
      error: (err) => {
        console.error('Error al eliminar la campaña:', err);
        alert(err?.error?.message ?? 'No se pudo eliminar la campaña.');
      }
    });
  }

  isCurrentUser(userId: string): boolean {
    return this.authService.getUserIdFromToken() === userId;
  }

  canViewSheet(playerId: string): boolean {
    return this.isOwner || this.isCurrentUser(playerId);
  }

  goToSheet(characterId: string): void {
    this.router.navigate(['/character-sheet', characterId]);
  }

  get unassignedPlayerCharacters(): CharacterSummary[] {
    const assignedIds = new Set(
      this.players.flatMap(p => p.characters.map(c => c.id))
    );
    return this.playerCharacters.filter(c => !assignedIds.has(c.id));
  }

  unassignCharacter(characterId: string): void {
    const confirmUnassign = window.confirm(
      '¿Estás seguro de que deseas retirar este personaje de la campaña?'
    );
    if (!confirmUnassign) return;

    const campaignId = this.route.snapshot.paramMap.get('id')!;
    this.unassigningCharacterMap[characterId] = true;

    this.api.unassignCharacterFromCampaign(characterId).pipe(
      catchError((err) => {
        alert(err?.error?.message ?? 'Error al retirar el personaje.');
        this.unassigningCharacterMap[characterId] = false;
        return of(null);
      }),
    ).subscribe((result) => {
      this.unassigningCharacterMap[characterId] = false;
      if (result !== null) {
        if (this.selectedCharacterId === characterId) {
          this.selectedCharacterId = '';
        }
        // Reload players list
        this.api.getCampaignPlayers(campaignId).pipe(
          catchError(() => of(null)),
        ).subscribe((data) => {
          if (data !== null) {
            this.players = data;
            const currentUserId = this.authService.getUserIdFromToken();
            if (currentUserId) {
              this.expandedPlayerIds[currentUserId] = true;
            }
          }
        });
      }
    });
  }

  kickPlayer(playerId: string, playerName: string): void {
    const confirmKick = window.confirm(
      `¿Estás seguro de que deseas expulsar a "${playerName}" de esta campaña? Todos sus personajes inscritos en la misma serán retirados.`
    );
    if (!confirmKick) return;

    const campaignId = this.route.snapshot.paramMap.get('id')!;
    this.kickingPlayerMap[playerId] = true;

    this.api.kickPlayerFromCampaign(campaignId, playerId).subscribe({
      next: () => {
        this.kickingPlayerMap[playerId] = false;
        alert('Jugador expulsado correctamente de la campaña.');
        // Reload players list
        this.api.getCampaignPlayers(campaignId).pipe(
          catchError(() => of(null)),
        ).subscribe((data) => {
          if (data !== null) this.players = data;
        });
      },
      error: (err) => {
        this.kickingPlayerMap[playerId] = false;
        alert(err?.error?.message ?? 'Error al expulsar al jugador.');
      }
    });
  }

  leaveCampaign(): void {
    const confirmLeave = window.confirm(
      '¿Estás seguro de que deseas abandonar esta campaña? Todos tus personajes inscritos en la misma serán retirados.'
    );
    if (!confirmLeave) return;

    const campaignId = this.route.snapshot.paramMap.get('id')!;
    this.leavingCampaign = true;

    this.api.leaveCampaign(campaignId).subscribe({
      next: () => {
        this.leavingCampaign = false;
        alert('Has abandonado la campaña correctamente.');
        this.router.navigate(['/my-campaigns']);
      },
      error: (err) => {
        this.leavingCampaign = false;
        alert(err?.error?.message ?? 'Error al abandonar la campaña.');
      }
    });
  }
}

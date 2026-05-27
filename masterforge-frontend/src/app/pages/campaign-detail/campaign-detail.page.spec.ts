import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CampaignDetailPage } from './campaign-detail.page';
import {
  ApiService,
  CampaignDetailDto,
  SessionSummaryDto,
  CampaignPlayerDto,
} from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const CAMPAIGN_ID = 'test-campaign-id';

const mockCampaign: CampaignDetailDto = {
  id: CAMPAIGN_ID,
  name: 'Test Campaign',
  description: 'A test campaign description',
  maxPlayers: 6,
  joinPrice: 10,
  visibility: 'PUBLIC',
  owner: { id: 'u1', name: 'User', email: 'u@e.com' }
};

const mockSessions: SessionSummaryDto[] = [
  { id: 'session-1', name: 'Test Session 1', scheduledDate: '2025-06-01T18:00:00.000Z' },
  { id: 'session-2', name: 'Test Session 2', scheduledDate: '2025-06-15T18:00:00.000Z' },
];

const mockPlayers: CampaignPlayerDto[] = [
  {
    id: 'player-1',
    name: 'Aragorn',
    email: 'aragorn@example.com',
    subscriptionTier: 'PREMIUM',
    characters: [
      { id: 'char-1', name: 'Strider', level: 5, dndClass: 'Ranger', dndRace: 'Human' },
    ],
  },
  {
    id: 'player-2',
    name: 'Legolas',
    email: 'legolas@example.com',
    subscriptionTier: 'FREE',
    characters: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'getPlayerCampaigns',
    'getCharactersByUser',
  ]);
  spy.getCampaignById.and.returnValue(of(mockCampaign));
  spy.getCampaignSessions.and.returnValue(of(mockSessions));
  spy.getCampaignPlayers.and.returnValue(of(mockPlayers));
  spy.getPlayerCampaigns.and.returnValue(of([]));
  spy.getCharactersByUser.and.returnValue(of([]));
  return spy;
}

function buildMockRoleService(role: 'dm' | 'player' = 'dm'): Partial<RoleService> {
  return { activeRole: role };
}

function buildMockAuthService(): Partial<AuthService> {
  return { getUserIdFromToken: () => 'test-user-id' };
}

function buildActivatedRouteStub(id: string = CAMPAIGN_ID) {
  return {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? id : null),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 12.1 — Component initialization and API calls
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

describe('CampaignDetailPage — 12.1 Initialization and API calls', () => {

  let fixture: ComponentFixture<CampaignDetailPage>;
  let component: CampaignDetailPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [CampaignDetailPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub() },
        { provide: RoleService, useValue: buildMockRoleService('dm') },
        { provide: AuthService, useValue: buildMockAuthService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailPage);
    component = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should call getCampaignById with the route id', () => {
      fixture.detectChanges(); // triggers ngOnInit
      expect(apiSpy.getCampaignById).toHaveBeenCalledWith(CAMPAIGN_ID);
    });

    it('should call getCampaignSessions with the route id', () => {
      fixture.detectChanges();
      expect(apiSpy.getCampaignSessions).toHaveBeenCalledWith(CAMPAIGN_ID);
    });

    it('should call getCampaignPlayers with the route id', () => {
      fixture.detectChanges();
      expect(apiSpy.getCampaignPlayers).toHaveBeenCalledWith(CAMPAIGN_ID);
    });

    it('should populate campaign, sessions, and players after successful API calls', () => {
      fixture.detectChanges();
      expect(component.campaign).toEqual(mockCampaign);
      expect(component.sessions).toEqual(mockSessions);
      expect(component.players).toEqual(mockPlayers);
    });

    it('should set all loading flags to false after successful API calls', () => {
      fixture.detectChanges();
      expect(component.loadingCampaign).toBeFalse();
      expect(component.loadingSessions).toBeFalse();
      expect(component.loadingPlayers).toBeFalse();
    });
  });
});

// ---------------------------------------------------------------------------
// 12.2 — Loading spinners and empty states
// Validates: Requirements 4.4, 4.8, 4.9, 4.10
// ---------------------------------------------------------------------------

describe('CampaignDetailPage — 12.2 Loading spinners and empty states', () => {

  let fixture: ComponentFixture<CampaignDetailPage>;
  let component: CampaignDetailPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [CampaignDetailPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub() },
        { provide: RoleService, useValue: buildMockRoleService('dm') },
        { provide: AuthService, useValue: buildMockAuthService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailPage);
    component = fixture.componentInstance;
    // Run initial change detection so ngOnInit fires and the template is rendered.
    // The API mocks return synchronously via of(), so loading flags will be false after this.
    fixture.detectChanges();
  });

  describe('loading states', () => {
    it('should show ion-spinner in campaign section while loadingCampaign is true', () => {
      // Set loading flag AFTER ngOnInit has already cleared it, then re-render
      component.loadingCampaign = true;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="spinner-campaign"] ion-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show ion-spinner in sessions section while loadingSessions is true', () => {
      component.loadingSessions = true;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="spinner-sessions"] ion-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show ion-spinner in players section while loadingPlayers is true', () => {
      component.loadingPlayers = true;
      component.activeSegment = 'jugadores';
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="spinner-players"] ion-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show ion-spinner in characters section while loadingPlayers is true and segment is personajes', () => {
      component.loadingPlayers = true;
      component.activeSegment = 'personajes';
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="spinner-characters"] ion-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('empty states', () => {
    it('should show "No hay sesiones programadas para esta campaña." when sessions is empty', () => {
      component.loadingSessions = false;
      component.errorSessions = null;
      component.sessions = [];
      fixture.detectChanges();

      const emptyMsg: HTMLElement = fixture.nativeElement.querySelector('[data-testid="empty-sessions"]');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent).toContain('No hay sesiones programadas para esta campaña.');
    });

    it('should NOT show empty sessions message when sessions list is non-empty', () => {
      component.loadingSessions = false;
      component.errorSessions = null;
      component.sessions = mockSessions;
      fixture.detectChanges();

      const emptyMsg = fixture.nativeElement.querySelector('[data-testid="empty-sessions"]');
      expect(emptyMsg).toBeNull();
    });

    it('should show "No hay jugadores inscritos en esta campaña." when players is empty', () => {
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = [];
      component.activeSegment = 'jugadores';
      fixture.detectChanges();

      const emptyMsg: HTMLElement = fixture.nativeElement.querySelector('[data-testid="empty-players"]');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent).toContain('No hay jugadores inscritos en esta campaña.');
    });

    it('should NOT show empty players message when players list is non-empty', () => {
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = mockPlayers;
      component.activeSegment = 'jugadores';
      fixture.detectChanges();

      const emptyMsg = fixture.nativeElement.querySelector('[data-testid="empty-players"]');
      expect(emptyMsg).toBeNull();
    });

    it('should show "No hay personajes registrados para esta campaña." when all players have empty characters', () => {
      const playersWithNoChars: CampaignPlayerDto[] = [
        { id: 'p1', name: 'Player One', email: 'p1@test.com', subscriptionTier: 'FREE', characters: [] },
        { id: 'p2', name: 'Player Two', email: 'p2@test.com', subscriptionTier: 'FREE', characters: [] },
      ];
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = playersWithNoChars;
      component.activeSegment = 'personajes';
      fixture.detectChanges();

      const emptyMsg: HTMLElement = fixture.nativeElement.querySelector('[data-testid="empty-characters"]');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent).toContain('No hay personajes registrados para esta campaña.');
    });

    it('should show "No hay personajes registrados para esta campaña." when players array is empty', () => {
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = [];
      component.activeSegment = 'personajes';
      fixture.detectChanges();

      const emptyMsg: HTMLElement = fixture.nativeElement.querySelector('[data-testid="empty-characters"]');
      expect(emptyMsg).toBeTruthy();
      expect(emptyMsg.textContent).toContain('No hay personajes registrados para esta campaña.');
    });

    it('should NOT show empty characters message when at least one player has characters', () => {
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = mockPlayers; // mockPlayers[0] has 1 character
      component.activeSegment = 'personajes';
      fixture.detectChanges();

      const emptyMsg = fixture.nativeElement.querySelector('[data-testid="empty-characters"]');
      expect(emptyMsg).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 12.3 — Back navigation and segment switching
// Validates: Requirements 4.5, 4.12
// ---------------------------------------------------------------------------

describe('CampaignDetailPage — 12.3 Unified Accordion Toggling', () => {

  let fixture: ComponentFixture<CampaignDetailPage>;
  let component: CampaignDetailPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [CampaignDetailPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub() },
        { provide: RoleService, useValue: buildMockRoleService('dm') },
        { provide: AuthService, useValue: buildMockAuthService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('togglePlayerExpanded', () => {
    it('should toggle expanded status of player correctly', () => {
      expect(component.expandedPlayerIds['player-1']).toBeFalsy();

      component.togglePlayerExpanded('player-1');
      expect(component.expandedPlayerIds['player-1']).toBeTrue();

      component.togglePlayerExpanded('player-1');
      expect(component.expandedPlayerIds['player-1']).toBeFalse();
    });

    it('should expand/collapse accordion in template when toggled', () => {
      component.loadingPlayers = false;
      component.errorPlayers = null;
      component.players = mockPlayers;
      fixture.detectChanges();

      // Initially player-1's accordion is collapsed (not in DOM)
      let expandedContent = fixture.nativeElement.querySelector('.participant-card-expanded-content');
      expect(expandedContent).toBeNull();

      // Expand player-1
      component.togglePlayerExpanded(mockPlayers[0].id);
      fixture.detectChanges();

      expandedContent = fixture.nativeElement.querySelector('.participant-card-expanded-content');
      expect(expandedContent).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Session creation form interactions
// Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 5.1
// ---------------------------------------------------------------------------

describe('CampaignDetailPage — Session creation form', () => {

  let fixture: ComponentFixture<CampaignDetailPage>;
  let component: CampaignDetailPage;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getCampaignById',
      'getCampaignSessions',
      'getCampaignPlayers',
      'createSession',
    ]);
    apiSpy.getCampaignById.and.returnValue(of(mockCampaign));
    apiSpy.getCampaignSessions.and.returnValue(of(mockSessions));
    apiSpy.getCampaignPlayers.and.returnValue(of(mockPlayers));

    await TestBed.configureTestingModule({
      imports: [CampaignDetailPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub() },
        { provide: RoleService, useValue: buildMockRoleService('dm') },
        { provide: AuthService, useValue: buildMockAuthService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit
  });

  it('"Nueva Sesión" button is present and clicking it sets showSessionForm to true', () => {
    const btn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="btn-nueva-sesion"]');
    expect(btn).toBeTruthy();

    btn.click();
    fixture.detectChanges();

    expect(component.showSessionForm).toBeTrue();
  });

  it('form is hidden when showSessionForm is false', () => {
    expect(component.showSessionForm).toBeFalse();

    const form = fixture.nativeElement.querySelector('[data-testid="session-creation-form"]');
    expect(form).toBeNull();
  });

  it('"Crear" button is disabled when form is invalid', () => {
    component.showSessionForm = true;
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="btn-crear-sesion"]');
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBeTrue();
  });

  it('"Crear" button is enabled when both fields are filled', () => {
    component.showSessionForm = true;
    fixture.detectChanges();

    component.sessionForm.setValue({ name: 'Test Session', scheduledDate: '2025-06-01T18:00' });
    fixture.detectChanges();

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="btn-crear-sesion"]');
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBeFalse();
  });

  it('clicking "Cancelar" calls cancelSessionForm() and hides the form', () => {
    component.showSessionForm = true;
    fixture.detectChanges();

    const cancelSpy = spyOn(component, 'cancelSessionForm').and.callThrough();

    const cancelBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="btn-cancelar-sesion"]');
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();

    expect(cancelSpy).toHaveBeenCalled();
    expect(component.showSessionForm).toBeFalse();
  });

  it('successful submit calls createSession with correct payload and then getCampaignSessions', () => {
    apiSpy.createSession.and.returnValue(of({ id: 'new-session' }));
    // getCampaignSessions is called once in ngOnInit and once after successful submit
    apiSpy.getCampaignSessions.and.returnValue(of(mockSessions));

    component.showSessionForm = true;
    fixture.detectChanges();

    component.sessionForm.setValue({ name: 'La Cripta', scheduledDate: '2025-06-01T18:00' });

    component.submitSession();

    expect(apiSpy.createSession).toHaveBeenCalledOnceWith({
      name: 'La Cripta',
      scheduledDate: new Date('2025-06-01T18:00').toISOString(),
      campaignId: CAMPAIGN_ID,
    });
    expect(apiSpy.getCampaignSessions).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(component.showSessionForm).toBeFalse();
  });

  it('failed submit sets errorSession and keeps form open', () => {
    apiSpy.createSession.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));

    component.showSessionForm = true;
    fixture.detectChanges();

    component.sessionForm.setValue({ name: 'La Cripta', scheduledDate: '2025-06-01T18:00' });

    component.submitSession();

    expect(component.errorSession).toBe('Server error');
    expect(component.showSessionForm).toBeTrue();
    expect(component.submittingSession).toBeFalse();
  });
});

describe('CampaignDetailPage — Player self-leave and DM kick actions', () => {

  let fixture: ComponentFixture<CampaignDetailPage>;
  let component: CampaignDetailPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getCampaignById',
      'getCampaignSessions',
      'getCampaignPlayers',
      'leaveCampaign',
      'kickPlayerFromCampaign',
    ]);
    apiSpy.getCampaignById.and.returnValue(of(mockCampaign));
    apiSpy.getCampaignSessions.and.returnValue(of(mockSessions));
    apiSpy.getCampaignPlayers.and.returnValue(of(mockPlayers));
    apiSpy.leaveCampaign.and.returnValue(of(undefined));
    apiSpy.kickPlayerFromCampaign.and.returnValue(of(undefined));

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CampaignDetailPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ActivatedRoute, useValue: buildActivatedRouteStub() },
        { provide: RoleService, useValue: buildMockRoleService('player') },
        { provide: AuthService, useValue: { getUserIdFromToken: () => 'player-1' } },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should call leaveCampaign on ApiService and navigate to my-campaigns on confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.leaveCampaign();

    expect(apiSpy.leaveCampaign).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/my-campaigns']);
  });

  it('should call kickPlayerFromCampaign on ApiService and reload players list on confirmation', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.kickPlayer('player-2', 'Player Two');

    expect(apiSpy.kickPlayerFromCampaign).toHaveBeenCalledWith(CAMPAIGN_ID, 'player-2');
    expect(apiSpy.getCampaignPlayers).toHaveBeenCalled();
  });
});


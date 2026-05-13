/**
 * Property-Based Tests for CampaignDetailPage — Role-Based Rendering
 *
 * Property 2: Role-based rendering in CampaignDetailPage
 *
 * For any campaign data + role value:
 * - Session creation button present iff role is 'dm'
 * - "Asignar Personaje" section present iff role is 'player' and accessDenied === false
 *
 * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EMPTY, of } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignDetailPage } from './campaign-detail.page';
import { ApiService, CampaignDetailDto, PlayerCampaignSummary } from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Non-empty alphanumeric string safe for HTML content checks.
 */
const safeString = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/).filter((s) => s.trim().length > 0);

const campaignDetailArb = (): fc.Arbitrary<CampaignDetailDto> =>
  fc.record({
    id: fc.uuid(),
    name: safeString(),
    description: safeString(),
    maxPlayers: fc.integer({ min: 1, max: 20 }),
    joinPrice: fc.integer({ min: 0, max: 100 }),
    visibility: fc.constantFrom('PUBLIC', 'PRIVATE'),
    owner: fc.record({
      id: fc.uuid(),
      name: safeString(),
      email: fc.emailAddress()
    })
  });

// ---------------------------------------------------------------------------
// Helper: build a fresh fixture for each iteration
// ---------------------------------------------------------------------------

async function createFixtureForRoleTest(
  role: 'dm' | 'player',
  campaignData: CampaignDetailDto,
): Promise<{ component: CampaignDetailPage; nativeElement: HTMLElement }> {
  TestBed.resetTestingModule();

  const enrolledCampaigns: PlayerCampaignSummary[] = [
    {
      campaignId: campaignData.id,
      campaignName: campaignData.name,
      dmName: 'DM',
      nextSessionDate: null,
    },
  ];

  const mockApi = jasmine.createSpyObj<ApiService>('ApiService', [
    'getPlayerCampaigns',
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'getCharactersByUser',
  ]);

  if (role === 'player') {
    // Player is enrolled in this campaign → accessDenied = false
    mockApi.getPlayerCampaigns.and.returnValue(of(enrolledCampaigns));
    mockApi.getCharactersByUser.and.returnValue(of([]));
  } else {
    mockApi.getPlayerCampaigns.and.returnValue(EMPTY);
    mockApi.getCharactersByUser.and.returnValue(EMPTY);
  }

  mockApi.getCampaignById.and.returnValue(of(campaignData));
  mockApi.getCampaignSessions.and.returnValue(of([]));
  mockApi.getCampaignPlayers.and.returnValue(of([]));

  await TestBed.configureTestingModule({
    imports: [CampaignDetailPage],
    providers: [
      { provide: ApiService, useValue: mockApi },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => campaignData.id } } },
      },
      { provide: RoleService, useValue: { activeRole: role } },
      { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-id' } },
      Location,
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CampaignDetailPage);
  fixture.detectChanges();

  return { component: fixture.componentInstance, nativeElement: fixture.nativeElement };
}

// ---------------------------------------------------------------------------
// 6.2 — Property 2: Role-based rendering in CampaignDetailPage
// Validates: Requirements 3.1, 3.2, 3.4, 3.5
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 6.2 Property 2: Role-based rendering', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
   *
   * For any campaign data + role value:
   * - Session creation button (data-testid="btn-nueva-sesion") is present iff role is 'dm'
   * - "Asignar Personaje" section (data-testid="section-assign-character") is present
   *   iff role is 'player' and accessDenied === false
   */
  it('Property 2: session button present iff dm; assign section present iff player and not accessDenied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<'dm' | 'player'>('dm', 'player'),
        campaignDetailArb(),
        async (role, campaignData) => {
          const { component, nativeElement } = await createFixtureForRoleTest(role, campaignData);

          // Verify component state
          expect(component.isPlayer).toBe(role === 'player');

          // When player is enrolled, accessDenied should be false
          if (role === 'player') {
            expect(component.accessDenied).toBeFalse();
          }

          // Verify DOM: session creation button
          const sessionBtn = nativeElement.querySelector('[data-testid="btn-nueva-sesion"]');
          if (role === 'dm') {
            expect(sessionBtn).toBeTruthy();
          } else {
            expect(sessionBtn).toBeNull();
          }

          // Verify DOM: assign character section
          const assignSection = nativeElement.querySelector('[data-testid="section-assign-character"]');
          if (role === 'player' && !component.accessDenied) {
            expect(assignSection).toBeTruthy();
          } else {
            expect(assignSection).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

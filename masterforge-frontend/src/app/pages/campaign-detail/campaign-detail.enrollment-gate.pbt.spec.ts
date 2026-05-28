/**
 * Property-Based Tests for CampaignDetailPage — Enrollment Gate
 *
 * Property 3: Enrollment gate blocks unenrolled players
 *
 * For any set of enrolled campaign IDs and any campaign ID,
 * `accessDenied` SHALL be `true` iff the current campaign ID is not in the enrolled set.
 *
 * **Validates: Requirements 6.2**
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EMPTY, of } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignDetailPage } from './campaign-detail.page';
import { ApiService, PlayerCampaignSummary } from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helper: build a fresh fixture for each iteration
// ---------------------------------------------------------------------------

async function createFixtureForEnrollmentTest(
  enrolledIds: string[],
  currentCampaignId: string,
): Promise<{ component: CampaignDetailPage }> {
  TestBed.resetTestingModule();

  const enrolledCampaigns: PlayerCampaignSummary[] = enrolledIds.map((id) => ({
    campaignId: id,
    campaignName: 'Test',
    dmName: 'DM',
    nextSessionDate: null,
  }));

  const mockApi = jasmine.createSpyObj<ApiService>('ApiService', [
    'getPlayerCampaigns',
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'getCharactersByUser',
  ]);
  mockApi.getPlayerCampaigns.and.returnValue(of(enrolledCampaigns));
  const campaignData = {
    id: currentCampaignId,
    name: 'Test Campaign',
    description: 'A test campaign',
    maxPlayers: 4,
    joinPrice: 0,
    visibility: 'PUBLIC',
    owner: { id: 'some-other-dm-id', name: 'DM', email: 'dm@test.com' },
  };
  mockApi.getCampaignById.and.returnValue(of(campaignData));
  mockApi.getCampaignSessions.and.returnValue(EMPTY);
  mockApi.getCampaignPlayers.and.returnValue(EMPTY);
  mockApi.getCharactersByUser.and.returnValue(EMPTY);

  await TestBed.configureTestingModule({
    imports: [CampaignDetailPage],
    providers: [
      { provide: ApiService, useValue: mockApi },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => currentCampaignId } } },
      },
      { provide: RoleService, useValue: { activeRole: 'player' } },
      { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-id', isPro: () => false, getCurrentUser: () => ({ id: 'user-1', name: 'Test User', role: 'USER' }),} },
      Location,
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CampaignDetailPage);
  fixture.detectChanges();

  return { component: fixture.componentInstance };
}

// ---------------------------------------------------------------------------
// 6.1 — Property 3: Enrollment gate blocks unenrolled players
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 6.1 Property 3: Enrollment gate blocks unenrolled players', () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * For any set of enrolled campaign IDs and any campaign ID,
   * `accessDenied` SHALL be `true` iff the current campaign ID is not in the enrolled set.
   */
  it('Property 3: accessDenied is true iff current campaign ID is not in the enrolled set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.uuid()),
        fc.uuid(),
        async (enrolledIds, currentCampaignId) => {
          const { component } = await createFixtureForEnrollmentTest(enrolledIds, currentCampaignId);

          const expectedAccessDenied = !enrolledIds.includes(currentCampaignId);
          expect(component.accessDenied).toBe(expectedAccessDenied);
        },
      ),
      { numRuns: 100 },
    );
  });
});

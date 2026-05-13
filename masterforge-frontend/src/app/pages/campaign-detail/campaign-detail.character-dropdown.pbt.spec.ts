/**
 * Property-Based Tests for CampaignDetailPage — Character Dropdown Fidelity
 *
 * Property 5: Character dropdown fidelity
 *
 * For any non-empty CharacterSummary[], the dropdown SHALL contain an option
 * for each character showing name, class, and level.
 *
 * **Validates: Requirements 4.2**
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignDetailPage } from './campaign-detail.page';
import { ApiService, CharacterSummary, PlayerCampaignSummary, CampaignDetailDto } from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const characterArb = (): fc.Arbitrary<CharacterSummary> =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }),
    level: fc.integer({ min: 1, max: 20 }),
    dndClass: fc.string({ minLength: 1, maxLength: 30 }),
    dndRace: fc.string({ minLength: 1, maxLength: 30 }),
  });

const nonEmptyCharactersArb = (): fc.Arbitrary<CharacterSummary[]> =>
  fc.array(characterArb(), { minLength: 1 });

// ---------------------------------------------------------------------------
// Helper: build a fresh fixture for each iteration
// ---------------------------------------------------------------------------

async function createFixtureForDropdownTest(
  characters: CharacterSummary[],
): Promise<{ component: CampaignDetailPage; fixture: any; nativeElement: HTMLElement }> {
  TestBed.resetTestingModule();

  const campaignId = 'test-campaign-id-dropdown';

  const enrolledCampaigns: PlayerCampaignSummary[] = [
    {
      campaignId,
      campaignName: 'Test Campaign',
      dmName: 'DM',
      nextSessionDate: null,
    },
  ];

  const campaignData: CampaignDetailDto = {
    id: campaignId,
    name: 'Test Campaign',
    description: 'Test',
    maxPlayers: 6,
    joinPrice: 0,
    visibility: 'PUBLIC',
    owner: { id: 'u1', name: 'User', email: 'u@e.com' }
  };

  const mockApi = jasmine.createSpyObj<ApiService>('ApiService', [
    'getPlayerCampaigns',
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'getCharactersByUser',
  ]);

  // Player is enrolled → accessDenied = false
  mockApi.getPlayerCampaigns.and.returnValue(of(enrolledCampaigns));
  mockApi.getCampaignById.and.returnValue(of(campaignData));
  mockApi.getCampaignSessions.and.returnValue(of([]));
  mockApi.getCampaignPlayers.and.returnValue(of([]));
  // Return empty initially; we'll set playerCharacters manually after ngOnInit
  mockApi.getCharactersByUser.and.returnValue(of([]));

  await TestBed.configureTestingModule({
    imports: [CampaignDetailPage],
    providers: [
      { provide: ApiService, useValue: mockApi },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => campaignId } } },
      },
      { provide: RoleService, useValue: { activeRole: 'player' } },
      { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-id' } },
      Location,
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CampaignDetailPage);
  fixture.detectChanges(); // ngOnInit

  // Manually set playerCharacters after ngOnInit (simulating async load completing)
  const component = fixture.componentInstance;
  component.playerCharacters = characters;
  component.loadingCharacters = false;
  component.errorCharacters = null;
  fixture.detectChanges(); // re-render with characters

  return { component, fixture, nativeElement: fixture.nativeElement };
}

// ---------------------------------------------------------------------------
// 7.1 — Property 5: Character dropdown fidelity
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 7.1 Property 5: Character dropdown fidelity', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For any non-empty CharacterSummary[], the dropdown SHALL contain an option
   * for each character showing name, class, and level formatted as
   * `{name} — {dndClass} Nv.{level}`.
   */
  it('Property 5: dropdown contains one option per character with name, class, and level', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyCharactersArb(),
        async (characters) => {
          const { nativeElement } = await createFixtureForDropdownTest(characters);

          // The select element must exist
          const selectEl = nativeElement.querySelector<HTMLSelectElement>('[data-testid="select-character"]');
          expect(selectEl).toBeTruthy();

          if (!selectEl) return;

          // Collect only options with a non-empty value (exclude the placeholder)
          const allOptions = Array.from(selectEl.querySelectorAll('option'));
          const characterOptions = allOptions.filter((opt) => opt.value !== '');

          // Must have exactly one option per character
          expect(characterOptions.length).toBe(characters.length);

          // Each option text must match `{name} — {dndClass} Nv.{level}`
          // We normalize whitespace on both sides since browsers may add surrounding whitespace
          for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            const expectedText = `${char.name} — ${char.dndClass} Nv.${char.level}`.trim();
            const actualText = (characterOptions[i].textContent ?? '').trim();
            expect(actualText).toBe(expectedText);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

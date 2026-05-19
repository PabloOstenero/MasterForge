/**
 * Property-Based Tests for CampaignDetailPage
 *
 * Uses fast-check to verify rendering properties across arbitrary inputs.
 *
 * Properties covered:
 *   Property 6 — Campaign detail page renders campaign info       (Req 4.3)
 *   Property 7 — Players view renders all player names and emails (Req 4.6)
 *   Property 8 — Characters view renders all character details
 *                grouped by player                                (Req 4.7)
 *   Property 9 — Error messages are displayed for failed backend
 *                calls                                            (Req 4.11)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { EMPTY } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignDetailPage } from './campaign-detail.page';
import {
  ApiService,
  CampaignDetailDto,
  CampaignPlayerDto,
  CharacterSimpleDto,
} from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Shared test-bed setup
// ---------------------------------------------------------------------------

function buildMockApiService(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'getPlayerCampaigns',
    'getCharactersByUser',
  ]);
  // Return EMPTY so ngOnInit subscriptions never emit — we set state directly.
  spy.getCampaignById.and.returnValue(EMPTY);
  spy.getCampaignSessions.and.returnValue(EMPTY);
  spy.getCampaignPlayers.and.returnValue(EMPTY);
  spy.getPlayerCampaigns.and.returnValue(EMPTY);
  spy.getCharactersByUser.and.returnValue(EMPTY);
  return spy;
}

async function createFixture(): Promise<{
  fixture: ComponentFixture<CampaignDetailPage>;
  component: CampaignDetailPage;
}> {
  const mockApi = buildMockApiService();

  await TestBed.configureTestingModule({
    imports: [CampaignDetailPage],
    providers: [
      { provide: ApiService, useValue: mockApi },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => 'test-id' } } },
      },
      { provide: RoleService, useValue: { activeRole: 'dm' } },
      { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-id' } },
      Location,
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CampaignDetailPage);
  const component = fixture.componentInstance;
  // Initial detectChanges triggers ngOnInit; EMPTY observables never emit so
  // loading flags stay true — we reset them per-test below.
  fixture.detectChanges();

  return { fixture, component };
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/**
 * Non-empty alphanumeric string that is safe to search in innerHTML.
 * Avoids characters that get HTML-encoded (', ", &, <, >) or that appear
 * in Angular attribute values and could produce false positives.
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
      name: fc.string(),
      email: fc.emailAddress()
    })
  });

const characterArb = (): fc.Arbitrary<CharacterSimpleDto> =>
  fc.record({
    id: fc.uuid(),
    name: safeString(),
    level: fc.integer({ min: 1, max: 20 }),
    dndClass: safeString(),
    dndRace: safeString(),
  });

/** Safe email: only alphanumeric local part and domain, no special chars. */
const safeEmail = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'net', 'org'),
  ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const playerArb = (minChars = 0, maxChars = 0): fc.Arbitrary<CampaignPlayerDto> =>
  fc.record({
    id: fc.uuid(),
    name: safeString(),
    email: safeEmail(),
    subscriptionTier: fc.constantFrom('FREE', 'PREMIUM'),
    characters: fc.array(characterArb(), { minLength: minChars, maxLength: maxChars }),
  });

const playersArrayArb = (): fc.Arbitrary<CampaignPlayerDto[]> =>
  fc.array(playerArb(0, 0), { minLength: 1, maxLength: 10 });

// ---------------------------------------------------------------------------
// 13.1 — Property 6: Campaign detail page renders campaign info
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 13.1 Property 6: Campaign info rendering', () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * For any valid CampaignDetailDto, when the CampaignDetailPage renders with
   * that data, the rendered template SHALL contain the campaign's `name` and
   * `description` as visible text.
   */
  it('Property 6: rendered HTML contains campaign name and description for any CampaignDetailDto', async () => {
    const { fixture, component } = await createFixture();

    await fc.assert(
      fc.asyncProperty(campaignDetailArb(), async (campaign) => {
        // Arrange: set state directly, bypassing API calls
        component.loadingCampaign = false;
        component.errorCampaign = null;
        component.campaign = campaign;
        fixture.detectChanges();

        // Assert: both name and description appear in the rendered output
        const html: string = fixture.nativeElement.innerHTML;
        expect(html).toContain(campaign.name);
        expect(html).toContain(campaign.description);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// 13.2 — Property 7: Players view renders all player names and emails
// Validates: Requirements 4.6
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 13.2 Property 7: Players view rendering', () => {
  /**
   * **Validates: Requirements 4.6**
   *
   * For any non-empty list of CampaignPlayerDto objects, when the Players
   * segment is active, the rendered template SHALL contain each player's
   * `name` and `email` as visible text.
   */
  it('Property 7: rendered HTML contains every player name and email for any player list', async () => {
    const { fixture, component } = await createFixture();

    const arb = fc.array(playerArb(0, 0), { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(arb, async (players) => {
        // Arrange
        component.loadingPlayers = false;
        component.errorPlayers = null;
        component.players = players;
        component.activeSegment = 'jugadores';
        fixture.detectChanges();

        // Assert
        const html: string = fixture.nativeElement.innerHTML;
        for (const player of players) {
          expect(html).toContain(player.name);
          expect(html).toContain(player.email);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// 13.3 — Property 8: Characters view renders all character details grouped by player
// Validates: Requirements 4.7
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 13.3 Property 8: Characters view rendering grouped by player', () => {
  /**
   * **Validates: Requirements 4.7**
   *
   * For any list of CampaignPlayerDto objects where each player has 1–5
   * characters, the rendered template SHALL contain each character's
   * `name`, `level`, `dndClass`, and `dndRace` inside the player's expanded card.
   */
  it('Property 8: rendered HTML contains all character details under the correct player header', async () => {
    const { fixture, component } = await createFixture();

    // Each player has 1–5 characters
    const arb = fc.array(playerArb(1, 5), { minLength: 1, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(arb, async (players) => {
        // Arrange
        component.loadingPlayers = false;
        component.errorPlayers = null;
        component.players = players;
        for (const player of players) {
          component.expandedPlayerIds[player.id] = true;
        }
        fixture.detectChanges();

        const html: string = fixture.nativeElement.innerHTML;

        // Assert: every character's fields appear in the HTML
        for (const player of players) {
          for (const char of player.characters) {
            expect(html).toContain(char.name);
            expect(html).toContain(String(char.level));
            expect(html).toContain(char.dndClass);
            expect(html).toContain(char.dndRace);
          }
        }

        // Assert: each character appears under its player's header inside the player-item card
        const nativeEl: HTMLElement = fixture.nativeElement;
        const playerItems = Array.from(
          nativeEl.querySelectorAll<HTMLElement>('[data-testid="player-item"]'),
        );

        expect(playerItems.length).toBe(players.length);

        playerItems.forEach((group, idx) => {
          const player = players[idx];
          const nameEl = group.querySelector<HTMLElement>('[data-testid="player-name"]');
          expect(nameEl).toBeTruthy();
          expect(nameEl!.textContent).toContain(player.name);

          const charItems = Array.from(
            group.querySelectorAll<HTMLElement>('[data-testid="character-item"]'),
          );
          expect(charItems.length).toBe(player.characters.length);

          player.characters.forEach((char, charIdx) => {
            const itemHtml = charItems[charIdx].innerHTML;
            expect(itemHtml).toContain(char.name);
            expect(itemHtml).toContain(String(char.level));
            expect(itemHtml).toContain(char.dndClass);
            expect(itemHtml).toContain(char.dndRace);
          });
        });
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// 13.4 — Property 9: Error messages are displayed for failed backend calls
// Validates: Requirements 4.11
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — 13.4 Property 9: Independent error state handling', () => {
  /**
   * **Validates: Requirements 4.11**
   *
   * For any HTTP error from any of the three backend calls, the
   * CampaignDetailPage SHALL display a non-empty error string in the section
   * corresponding to the failed call. The other two sections SHALL NOT be in
   * an error state.
   */

  it('Property 9a: errorCampaign is shown and other sections have no error', async () => {
    const { fixture, component } = await createFixture();

    await fc.assert(
      fc.asyncProperty(safeString(), async (errorMsg) => {
        // Arrange: only campaign call fails
        component.loadingCampaign = false;
        component.loadingSessions = false;
        component.loadingPlayers = false;
        component.errorCampaign = errorMsg;
        component.errorSessions = null;
        component.errorPlayers = null;
        fixture.detectChanges();

        const nativeEl: HTMLElement = fixture.nativeElement;

        // The campaign error section must show a non-empty string
        const campaignError = nativeEl.querySelector<HTMLElement>('[data-testid="error-campaign"]');
        expect(campaignError).toBeTruthy();
        expect(campaignError!.textContent!.trim().length).toBeGreaterThan(0);

        // Sessions and players error sections must NOT be present
        const sessionsError = nativeEl.querySelector('[data-testid="error-sessions"]');
        expect(sessionsError).toBeNull();

        // Players error: set segment to jugadores to check panel-jugadores
        component.activeSegment = 'jugadores';
        fixture.detectChanges();
        const playersError = nativeEl.querySelector('[data-testid="error-players"]');
        expect(playersError).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('Property 9b: errorSessions is shown and other sections have no error', async () => {
    const { fixture, component } = await createFixture();

    await fc.assert(
      fc.asyncProperty(safeString(), async (errorMsg) => {
        // Arrange: only sessions call fails
        component.loadingCampaign = false;
        component.loadingSessions = false;
        component.loadingPlayers = false;
        component.errorCampaign = null;
        component.errorSessions = errorMsg;
        component.errorPlayers = null;
        component.campaign = {
          id: 'test-id',
          name: 'Test',
          description: 'Desc',
          maxPlayers: 4,
          joinPrice: 0,
          visibility: 'PUBLIC',
          owner: { id: 'u1', name: 'User', email: 'u@e.com' }
        };
        fixture.detectChanges();

        const nativeEl: HTMLElement = fixture.nativeElement;

        // Sessions error section must show a non-empty string
        const sessionsError = nativeEl.querySelector<HTMLElement>('[data-testid="error-sessions"]');
        expect(sessionsError).toBeTruthy();
        expect(sessionsError!.textContent!.trim().length).toBeGreaterThan(0);

        // Campaign error section must NOT be present
        const campaignError = nativeEl.querySelector('[data-testid="error-campaign"]');
        expect(campaignError).toBeNull();

        // Players error section must NOT be present
        component.activeSegment = 'jugadores';
        fixture.detectChanges();
        const playersError = nativeEl.querySelector('[data-testid="error-players"]');
        expect(playersError).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('Property 9c: errorPlayers is shown and other sections have no error', async () => {
    const { fixture, component } = await createFixture();

    await fc.assert(
      fc.asyncProperty(safeString(), async (errorMsg) => {
        // Arrange: only players call fails
        component.loadingCampaign = false;
        component.loadingSessions = false;
        component.loadingPlayers = false;
        component.errorCampaign = null;
        component.errorSessions = null;
        component.errorPlayers = errorMsg;
        component.campaign = {
          id: 'test-id',
          name: 'Test',
          description: 'Desc',
          maxPlayers: 4,
          joinPrice: 0,
          visibility: 'PUBLIC',
          owner: { id: 'u1', name: 'User', email: 'u@e.com' }
        };
        component.sessions = [];
        component.activeSegment = 'jugadores';
        fixture.detectChanges();

        const nativeEl: HTMLElement = fixture.nativeElement;

        // Players error section must show a non-empty string
        const playersError = nativeEl.querySelector<HTMLElement>('[data-testid="error-players"]');
        expect(playersError).toBeTruthy();
        expect(playersError!.textContent!.trim().length).toBeGreaterThan(0);

        // Campaign error section must NOT be present
        const campaignError = nativeEl.querySelector('[data-testid="error-campaign"]');
        expect(campaignError).toBeNull();

        // Sessions error section must NOT be present
        const sessionsError = nativeEl.querySelector('[data-testid="error-sessions"]');
        expect(sessionsError).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

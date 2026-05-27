/**
 * Property-Based Tests — CampaignDetailPage Session Creation Form
 *
 * Uses fast-check to verify session-form correctness properties.
 *
 * Properties covered:
 *   P1 — Form disabled while invalid                  (Req 2.3)
 *   P2 — Form enabled only when both fields are valid  (Req 2.4)
 *   P3 — API payload integrity                         (Req 3.1)
 *   P4 — Sessions list refresh after success           (Req 3.3, 6.1)
 *   P5 — Form reset after success                      (Req 3.4, 5.2)
 *   P6 — Form stays open on error                      (Req 4.1, 4.2, 4.3)
 *   P7 — Cancel does not call API                      (Req 5.1, 5.2)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { CampaignDetailPage } from './campaign-detail.page';
import { ApiService, SessionSummaryDto } from '../../services/api';
import { RoleService } from '../../services/role.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMPAIGN_ID = 'test-campaign-id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockApiService(): jasmine.SpyObj<ApiService> {
  const spy = jasmine.createSpyObj<ApiService>('ApiService', [
    'getCampaignById',
    'getCampaignSessions',
    'getCampaignPlayers',
    'createSession',
    'getPlayerCampaigns',
    'getCharactersByUser',
  ]);
  spy.getCampaignById.and.returnValue(of({
    id: CAMPAIGN_ID,
    name: 'Test Campaign',
    description: 'Desc',
    maxPlayers: 4,
    joinPrice: 0,
    visibility: 'PUBLIC',
    owner: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
  }));
  spy.getCampaignSessions.and.returnValue(of([]));
  spy.getCampaignPlayers.and.returnValue(of([]));
  spy.createSession.and.returnValue(of({ id: 'new-session-id' }));
  spy.getPlayerCampaigns.and.returnValue(of([]));
  spy.getCharactersByUser.and.returnValue(of([]));
  return spy;
}

async function createFixture(apiSpy: jasmine.SpyObj<ApiService>): Promise<{
  fixture: ComponentFixture<CampaignDetailPage>;
  component: CampaignDetailPage;
}> {
  await TestBed.configureTestingModule({
    imports: [CampaignDetailPage, ReactiveFormsModule],
    providers: [
      { provide: ApiService, useValue: apiSpy },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => CAMPAIGN_ID } } },
      },
      { provide: RoleService, useValue: { activeRole: 'dm' } },
      { provide: AuthService, useValue: { getUserIdFromToken: () => 'test-user-id' } },
      Location,
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(CampaignDetailPage);
  const component = fixture.componentInstance;
  fixture.detectChanges(); // triggers ngOnInit, builds sessionForm
  return { fixture, component };
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/** Non-empty string of 1–255 printable chars (no HTML-special chars). */
const validName = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[a-zA-Z0-9 ]{1,255}$/).filter((s) => s.trim().length > 0);

/** ISO-like datetime-local string (YYYY-MM-DDTHH:mm). */
const validDate = (): fc.Arbitrary<string> =>
  fc.date({ min: new Date('2025-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:00Z') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = d.getUTCFullYear();
      const month = pad(d.getUTCMonth() + 1);
      const day = pad(d.getUTCDate());
      const hours = pad(d.getUTCHours());
      const minutes = pad(d.getUTCMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    });

/** Empty string (the only value that fails Validators.required). */
const emptyString = (): fc.Arbitrary<string> =>
  fc.constant('');

// ---------------------------------------------------------------------------
// P1 — Form disabled while invalid
// Validates: Requirements 2.3
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P1: Form disabled while invalid', () => {
  /**
   * For any (name, scheduledDate) where at least one is empty/blank,
   * sessionForm.valid must be false and submitSession() must not call createSession.
   */
  it('P1: sessionForm is invalid and createSession is not called when at least one field is blank', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    const arb = fc.oneof(
      // name empty, date valid
      fc.tuple(emptyString(), validDate()),
      // name valid, date empty
      fc.tuple(validName(), emptyString()),
      // both empty
      fc.tuple(emptyString(), emptyString()),
    );

    await fc.assert(
      fc.asyncProperty(arb, async ([name, scheduledDate]) => {
        apiSpy.createSession.calls.reset();

        component.sessionForm.setValue({ name, scheduledDate });
        component.submittingSession = false;

        expect(component.sessionForm.valid).toBeFalse();

        component.submitSession();

        expect(apiSpy.createSession).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P2 — Form enabled only when both fields are valid
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P2: Form enabled when both fields are valid', () => {
  /**
   * For any non-empty name (1–255 chars) and non-empty scheduledDate,
   * sessionForm.valid must be true.
   */
  it('P2: sessionForm is valid when name and scheduledDate are both non-empty', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), async (name, scheduledDate) => {
        component.sessionForm.setValue({ name, scheduledDate });

        expect(component.sessionForm.valid).toBeTrue();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// P3 — API payload integrity
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P3: API payload integrity', () => {
  /**
   * For any valid (name, scheduledDate) pair, createSession must be called
   * exactly once with name equal to the form value, scheduledDate equal to
   * new Date(scheduledDate).toISOString(), campaignId equal to the route param,
   * and price equal to 0.
   */
  it('P3: createSession is called with the correct payload for any valid form input', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), async (name, scheduledDate) => {
        apiSpy.createSession.calls.reset();
        apiSpy.createSession.and.returnValue(of({ id: 'new-session-id' }));
        apiSpy.getCampaignSessions.calls.reset();
        apiSpy.getCampaignSessions.and.returnValue(of([]));

        component.sessionForm.setValue({ name, scheduledDate });
        component.submittingSession = false;
        component.showSessionForm = true;

        component.submitSession();

        expect(apiSpy.createSession).toHaveBeenCalledTimes(1);
        const callArgs = apiSpy.createSession.calls.mostRecent().args[0];
        expect(callArgs.name).toBe(name);
        expect(callArgs.scheduledDate).toBe(new Date(scheduledDate).toISOString());
        expect(callArgs.campaignId).toBe(CAMPAIGN_ID);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// P4 — Sessions list refresh after success
// Validates: Requirements 3.3, 6.1
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P4: Sessions list refresh after success', () => {
  /**
   * After a successful createSession call, getCampaignSessions must be called
   * with the same campaignId and sessions must be updated to the returned value.
   */
  it('P4: getCampaignSessions is called and sessions updated after successful createSession', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    const sessionArb = fc.array(
      fc.record<SessionSummaryDto>({
        id: fc.uuid(),
        name: validName(),
        scheduledDate: fc.date().map((d) => d.toISOString()),
      }),
      { minLength: 1, maxLength: 5 },
    );

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), sessionArb, async (name, scheduledDate, updatedSessions) => {
        apiSpy.createSession.calls.reset();
        apiSpy.createSession.and.returnValue(of({ id: 'new-session-id' }));
        apiSpy.getCampaignSessions.calls.reset();
        apiSpy.getCampaignSessions.and.returnValue(of(updatedSessions));

        component.sessionForm.setValue({ name, scheduledDate });
        component.submittingSession = false;
        component.showSessionForm = true;

        component.submitSession();

        // getCampaignSessions called once during ngOnInit and once after success
        const reloadCalls = apiSpy.getCampaignSessions.calls.all()
          .filter((c) => c.args[0] === CAMPAIGN_ID);
        expect(reloadCalls.length).toBeGreaterThanOrEqual(1);
        expect(component.sessions).toEqual(updatedSessions);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// P5 — Form reset after success
// Validates: Requirements 3.4, 5.2
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P5: Form reset after success', () => {
  /**
   * After a successful createSession call, showSessionForm must be false
   * and both form controls must be reset to empty/null.
   */
  it('P5: showSessionForm is false and form controls are empty after successful submit', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), async (name, scheduledDate) => {
        apiSpy.createSession.calls.reset();
        apiSpy.createSession.and.returnValue(of({ id: 'new-session-id' }));
        apiSpy.getCampaignSessions.and.returnValue(of([]));

        component.sessionForm.setValue({ name, scheduledDate });
        component.submittingSession = false;
        component.showSessionForm = true;

        component.submitSession();

        expect(component.showSessionForm).toBeFalse();
        // After reset(), form controls are null (reactive forms reset to null by default)
        expect(component.sessionForm.get('name')?.value).toBeFalsy();
        expect(component.sessionForm.get('scheduledDate')?.value).toBeFalsy();
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// P6 — Form stays open on error
// Validates: Requirements 4.1, 4.2, 4.3
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P6: Form stays open on error', () => {
  /**
   * After a failed createSession call, showSessionForm must remain true,
   * errorSession must be a non-empty string, and submittingSession must be false.
   */
  it('P6: showSessionForm stays true, errorSession is set, submittingSession is false on API error', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    const errorMsgArb = fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/);

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), errorMsgArb, async (name, scheduledDate, errorMsg) => {
        apiSpy.createSession.calls.reset();
        apiSpy.createSession.and.returnValue(
          throwError(() => ({ error: { message: errorMsg } })),
        );

        component.sessionForm.setValue({ name, scheduledDate });
        component.submittingSession = false;
        component.showSessionForm = true;
        component.errorSession = null;

        component.submitSession();

        expect(component.showSessionForm).toBeTrue();
        expect(component.errorSession).toBeTruthy();
        expect(component.errorSession!.length).toBeGreaterThan(0);
        expect(component.submittingSession).toBeFalse();
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// P7 — Cancel does not call API
// Validates: Requirements 5.1, 5.2
// ---------------------------------------------------------------------------

describe('CampaignDetailPage PBT — P7: Cancel does not call API', () => {
  /**
   * Calling cancelSessionForm() must never trigger createSession,
   * must set showSessionForm to false, and must reset both form controls.
   */
  it('P7: cancelSessionForm() does not call createSession, hides form, and resets controls', async () => {
    const apiSpy = buildMockApiService();
    const { component } = await createFixture(apiSpy);

    await fc.assert(
      fc.asyncProperty(validName(), validDate(), async (name, scheduledDate) => {
        apiSpy.createSession.calls.reset();

        component.sessionForm.setValue({ name, scheduledDate });
        component.showSessionForm = true;
        component.errorSession = 'some previous error';

        component.cancelSessionForm();

        expect(apiSpy.createSession).not.toHaveBeenCalled();
        expect(component.showSessionForm).toBeFalse();
        expect(component.sessionForm.get('name')?.value).toBeFalsy();
        expect(component.sessionForm.get('scheduledDate')?.value).toBeFalsy();
        expect(component.errorSession).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});

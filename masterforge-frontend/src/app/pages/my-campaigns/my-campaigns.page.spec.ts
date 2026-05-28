import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { MyCampaignsPage } from './my-campaigns.page';
import { ApiService, PlayerCampaignSummary } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const campaignArb = fc.record<PlayerCampaignSummary>({
  campaignId: fc.uuid(),
  campaignName: fc.string({ minLength: 1, maxLength: 60 }),
  dmName: fc.string({ minLength: 1, maxLength: 40 }),
  nextSessionDate: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(): jasmine.SpyObj<ApiService> {
  const api = jasmine.createSpyObj<ApiService>('ApiService', ['getPlayerCampaigns']);
  api.getPlayerCampaigns.and.returnValue(of([]));
  return api;
}

// ---------------------------------------------------------------------------
// MyCampaignsPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('MyCampaignsPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<MyCampaignsPage>;
  let component: MyCampaignsPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let router: Router;

  async function setup() {
    apiSpy = buildApiSpy();

    await TestBed.configureTestingModule({
      imports: [MyCampaignsPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MyCampaignsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Property 4: Campaign list fidelity
  // Feature: player-campaign-detail, Property 4: Campaign list fidelity
  // Validates: Requirements 2.3, 6.3
  // -------------------------------------------------------------------------
  describe('Property 4: Campaign list fidelity', () => {

    it('P4 — for any array of campaigns, number of rendered items equals array length', async () => {
      // **Validates: Requirements 2.3, 6.3**
      await setup();

      // Feature: player-campaign-detail, Property 4: Campaign list fidelity
      fc.assert(
        fc.property(
          fc.array(campaignArb, { minLength: 0, maxLength: 20 }),
          (campaigns) => {
            component.campaigns = campaigns;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
            expect(items.length).toBe(campaigns.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('P4b — each rendered item displays the correct campaign name, DM name, and next session date', async () => {
      // **Validates: Requirements 2.3, 6.3**
      await setup();

      // Feature: player-campaign-detail, Property 4: Campaign list fidelity
      fc.assert(
        fc.property(
          fc.array(campaignArb, { minLength: 1, maxLength: 10 }),
          (campaigns) => {
            component.campaigns = campaigns;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
            expect(items.length).toBe(campaigns.length);

            campaigns.forEach((campaign, i) => {
              const item = items[i] as HTMLElement;

              const nameEl = item.querySelector('[data-testid="campaign-name"]');
              expect(nameEl).toBeTruthy();
              expect(nameEl!.textContent).toContain(campaign.campaignName);

              const dmEl = item.querySelector('[data-testid="campaign-dm"]');
              expect(dmEl).toBeTruthy();
              expect(dmEl!.textContent).toContain(campaign.dmName);

              const sessionEl = item.querySelector('[data-testid="campaign-next-session"]');
              expect(sessionEl).toBeTruthy();
              if (campaign.nextSessionDate) {
                expect(sessionEl!.textContent).toContain(campaign.nextSessionDate);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('P4c — empty array shows empty-state message, not campaign items', async () => {
      // **Validates: Requirements 2.3, 6.3**
      await setup();

      // Feature: player-campaign-detail, Property 4: Campaign list fidelity
      fc.assert(
        fc.property(fc.constant([] as PlayerCampaignSummary[]), (emptyList) => {
          component.campaigns = emptyList;
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
          const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-campaigns"]');

          expect(items.length).toBe(0);
          expect(emptyEl).toBeTruthy();
          expect(emptyEl.textContent).toContain('Aún no has emprendido el viaje');
        }),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 6: Navigation uses the correct campaign ID
  // Feature: player-campaign-detail, Property 6: Navigation uses the correct campaign ID
  // Validates: Requirements 2.6
  // -------------------------------------------------------------------------
  describe('Property 6: Navigation uses the correct campaign ID', () => {

    it('P6 — clicking any campaign item navigates to /campaigns/{campaignId} with exact UUID', async () => {
      // **Validates: Requirements 2.6**
      await setup();

      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      // Feature: player-campaign-detail, Property 6: Navigation uses the correct campaign ID
      fc.assert(
        fc.property(campaignArb, (campaign) => {
          navigateSpy.calls.reset();
          component.campaigns = [campaign];
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const item = fixture.nativeElement.querySelector('[data-testid="campaign-item"]');
          expect(item).toBeTruthy();
          item.click();

          expect(navigateSpy).toHaveBeenCalledWith(['/campaigns', campaign.campaignId]);
        }),
        { numRuns: 100 }
      );
    });

    it('P6b — navigation uses the exact UUID of the clicked item, not another campaign\'s id', async () => {
      // **Validates: Requirements 2.6**
      await setup();

      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      // Feature: player-campaign-detail, Property 6: Navigation uses the correct campaign ID
      fc.assert(
        fc.property(
          fc.array(campaignArb, { minLength: 2, maxLength: 5 }),
          fc.nat(),
          (campaigns, indexSeed) => {
            navigateSpy.calls.reset();
            // Ensure unique IDs to avoid false positives
            const uniqueCampaigns = campaigns.map((c, i) => ({
              ...c,
              campaignId: `${i}-${c.campaignId}`,
            }));
            component.campaigns = uniqueCampaigns;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const clickIndex = indexSeed % uniqueCampaigns.length;
            const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
            (items[clickIndex] as HTMLElement).click();

            expect(navigateSpy).toHaveBeenCalledWith([
              '/campaigns',
              uniqueCampaigns[clickIndex].campaignId,
            ]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Loading spinner visibility
  // -------------------------------------------------------------------------
  describe('Loading spinner', () => {

    it('spinner is visible while loading is true', async () => {
      await setup();

      fc.assert(
        fc.property(fc.boolean(), (isLoading) => {
          component.loading = isLoading;
          component.error = null;
          fixture.detectChanges();

          const spinner = fixture.nativeElement.querySelector('[data-testid="spinner-campaigns"]');
          if (isLoading) {
            expect(spinner).toBeTruthy();
          } else {
            expect(spinner).toBeNull();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('Error state', () => {

    it('error block is visible when error is set and loading is false', async () => {
      await setup();

      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 80 }),
          (errorMsg) => {
            component.error = errorMsg;
            component.loading = false;
            fixture.detectChanges();

            const errorEl = fixture.nativeElement.querySelector('[data-testid="error-campaigns"]');
            expect(errorEl).toBeTruthy();
            expect(errorEl.textContent).toContain(errorMsg);

            const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
            expect(items.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('on HTTP error, component sets error message and does not crash', async () => {
      await setup();

      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.string({ minLength: 1, maxLength: 80 }),
          (status, message) => {
            apiSpy.getPlayerCampaigns.and.returnValue(throwError(() => ({ status, message })));

            component.loadCampaigns();
            fixture.detectChanges();

            expect(component.error).toBeTruthy();
            expect(component.loading).toBeFalse();

            const items = fixture.nativeElement.querySelectorAll('[data-testid="campaign-item"]');
            expect(items.length).toBe(0);

            // Reset for next iteration
            apiSpy.getPlayerCampaigns.and.returnValue(of([]));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

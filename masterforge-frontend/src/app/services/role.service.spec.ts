/**
 * Tests for RoleService.
 *
 * Covers:
 * - Unit tests: player menu contains "Mis Campañas", DM menu does not
 * - Property test P1: Menu contents are role-specific
 *
 * Feature: player-campaign-detail
 * Property 1: Menu contents are role-specific
 * Validates: Requirements 1.1, 1.2
 */

import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { firstValueFrom, of } from 'rxjs';

import { RoleService } from './role.service';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('RoleService — unit tests', () => {
  let service: RoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ id: 'fallback', name: 'Fallback User', role: 'USER' }),
            getUserIdFromToken: () => 'fallback',
            isPro: () => false,
            currentUser$: of({ id: 'fallback', name: 'Fallback User', role: 'USER' })
          }
        },
        RoleService
      ]
    });
    service = TestBed.inject(RoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('player menu should contain "Mis Campañas" with route /my-campaigns', async () => {
    service['_activeRole'].next('player');
    const items = await firstValueFrom(service.menuItems$);
    const entry = items.find(i => i.title === 'Mis Campañas');
    expect(entry).toBeTruthy();
    expect(entry!.route).toBe('/my-campaigns');
    expect(entry!.icon).toBe('list-outline');
  });

  it('player menu should have "Mis Campañas" after "Mis Personajes" and before "Gremio de Campañas"', async () => {
    service['_activeRole'].next('player');
    const items = await firstValueFrom(service.menuItems$);
    const titles = items.map(i => i.title);
    const idxPersonajes = titles.indexOf('Mis Personajes');
    const idxCampanas = titles.indexOf('Mis Campañas');
    const idxGremio = titles.indexOf('Gremio de Campañas');
    expect(idxPersonajes).toBeGreaterThanOrEqual(0);
    expect(idxCampanas).toBeGreaterThan(idxPersonajes);
    expect(idxGremio).toBeGreaterThan(idxCampanas);
  });

  it('DM menu should NOT contain "Mis Campañas"', async () => {
    service['_activeRole'].next('dm');
    const items = await firstValueFrom(service.menuItems$);
    const entry = items.find(i => i.title === 'Mis Campañas');
    expect(entry).toBeUndefined();
  });

  it('toggleRole() should switch from dm to player', () => {
    service['_activeRole'].next('dm');
    service.toggleRole();
    expect(service.activeRole).toBe('player');
  });

  it('toggleRole() should switch from player to dm', () => {
    service['_activeRole'].next('player');
    service.toggleRole();
    expect(service.activeRole).toBe('dm');
  });
});

// ---------------------------------------------------------------------------
// Property-Based Test — P1: Menu contents are role-specific
// Feature: player-campaign-detail, Property 1: Menu contents are role-specific
// Validates: Requirements 1.1, 1.2
// ---------------------------------------------------------------------------

describe('RoleService — P1: Menu contents are role-specific', () => {
  /**
   * For any sequence of role toggles, menuItems$ SHALL contain "Mis Campañas"
   * iff the active role is 'player'.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  it('menuItems$ contains "Mis Campañas" iff active role is player (fast-check, ≥100 runs)', async () => {
    let propertyPassed = true;
    let failureReason = '';

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('dm' as const, 'player' as const), { minLength: 1, maxLength: 20 }),
          async (roleSequence) => {
            // Create a fresh service instance for each run to avoid state leakage
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
              providers: [
                {
                  provide: AuthService,
                  useValue: {
                    getCurrentUser: () => ({ id: 'fallback', name: 'Fallback User', role: 'USER' }),
                    getUserIdFromToken: () => 'fallback',
                    isPro: () => false,
                    currentUser$: of({ id: 'fallback', name: 'Fallback User', role: 'USER' })
                  }
                },
                RoleService
              ]
            });
            const service = TestBed.inject(RoleService);

            for (const role of roleSequence) {
              // Drive the service to the desired role
              service['_activeRole'].next(role);

              const items = await firstValueFrom(service.menuItems$);
              const hasMisCampanas = items.some(i => i.title === 'Mis Campañas');

              if (role === 'player') {
                if (!hasMisCampanas) {
                  return false; // property violated: player menu missing "Mis Campañas"
                }
                // Also verify route and icon
                const entry = items.find(i => i.title === 'Mis Campañas')!;
                if (entry.route !== '/my-campaigns') {
                  return false; // property violated: wrong route
                }
              } else {
                // role === 'dm'
                if (hasMisCampanas) {
                  return false; // property violated: DM menu contains "Mis Campañas"
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100, verbose: true }
      );
    } catch (e: unknown) {
      propertyPassed = false;
      failureReason = e instanceof Error ? e.message : String(e);
    }

    expect(propertyPassed)
      .withContext(`Property P1 failed: ${failureReason}`)
      .toBeTrue();
  });
});

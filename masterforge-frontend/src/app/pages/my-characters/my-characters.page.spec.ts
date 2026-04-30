import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import * as fc from 'fast-check';

import { MyCharactersPage } from './my-characters.page';
import { ApiService, CharacterSummary } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { authGuard } from '../../guards/auth.guard';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const characterArb = fc.record<CharacterSummary>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  level: fc.integer({ min: 1, max: 20 }),
  dndClass: fc.string({ minLength: 1, maxLength: 30 }),
  dndRace: fc.string({ minLength: 1, maxLength: 30 }),
});

// HTTP error status codes: 4xx and 5xx
const httpErrorStatusArb = fc.oneof(
  fc.integer({ min: 400, max: 499 }),
  fc.integer({ min: 500, max: 599 })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildApiSpy(userId: string | null = 'test-user-id'): {
  api: jasmine.SpyObj<ApiService>;
  auth: jasmine.SpyObj<AuthService>;
} {
  const api = jasmine.createSpyObj<ApiService>('ApiService', ['getCharactersByUser']);
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUserIdFromToken', 'isAuthenticated']);
  api.getCharactersByUser.and.returnValue(of([]));
  auth.getUserIdFromToken.and.returnValue(userId);
  auth.isAuthenticated.and.returnValue(userId !== null);
  return { api, auth };
}

// ---------------------------------------------------------------------------
// MyCharactersPage — Property-Based Tests
// ---------------------------------------------------------------------------

describe('MyCharactersPage — Property-Based Tests', () => {

  let fixture: ComponentFixture<MyCharactersPage>;
  let component: MyCharactersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  async function setup(userId: string | null = 'test-user-id') {
    const spies = buildApiSpy(userId);
    apiSpy = spies.api;
    authSpy = spies.auth;

    await TestBed.configureTestingModule({
      imports: [MyCharactersPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MyCharactersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // Property 1: Redirección de usuarios no autenticados
  // Feature: my-characters-page, Property 1: Redirección de usuarios no autenticados
  // Validates: Requisito 1.3
  // -------------------------------------------------------------------------
  describe('Property 1: Redirección de usuarios no autenticados', () => {

    it('P1 — authGuard returns UrlTree to /login for any unauthenticated access attempt', () => {
      // **Validates: Requirements 1.3**
      const authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

      TestBed.configureTestingModule({
        providers: [
          { provide: AuthService, useValue: authServiceSpy },
          provideRouter([]),
        ],
      });

      // Feature: my-characters-page, Property 1: Redirección de usuarios no autenticados
      fc.assert(
        fc.property(fc.constant(false), (_isAuthenticated) => {
          authServiceSpy.isAuthenticated.and.returnValue(false);
          const result = TestBed.runInInjectionContext(() =>
            authGuard({} as any, {} as any)
          );
          expect(result).toBeInstanceOf(UrlTree);
          expect((result as UrlTree).toString()).toBe('/login');
        }),
        { numRuns: 100 }
      );

      TestBed.resetTestingModule();
    });

    it('P1b — authGuard returns true for any authenticated access attempt', () => {
      // **Validates: Requirements 1.3**
      const authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

      TestBed.configureTestingModule({
        providers: [
          { provide: AuthService, useValue: authServiceSpy },
          provideRouter([]),
        ],
      });

      // Feature: my-characters-page, Property 1: Redirección de usuarios no autenticados
      fc.assert(
        fc.property(fc.constant(true), (_isAuthenticated) => {
          authServiceSpy.isAuthenticated.and.returnValue(true);
          const result = TestBed.runInInjectionContext(() =>
            authGuard({} as any, {} as any)
          );
          expect(result).toBeTrue();
        }),
        { numRuns: 100 }
      );

      TestBed.resetTestingModule();
    });
  });

  // -------------------------------------------------------------------------
  // Property 3: Visualización de mensaje de error ante fallo HTTP
  // Feature: my-characters-page, Property 3: Visualización de mensaje de error ante fallo HTTP
  // Validates: Requisito 2.3
  // -------------------------------------------------------------------------
  describe('Property 3: Visualización de mensaje de error ante fallo HTTP', () => {

    it('P3 — for any HTTP error (4xx/5xx), component shows non-empty error message and no character cards', async () => {
      // **Validates: Requirements 2.3**
      await setup();

      // Feature: my-characters-page, Property 3: Visualización de mensaje de error ante fallo HTTP
      fc.assert(
        fc.property(
          httpErrorStatusArb,
          fc.string({ minLength: 1, maxLength: 80 }),
          (status, message) => {
            const httpError = { status, message };
            apiSpy.getCharactersByUser.and.returnValue(throwError(() => httpError));

            component.loadCharacters();
            fixture.detectChanges();

            // Error message must be non-empty
            expect(component.error).toBeTruthy();
            expect(component.error!.length).toBeGreaterThan(0);

            // No character cards should be rendered
            const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
            expect(cards.length).toBe(0);

            // loading must be false
            expect(component.loading).toBeFalse();

            // Reset for next iteration
            apiSpy.getCharactersByUser.and.returnValue(of([]));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('P3b — error container is visible and character list is hidden on any HTTP error', async () => {
      // **Validates: Requirements 2.3**
      await setup();

      // Feature: my-characters-page, Property 3: Visualización de mensaje de error ante fallo HTTP
      fc.assert(
        fc.property(httpErrorStatusArb, (status) => {
          apiSpy.getCharactersByUser.and.returnValue(throwError(() => ({ status, message: `HTTP ${status}` })));

          component.loadCharacters();
          fixture.detectChanges();

          const errorContainer = fixture.nativeElement.querySelector('[data-testid="error-container"]');
          const charactersList = fixture.nativeElement.querySelector('[data-testid="characters-list"]');

          expect(errorContainer).toBeTruthy();
          expect(charactersList).toBeNull();

          apiSpy.getCharactersByUser.and.returnValue(of([]));
        }),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 4: Correspondencia entre personajes y tarjetas renderizadas
  // Feature: my-characters-page, Property 4: Correspondencia entre personajes y tarjetas renderizadas
  // Validates: Requisito 3.1
  // -------------------------------------------------------------------------
  describe('Property 4: Correspondencia entre personajes y tarjetas renderizadas', () => {

    it('P4 — for any array of characters (including empty), number of cards equals array length', async () => {
      // **Validates: Requirements 3.1**
      await setup();

      // Feature: my-characters-page, Property 4: Correspondencia entre personajes y tarjetas renderizadas
      fc.assert(
        fc.property(
          fc.array(characterArb, { minLength: 0, maxLength: 20 }),
          (characters) => {
            component.characters = characters;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
            expect(cards.length).toBe(characters.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('P4b — empty array shows empty state, not character cards', async () => {
      // **Validates: Requirements 3.1**
      await setup();

      // Feature: my-characters-page, Property 4: Correspondencia entre personajes y tarjetas renderizadas
      fc.assert(
        fc.property(fc.constant([] as CharacterSummary[]), (emptyList) => {
          component.characters = emptyList;
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
          const emptyContainer = fixture.nativeElement.querySelector('[data-testid="empty-container"]');

          expect(cards.length).toBe(0);
          expect(emptyContainer).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 5: Contenido completo de la tarjeta de personaje
  // Feature: my-characters-page, Property 5: Contenido completo de la tarjeta de personaje
  // Validates: Requisito 3.2
  // -------------------------------------------------------------------------
  describe('Property 5: Contenido completo de la tarjeta de personaje', () => {

    it('P5 — for any character, its card contains name, class, race and level', async () => {
      // **Validates: Requirements 3.2**
      await setup();

      // Feature: my-characters-page, Property 5: Contenido completo de la tarjeta de personaje
      fc.assert(
        fc.property(characterArb, (character) => {
          component.characters = [character];
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const card = fixture.nativeElement.querySelector('[data-testid="character-card"]');
          expect(card).toBeTruthy();

          const cardText: string = card.textContent ?? '';
          expect(cardText).toContain(character.name);
          expect(cardText).toContain(character.dndClass);
          expect(cardText).toContain(character.dndRace);
          expect(cardText).toContain(String(character.level));
        }),
        { numRuns: 100 }
      );
    });

    it('P5b — all N cards contain their respective character data', async () => {
      // **Validates: Requirements 3.2**
      await setup();

      // Feature: my-characters-page, Property 5: Contenido completo de la tarjeta de personaje
      fc.assert(
        fc.property(
          fc.array(characterArb, { minLength: 1, maxLength: 10 }),
          (characters) => {
            component.characters = characters;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
            expect(cards.length).toBe(characters.length);

            characters.forEach((character, i) => {
              const cardText: string = (cards[i] as HTMLElement).textContent ?? '';
              expect(cardText).toContain(character.name);
              expect(cardText).toContain(character.dndClass);
              expect(cardText).toContain(character.dndRace);
              expect(cardText).toContain(String(character.level));
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 6: Navegación correcta al hacer clic en una tarjeta
  // Feature: my-characters-page, Property 6: Navegación correcta al hacer clic en una tarjeta
  // Validates: Requisito 4.1
  // -------------------------------------------------------------------------
  describe('Property 6: Navegación correcta al hacer clic en una tarjeta', () => {

    it('P6 — clicking any character card navigates to /character-sheet/{id} with exact UUID', async () => {
      // **Validates: Requirements 4.1**
      await setup();

      // Set up spy once outside the property loop
      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      // Feature: my-characters-page, Property 6: Navegación correcta al hacer clic en una tarjeta
      fc.assert(
        fc.property(characterArb, (character) => {
          navigateSpy.calls.reset();
          component.characters = [character];
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const card = fixture.nativeElement.querySelector('[data-testid="character-card"]');
          expect(card).toBeTruthy();
          card.click();

          expect(navigateSpy).toHaveBeenCalledWith(['/character-sheet', character.id]);
        }),
        { numRuns: 100 }
      );
    });

    it('P6b — navigation uses the exact UUID of the clicked card, not another character\'s id', async () => {
      // **Validates: Requirements 4.1**
      await setup();

      // Set up spy once outside the property loop
      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

      // Feature: my-characters-page, Property 6: Navegación correcta al hacer clic en una tarjeta
      fc.assert(
        fc.property(
          fc.array(characterArb, { minLength: 2, maxLength: 5 }),
          fc.nat(),
          (characters, indexSeed) => {
            navigateSpy.calls.reset();
            // Ensure unique IDs to avoid false positives
            const uniqueChars = characters.map((c, i) => ({ ...c, id: `char-${i}-${c.id}` }));
            component.characters = uniqueChars;
            component.loading = false;
            component.error = null;
            fixture.detectChanges();

            const clickIndex = indexSeed % uniqueChars.length;
            const cards = fixture.nativeElement.querySelectorAll('[data-testid="character-card"]');
            (cards[clickIndex] as HTMLElement).click();

            expect(navigateSpy).toHaveBeenCalledWith(['/character-sheet', uniqueChars[clickIndex].id]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // -------------------------------------------------------------------------
  // Spinner visibility
  // -------------------------------------------------------------------------
  describe('Loading spinner', () => {

    it('spinner is visible while loading is true', async () => {
      await setup();

      fc.assert(
        fc.property(fc.boolean(), (isLoading) => {
          component.loading = isLoading;
          component.error = null;
          fixture.detectChanges();

          const spinner = fixture.nativeElement.querySelector('[data-testid="spinner"]');
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
  // Null userId — no HTTP call, shows error
  // -------------------------------------------------------------------------
  describe('Null userId handling', () => {

    it('when getUserIdFromToken returns null, no HTTP call is made and error is set', async () => {
      await setup(null);

      expect(apiSpy.getCharactersByUser).not.toHaveBeenCalled();
      expect(component.error).toBeTruthy();
      expect(component.loading).toBeFalse();
    });
  });
});

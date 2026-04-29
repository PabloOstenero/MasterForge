import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';

// ---------------------------------------------------------------------------
// Route Configuration Unit Tests
// Validates: Requirement 1.2
// ---------------------------------------------------------------------------

describe('App Routes — /forge-character route configuration', () => {
  it('should have a forge-character route that resolves to ForgeCharacterPage', async () => {
    // Find the parent route that contains children
    const authLayoutRoute = routes.find(r => r.path === '' && r.children);
    expect(authLayoutRoute).toBeTruthy('Expected an auth layout route with children');

    const forgeCharacterRoute = authLayoutRoute!.children!.find(r => r.path === 'forge-character');
    expect(forgeCharacterRoute).toBeTruthy('Expected a forge-character child route');
    expect(forgeCharacterRoute!.loadComponent).toBeTruthy('Expected forge-character route to use loadComponent');

    // Resolve the lazy-loaded component and verify it is ForgeCharacterPage
    const componentFactory = await forgeCharacterRoute!.loadComponent!();
    const { ForgeCharacterPage } = await import('./pages/forge-character/forge-character.page');

    expect(componentFactory).toBe(ForgeCharacterPage);
  });

  it('should NOT point forge-character route to CharacterSheetPage', async () => {
    const authLayoutRoute = routes.find(r => r.path === '' && r.children);
    const forgeCharacterRoute = authLayoutRoute!.children!.find(r => r.path === 'forge-character');

    const componentFactory = await forgeCharacterRoute!.loadComponent!();
    const { CharacterSheetPage } = await import('./pages/character-sheet/character-sheet.page');

    expect(componentFactory).not.toBe(CharacterSheetPage);
  });
});

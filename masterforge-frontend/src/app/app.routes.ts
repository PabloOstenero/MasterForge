import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [authGuard],
    children: [
      // Fix: Point to the refactored HomePage instead of InicioPage
      { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage), data: { pageTitle: 'home', pageIcon: 'home-outline' } },
      { path: 'players', loadComponent: () => import('./pages/players/players.page').then(m => m.PlayersPage), canActivate: [adminGuard], data: { pageTitle: 'Panel de Administración', pageIcon: 'people-outline' } },
      { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns.page').then(m => m.CampaignsPage), data: { pageTitle: 'Campañas', pageIcon: 'map-outline' } },
      { path: 'official-content', loadComponent: () => import('./pages/official-content/official-content.page').then(m => m.OfficialContentPage), data: { pageTitle: 'Contenido Oficial', pageIcon: 'color-wand-outline' } },
      { path: 'bestiary', loadComponent: () => import('./pages/bestiary/bestiary.page').then(m => m.BestiaryPage), data: { pageTitle: 'Bestiario', pageIcon: 'skull-outline' } },
      { path: 'campaigns/:id', loadComponent: () => import('./pages/campaign-detail/campaign-detail.page').then(m => m.CampaignDetailPage) },
      { path: 'campaigns/:id/combat-tracker', loadComponent: () => import('./pages/combat-tracker/combat-tracker.page').then(m => m.CombatTrackerPage) },
      { path: 'config', loadComponent: () => import('./pages/config/config.page').then(m => m.ConfigPage), data: { pageTitle: 'Configuración', pageIcon: 'settings-outline' } },
      // New routes for Player features (Assuming components will be generated)
      { path: 'forge-character', loadComponent: () => import('./pages/forge-character/forge-character.page').then(m => m.ForgeCharacterPage) },
      { path: 'homebrew', loadComponent: () => import('./pages/homebrew/homebrew.page').then(m => m.HomebrewPage) },
      { path: 'homebrew/class/new', loadComponent: () => import('./pages/homebrew-class-form/homebrew-class-form.page').then(m => m.HomebrewClassFormPage) },
      { path: 'homebrew/class/:id/edit', loadComponent: () => import('./pages/homebrew-class-form/homebrew-class-form.page').then(m => m.HomebrewClassFormPage) },
      { path: 'homebrew/subclass/new', loadComponent: () => import('./pages/homebrew-subclass-form/homebrew-subclass-form.page').then(m => m.HomebrewSubclassFormPage) },
      { path: 'homebrew/subclass/:id/edit', loadComponent: () => import('./pages/homebrew-subclass-form/homebrew-subclass-form.page').then(m => m.HomebrewSubclassFormPage) },
      { path: 'homebrew/race/new', loadComponent: () => import('./pages/homebrew-race-form/homebrew-race-form.page').then(m => m.HomebrewRaceFormPage) },
      { path: 'homebrew/race/:id/edit', loadComponent: () => import('./pages/homebrew-race-form/homebrew-race-form.page').then(m => m.HomebrewRaceFormPage) },
      { path: 'homebrew/monster/new', loadComponent: () => import('./pages/homebrew-monster-form/homebrew-monster-form.page').then(m => m.HomebrewMonsterFormPage) },
      { path: 'homebrew/monster/:id/edit', loadComponent: () => import('./pages/homebrew-monster-form/homebrew-monster-form.page').then(m => m.HomebrewMonsterFormPage) },
      { path: 'homebrew/spell/new', loadComponent: () => import('./pages/homebrew-spell-form/homebrew-spell-form.page').then(m => m.HomebrewSpellFormPage) },
      { path: 'homebrew/spell/:id/edit', loadComponent: () => import('./pages/homebrew-spell-form/homebrew-spell-form.page').then(m => m.HomebrewSpellFormPage) },
      { path: 'homebrew/item/new', loadComponent: () => import('./pages/homebrew-item-form/homebrew-item-form.page').then(m => m.HomebrewItemFormPage) },
      { path: 'homebrew/item/:id/edit', loadComponent: () => import('./pages/homebrew-item-form/homebrew-item-form.page').then(m => m.HomebrewItemFormPage) },
      { path: 'search-campaigns', loadComponent: () => import('./pages/search-campaigns/search-campaigns.page').then(m => m.SearchCampaignsPage) },
      { path: 'my-characters', loadComponent: () => import('./pages/my-characters/my-characters.page').then(m => m.MyCharactersPage), data: { pageTitle: 'Mis Personajes', pageIcon: 'shield-half-outline' } },
      { path: 'my-campaigns', loadComponent: () => import('./pages/my-campaigns/my-campaigns.page').then(m => m.MyCampaignsPage), data: { pageTitle: 'Mis Campañas', pageIcon: 'book-outline' } },
      { path: 'discord-callback', loadComponent: () => import('./pages/discord-callback/discord-callback.page').then(m => m.DiscordCallbackPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },
  {
    path: 'character-sheet/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/character-sheet/character-sheet.page').then(m => m.CharacterSheetPage)
  }
];



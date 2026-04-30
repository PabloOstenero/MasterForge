import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

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
      { path: 'home', loadComponent: () => import('./home/home.page').then(m => m.HomePage) },
      { path: 'players', loadComponent: () => import('./pages/players/players.page').then(m => m.PlayersPage) },
      { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns.page').then(m => m.CampaignsPage) },
      { path: 'bestiary', loadComponent: () => import('./pages/bestiary/bestiary.page').then(m => m.BestiaryPage) },
      { path: 'config', loadComponent: () => import('./pages/config/config.page').then(m => m.ConfigPage) },
      // New routes for Player features (Assuming components will be generated)
      { path: 'forge-character', loadComponent: () => import('./pages/forge-character/forge-character.page').then(m => m.ForgeCharacterPage) },
      { path: 'homebrew', loadComponent: () => import('./pages/homebrew/homebrew.page').then(m => m.HomebrewPage) },
      { path: 'search-campaigns', loadComponent: () => import('./pages/campaigns/campaigns.page').then(m => m.CampaignsPage) },
      { path: 'my-characters', loadComponent: () => import('./pages/my-characters/my-characters.page').then(m => m.MyCharactersPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ]
  },
  {
    path: 'character-sheet/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/character-sheet/character-sheet.page').then(m => m.CharacterSheetPage)
  },
  { path: '**', redirectTo: 'login' }
];



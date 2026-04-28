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
      { path: 'jugadores', loadComponent: () => import('./pages/jugadores/jugadores.page').then(m => m.JugadoresPage) },
      { path: 'campanyas', loadComponent: () => import('./pages/campanyas/campanyas.page').then(m => m.CampanyasPage) },
      { path: 'bestiario', loadComponent: () => import('./pages/bestiario/bestiario.page').then(m => m.BestiarioPage) },
      { path: 'config', loadComponent: () => import('./pages/config/config.page').then(m => m.ConfigPage) },
      // New routes for Player features (Assuming components will be generated)
      { path: 'forjar-personaje', loadComponent: () => import('./pages/character-sheet/character-sheet.page').then(m => m.CharacterSheetPage) },
      { path: 'homebrew', loadComponent: () => import('./pages/homebrew/homebrew.page').then(m => m.HomebrewPage) },
      { path: 'buscar-campañas', loadComponent: () => import('./pages/campanyas/campanyas.page').then(m => m.CampanyasPage) },
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

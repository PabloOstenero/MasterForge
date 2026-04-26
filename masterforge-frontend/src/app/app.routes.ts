import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '',
    loadComponent: () => import('./layout/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'home', loadComponent: () => import('./pages/inicio/inicio.page').then(m => m.InicioPage) },
      { path: 'jugadores', loadComponent: () => import('./pages/jugadores/jugadores.page').then(m => m.JugadoresPage) },
      { path: 'campanyas', loadComponent: () => import('./pages/campanyas/campanyas.page').then(m => m.CampanyasPage) },
      { path: 'bestiario', loadComponent: () => import('./pages/bestiario/bestiario.page').then(m => m.BestiarioPage) },
      { path: 'config', loadComponent: () => import('./pages/config/config.page').then(m => m.ConfigPage) },
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

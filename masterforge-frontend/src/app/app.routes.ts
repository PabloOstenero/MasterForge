import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'character-sheet/:id',
    loadComponent: () => import('./pages/character-sheet/character-sheet.page').then( m => m.CharacterSheetPage)
  },
];

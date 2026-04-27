import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface MenuItem {
  title: string;
  icon: string;
  sublabel?: string;
  route?: string; // Optional route for navigation
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private _activeRole = new BehaviorSubject<'dm' | 'player'>('dm');
  activeRole$ = this._activeRole.asObservable();

  get activeRole(): 'dm' | 'player' {
    return this._activeRole.value;
  }

  private dmMenu: MenuItem[] = [
    { title: 'Inicio', icon: 'home-outline', route: '/home' },
    { title: 'Jugadores', icon: 'people-outline', route: '/jugadores' },
    { title: 'Campañas', icon: 'map-outline', route: '/campanyas' },
    { title: 'Bestiario IA', icon: 'skull-outline', route: '/bestiario' },
    { title: 'Configuración', icon: 'settings-outline', route: '/config' },
  ];

  private playerMenu: MenuItem[] = [
    { title: 'Inicio', icon: 'home-outline', route: '/home' },
    { title: 'Forjar Personaje', icon: 'person-add-outline', route: '/forjar-personaje' },
    { title: 'Mis Personajes', icon: 'book-outline', route: '/mis-personajes' }, // Assuming a route for this
    { title: 'Homebrew (IA)', icon: 'color-wand-outline', sublabel: 'Clases, Subclases, Razas', route: '/homebrew' },
    { title: 'Gremio de Campañas', icon: 'search-outline', route: '/buscar-campañas' },
    { title: 'Configuración', icon: 'settings-outline', route: '/config' },
  ];

  menuItems$: Observable<MenuItem[]> = this.activeRole$.pipe(
    map(role => role === 'dm' ? this.dmMenu : this.playerMenu)
  );

  toggleRole() {
    const newRole = this._activeRole.value === 'dm' ? 'player' : 'dm';
    this._activeRole.next(newRole);
  }
}

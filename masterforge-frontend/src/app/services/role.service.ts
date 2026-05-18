import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

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
  
  private authService = inject(AuthService);

  get activeRole(): 'dm' | 'player' {
    return this._activeRole.value;
  }

  private dmMenu: MenuItem[] = [
    { title: 'Inicio', icon: 'home-outline', route: '/home' },
    { title: 'Campañas', icon: 'map-outline', route: '/campaigns' },
    { title: 'Contenido Oficial', icon: 'book-outline', route: '/official-content' },
    { title: 'Bestiario', icon: 'skull-outline', route: '/bestiary' },
    { title: 'Homebrew', icon: 'color-wand-outline', sublabel: 'Clases, Subclases, Razas', route: '/homebrew' },
  ];

  private playerMenu: MenuItem[] = [
    { title: 'Inicio', icon: 'home-outline', route: '/home' },
    { title: 'Forjar Personaje', icon: 'person-add-outline', route: '/forge-character' },
    { title: 'Mis Personajes', icon: 'book-outline', route: '/my-characters' },
    { title: 'Mis Campañas', icon: 'list-outline', route: '/my-campaigns' },
    { title: 'Gremio de Campañas', icon: 'search-outline', route: '/search-campaigns' },
    { title: 'Contenido Oficial', icon: 'book-outline', route: '/official-content' },
    { title: 'Homebrew', icon: 'color-wand-outline', sublabel: 'Clases, Subclases, Razas', route: '/homebrew' },
  ];

  menuItems$: Observable<MenuItem[]> = this.activeRole$.pipe(
    map(role => {
      let menu = role === 'dm' ? [...this.dmMenu] : [...this.playerMenu];
      
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER')) {
        menu.push({ title: 'Panel Admin', icon: 'shield-outline', route: '/players' });
      }
      
      return menu;
    })
  );

  toggleRole() {
    const newRole = this._activeRole.value === 'dm' ? 'player' : 'dm';
    this._activeRole.next(newRole);
  }
}

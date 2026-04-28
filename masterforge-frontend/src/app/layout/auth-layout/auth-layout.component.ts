import { Component, inject, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  logOutOutline,
  swapHorizontalOutline,
  homeOutline,
  peopleOutline,
  mapOutline,
  skullOutline,
  personAddOutline,
  bookOutline,
  colorWandOutline,
  searchOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, AsyncPipe, IonButton, IonIcon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private roleService = inject(RoleService);

  constructor() {
    addIcons({
      settingsOutline, logOutOutline, swapHorizontalOutline,
      homeOutline, peopleOutline, mapOutline, skullOutline,
      personAddOutline, bookOutline, colorWandOutline, searchOutline
    });
  }

  menuItems$ = this.roleService.menuItems$;
  activeRole$ = this.roleService.activeRole$;

  isDropdownOpen = false;

  get username(): string {
    return this.authService.getCurrentUser()?.name ?? 'Usuario';
  }

  toggleRole(): void {
    this.roleService.toggleRole();
  }

  openDropdown(): void {
    this.isDropdownOpen = true;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  navigateToSettings(): void {
    this.closeDropdown();
    this.router.navigate(['/config']);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

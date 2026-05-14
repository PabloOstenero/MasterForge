import { Component, inject, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { IonButton, IonIcon, PopoverController } from '@ionic/angular/standalone';
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
  searchOutline,
  listOutline,
  personCircleOutline,
  notificationsOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { PersistentNotificationService } from '../../services/persistent-notification.service';
import { FCMService } from '../../services/fcm.service';
import { NotificationPopoverComponent } from './notification-popover.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, AsyncPipe, IonButton, IonIcon, NotificationPopoverComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private roleService = inject(RoleService);
  private notificationService = inject(PersistentNotificationService);
  private fcmService = inject(FCMService);
  private popoverCtrl = inject(PopoverController);

  constructor() {
    addIcons({
      settingsOutline, logOutOutline, swapHorizontalOutline,
      homeOutline, peopleOutline, mapOutline, skullOutline,
      personAddOutline, bookOutline, colorWandOutline, searchOutline, listOutline,
      personCircleOutline, notificationsOutline
    });

    this.roleService.activeRole$.subscribe(role => {
      // Update menu items based on role if needed
    });

    this.notificationService.updateUnreadCount();
    this.fcmService.initPush();
  }

  menuItems$ = this.roleService.menuItems$;
  activeRole$ = this.roleService.activeRole$;
  unreadCount$ = this.notificationService.unreadCount$;

  isDropdownOpen = false;
  isNotificationsOpen = false;

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

  async toggleNotifications(event: any) {
    const popover = await this.popoverCtrl.create({
      component: NotificationPopoverComponent,
      event: event,
      cssClass: 'notification-popover',
      translucent: true
    });
    return await popover.present();
  }

  navigateToSettings(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.closeDropdown();
    this.router.navigate(['/config']);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }

  logout(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.closeDropdown();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

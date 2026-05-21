import { Component, inject, CUSTOM_ELEMENTS_SCHEMA, HostListener, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
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
  notificationsOutline,
  notifications,
  menuOutline,
  shieldOutline,
  shieldHalfOutline
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { PersistentNotificationService } from '../../services/persistent-notification.service';
import { FCMService } from '../../services/fcm.service';
import { NotificationPopoverComponent } from './notification-popover.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterModule, AsyncPipe, IonIcon, NotificationPopoverComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private roleService = inject(RoleService);
  private notificationService = inject(PersistentNotificationService);
  private fcmService = inject(FCMService);
  private popoverCtrl = inject(PopoverController);

  pageTitle = 'Dashboard';
  pageIcon = 'shield-outline';
  private pollingIntervalId: any = null;

  constructor() {
    addIcons({
      settingsOutline, logOutOutline, swapHorizontalOutline,
      homeOutline, peopleOutline, mapOutline, skullOutline,
      personAddOutline, bookOutline, colorWandOutline, searchOutline, listOutline,
      personCircleOutline, notificationsOutline, notifications, menuOutline, shieldOutline, shieldHalfOutline
    });

    this.roleService.activeRole$.subscribe(role => {
      // Update menu items based on role if needed
    });

    // Auto-close sidebar on navigation (mobile drawer) and update page title
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeSidebar();
        this.updatePageTitle();
      });

    this.updatePageTitle();
    this.notificationService.updateUnreadCount();
    this.fcmService.initPush();

    // Poll for unread notifications count every 10 seconds
    if (typeof window !== 'undefined') {
      this.pollingIntervalId = setInterval(() => {
        this.notificationService.updateUnreadCount();
      }, 10000);
    }
  }

  ngOnDestroy(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }
  }

  private updatePageTitle(): void {
    try {
      const root = this.router?.routerState?.root;
      if (!root) {
        this.pageTitle = 'Dashboard';
        this.pageIcon = 'shield-outline';
        return;
      }
      let route = root;
      while (route.firstChild) {
        route = route.firstChild;
      }
      const dataTitle = route.snapshot?.data?.['pageTitle'];
      const dataIcon = route.snapshot?.data?.['pageIcon'];
      
      this.pageIcon = dataIcon || 'shield-outline';
      
      if (dataTitle === 'home') {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        this.pageTitle = isMobile ? 'Dashboard' : `Dashboard de ${this.username}`;
      } else {
        this.pageTitle = dataTitle || 'Dashboard';
      }
    } catch (e) {
      this.pageTitle = 'Dashboard';
      this.pageIcon = 'shield-outline';
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updatePageTitle();
  }

  menuItems$ = this.roleService.menuItems$;
  activeRole$ = this.roleService.activeRole$;
  unreadCount$ = this.notificationService.unreadCount$;

  isDropdownOpen = false;
  isNotificationsOpen = false;
  isSidebarOpen = false;

  get username(): string {
    return this.authService.getCurrentUser()?.name ?? 'Usuario';
  }

  toggleRole(): void {
    this.roleService.toggleRole();
  }

  // --- Sidebar (mobile drawer) ---
  openSidebar(): void {
    this.isSidebarOpen = true;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // --- User dropdown ---
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
    this.closeSidebar();
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

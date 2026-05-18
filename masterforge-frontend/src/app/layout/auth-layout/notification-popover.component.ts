import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon, IonText } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOffOutline } from 'ionicons/icons';
import { PersistentNotificationService, Notification } from '../../services/persistent-notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notification-popover',
  template: `
    <div class="popover-content">
      <div class="popover-header">
        <h3>Notificaciones</h3>
        <button (click)="markAllAsRead()" class="clear-btn">Marcar todo como leído</button>
      </div>
      
      @if (notifications.length === 0) {
        <div class="empty-state">
          <ion-icon name="notifications-off-outline"></ion-icon>
          <p>No tienes notificaciones</p>
        </div>
      } @else {
        <ion-list lines="full">
          @for (notif of notifications; track notif.id) {
            <ion-item (click)="handleNotifClick(notif)" [class.unread]="!notif.isRead">
              <ion-label>
                <div class="notif-title">
                  <span class="dot" *ngIf="!notif.isRead"></span>
                  {{ notif.title }}
                </div>
                <p>{{ notif.message }}</p>
                <ion-note>{{ notif.createdAt | date:'short' }}</ion-note>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }
    </div>
  `,
  styles: [`
    .popover-content {
      width: 100%;
      max-height: 400px;
      overflow-y: auto;
      background: #1e1e1e;
      color: white;
    }
    .popover-header {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(201, 168, 76, 0.2);
      h3 { margin: 0; font-size: 1rem; color: #c9a84c; }
      .clear-btn { 
        background: none; border: none; color: #8e8e93; 
        font-size: 0.75rem; cursor: pointer;
        &:hover { color: #c9a84c; }
      }
    }
    .empty-state {
      padding: 32px;
      text-align: center;
      color: #8e8e93;
      ion-icon { font-size: 48px; margin-bottom: 8px; }
    }
    ion-item {
      --background: transparent;
      --color: white;
      --padding-start: 16px;
      cursor: pointer;
      &.unread {
        --background: rgba(201, 168, 76, 0.05);
      }
    }
    .notif-title {
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 6px;
      .dot {
        width: 8px;
        height: 8px;
        background-color: #c9a84c;
        border-radius: 50%;
      }
    }
    p { font-size: 0.85rem; color: #8e8e93; margin: 4px 0; }
  `],
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonLabel, IonNote, IonButton, IonIcon, IonText]
})
export class NotificationPopoverComponent implements OnInit {
  private notifService = inject(PersistentNotificationService);
  private router = inject(Router);
  
  notifications: Notification[] = [];

  constructor() {
    addIcons({ notificationsOffOutline });
  }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.notifService.getNotifications().subscribe(notifs => {
      this.notifications = notifs;
    });
  }

  markAllAsRead() {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
    });
  }

  handleNotifClick(notif: Notification) {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.id).subscribe();
    }
    if (notif.link) {
      this.router.navigateByUrl(notif.link);
    }
  }
}

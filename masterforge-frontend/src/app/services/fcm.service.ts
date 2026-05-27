import { Injectable } from '@angular/core';
import { PushNotifications, PermissionStatus, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Platform } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class FCMService {

  constructor(
    private http: HttpClient,
    private platform: Platform
  ) { }

  initPush() {
    if (this.platform.is('capacitor') && environment.enablePushNotifications) {
      this.registerPush();
    } else {
      console.log('Push notifications are disabled in environment configuration or not running on Capacitor.');
    }
  }

  private registerPush() {
    PushNotifications.requestPermissions().then((result: PermissionStatus) => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      this.saveToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push received: ' + JSON.stringify(notification));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });
  }

  private saveToken(token: string) {
    this.http.post(`${environment.apiBaseUrl}/api/users/me/fcm-token`, { token })
      .subscribe({
        next: () => console.log('FCM Token saved to backend'),
        error: (err) => console.error('Error saving FCM Token', err)
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { DiscordService } from '../../services/discord.service';
import { AuthService } from '../../services/auth.service';

/**
 * Page to handle the redirect callback from Discord OAuth2.
 */
@Component({
  selector: 'app-discord-callback',
  template: `
    <ion-content class="ion-padding ion-text-center">
      <div class="callback-container">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
        <p>Vinculando tu cuenta de Discord...</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    p {
      margin-top: 20px;
      font-size: 1.1rem;
      color: var(--ion-color-medium);
      font-family: 'Inter', sans-serif;
    }
  `],
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner]
})
export class DiscordCallbackPage implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private discordService: DiscordService,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Extract parameters from the URL query string
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    
    if (!code || !state) {
      this.handleError('No se recibieron los parámetros de seguridad necesarios de Discord.');
      return;
    }

    // Send the code and state to the backend to complete the linking process
    this.discordService.callback(code, state).subscribe({
      next: () => {
        // Refresh the local user profile to include the new Discord information
        this.authService.getMe().subscribe({
          next: () => this.handleSuccess(),
          error: () => this.handleSuccess() // Proceed to config even if getMe fails
        });
      },
      error: (err) => {
        console.error('Discord linking failed:', err);
        const errorMessage = err?.error?.message || 'Error al vincular la cuenta de Discord.';
        this.handleError(errorMessage);
      }
    });
  }

  private async handleSuccess() {
    const toast = await this.toastCtrl.create({
      message: '¡Cuenta de Discord vinculada con éxito!',
      duration: 3000,
      color: 'success',
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }]
    });
    await toast.present();
    this.router.navigate(['/config'], { replaceUrl: true });
  }

  private async handleError(message: string) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 5000,
      color: 'danger',
      position: 'bottom',
      buttons: [{ text: 'Cerrar', role: 'cancel' }]
    });
    await toast.present();
    this.router.navigate(['/config'], { replaceUrl: true });
  }
}

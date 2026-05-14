import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-mfa-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-title>Verificación 2FA</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding parchment-bg">
      <div class="mfa-container">
        <div class="mfa-icon">
          <ion-icon name="shield-checkmark-outline" color="warning"></ion-icon>
        </div>
        
        <h2>Introduce el código</h2>
        <p>Introduce el código de 6 dígitos de tu app o uno de tus códigos de recuperación de 8 dígitos.</p>

        <div class="form-group">
          <input 
            type="text" 
            [(ngModel)]="code" 
            placeholder="000000" 
            maxlength="8"
            class="dnd-input text-center"
            (keyup.enter)="verify()">
        </div>

        <button 
          class="dnd-button gold" 
          [disabled]="(code.length !== 6 && code.length !== 8) || isLoading"
          (click)="verify()">
          {{ isLoading ? 'Verificando...' : 'Verificar' }}
        </button>

        <button class="dnd-button ghost" (click)="cancel()">
          Cancelar
        </button>
      </div>
    </ion-content>

    <style>
      .parchment-bg {
        --background: #121212;
        color: #F0E6D3;
      }
      .mfa-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        height: 100%;
        gap: 20px;
        font-family: 'Inter', sans-serif;
      }
      .mfa-icon ion-icon {
        font-size: 5rem;
      }
      h2 {
        font-family: 'Outfit', sans-serif;
        color: #C9A84C;
        margin: 0;
      }
      p {
        color: #8C8C8C;
        max-width: 250px;
      }
      .dnd-input {
        background: #252525;
        border: 1px solid #444;
        color: #F0E6D3;
        padding: 15px;
        border-radius: 6px;
        font-size: 1.5rem;
        letter-spacing: 5px;
        width: 100%;
        outline: none;
      }
      .dnd-input:focus {
        border-color: #C9A84C;
      }
      .text-center { text-align: center; }
      .dnd-button {
        width: 100%;
        padding: 14px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        text-transform: uppercase;
      }
      .dnd-button.gold {
        background: #C9A84C;
        color: #121212;
      }
      .dnd-button.ghost {
        background: transparent;
        color: #8C8C8C;
        margin-top: 10px;
      }
      .dnd-button:disabled {
        opacity: 0.5;
      }
    </style>
  `
})
export class MfaModalComponent {
  @Input() mfaToken!: string;
  code = '';
  isLoading = false;

  private modalCtrl = inject(ModalController);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ shieldCheckmarkOutline });
  }

  async verify() {
    this.isLoading = true;
    try {
      const res = await this.authService.verify2fa(this.mfaToken, this.code).toPromise();
      this.modalCtrl.dismiss({ token: res.token });
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Código inválido o expirado',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}

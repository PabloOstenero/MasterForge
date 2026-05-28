import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard, IonCardContent,
  IonInput, IonButton, IonIcon, IonSpinner, ToastController, ModalController
} from '@ionic/angular/standalone';
import { MfaModalComponent } from '../../components/mfa-modal/mfa-modal.component';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, shieldOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard, IonCardContent,
    IonInput, IonButton, IonIcon, IonSpinner
  ]
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;

  @ViewChild('emailInput', { static: false }) emailInput?: IonInput;

  constructor(
    private authService: AuthService, 
    public router: Router,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController
  ) {
    addIcons({ eyeOutline, eyeOffOutline, shieldOutline });
  }

  ionViewWillEnter() {
    this.isLoading = false;
    this.errorMessage = null;
    this.password = '';
  }

  ionViewDidEnter() {
    setTimeout(() => {
      this.emailInput?.setFocus();
    }, 100);
  }

  onSubmit() {
    this.errorMessage = null;

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'El correo y la contraseña son obligatorios.';
      return;
    }

    this.isLoading = true;
    this.authService.login(this.email.trim(), this.password.trim()).subscribe({
      next: async (res) => {
        if (res.requiresMfa) {
          this.isLoading = false;
          await this.handleMfa(res.mfaToken);
          return;
        }

        this.completeLogin(res.token);
      },
      error: async (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'El correo o la contraseña son incorrectos.';
        } else {
          this.errorMessage = err?.error?.message ?? 'Ha ocurrido un error en el servidor.';
        }
        
        const toast = await this.toastCtrl.create({
          message: this.errorMessage || 'Error',
          duration: 3000,
          color: 'danger',
          position: 'bottom',
          buttons: [{ text: 'OK', role: 'cancel' }]
        });
        await toast.present();
      }
    });
  }

  private async handleMfa(mfaToken: string) {
    const modal = await this.modalCtrl.create({
      component: MfaModalComponent,
      componentProps: { mfaToken }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.token) {
      this.completeLogin(data.token);
    }
  }

  private completeLogin(token: string) {
    this.authService.storeToken(token);
    const userId = this.authService.getUserIdFromToken();
    if (userId) {
      this.authService.fetchAndStoreUser(userId).subscribe({
        next: () => this.router.navigate(['/home']),
        error: () => this.router.navigate(['/home'])
      });
    } else {
      this.router.navigate(['/home']);
    }
  }
}

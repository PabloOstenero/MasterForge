import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonInput, IonButton, IonLabel, IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
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
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonInput, IonButton, IonLabel, IonIcon
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
    private toastCtrl: ToastController
  ) {
    addIcons({ eyeOutline, eyeOffOutline });
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
      next: (res) => {
        this.authService.storeToken(res.token);
        const userId = this.authService.getUserIdFromToken();
        if (userId) {
          this.authService.fetchAndStoreUser(userId).subscribe({
            next: () => this.router.navigate(['/home']),
            error: () => this.router.navigate(['/home'])
          });
        } else {
          this.router.navigate(['/home']);
        }
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
}

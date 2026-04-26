import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonInput, IonButton, IonLabel
} from '@ionic/angular/standalone';
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
    IonInput, IonButton, IonLabel
  ]
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage: string | null = null;
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

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
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Credenciales incorrectas. Inténtalo de nuevo.';
        this.isLoading = false;
      }
    });
  }
}

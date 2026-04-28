import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonInput, IonButton, IonLabel, IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonInput, IonButton, IonLabel, IonIcon
  ]
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage: string | null = null;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(private authService: AuthService, private router: Router) {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  onSubmit() {
    this.errorMessage = null;

    if (
      !this.name.trim() ||
      !this.email.trim() ||
      !this.password.trim() ||
      !this.confirmPassword.trim()
    ) {
      this.errorMessage = 'Todos los campos son obligatorios.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isLoading = true;
    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const msg = err?.error?.message ?? '';
        if (err.status === 400 || err.status === 409) {
          this.errorMessage = msg || 'El correo ya está registrado o los datos son inválidos.';
        } else {
          this.errorMessage = msg || 'Error al registrar. Inténtalo de nuevo.';
        }
        this.isLoading = false;
      }
    });
  }
}

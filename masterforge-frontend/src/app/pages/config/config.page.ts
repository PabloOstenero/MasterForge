import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  lockClosedOutline, 
  settingsOutline, 
  notificationsOutline, 
  walletOutline, 
  peopleOutline, 
  skullOutline, 
  logoDiscord,
  eyeOutline,
  eyeOffOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-config',
  templateUrl: './config.page.html',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
})
export class ConfigPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  userForm: FormGroup;
  passwordForm: FormGroup;
  currentUser: any;
  isLoading = true;
  showPassword = false;

  constructor() {
    addIcons({ 
      personOutline, 
      lockClosedOutline, 
      settingsOutline, 
      notificationsOutline, 
      walletOutline, 
      peopleOutline, 
      skullOutline, 
      logoDiscord,
      eyeOutline,
      eyeOffOutline
    });

    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator.bind(this) });
  }

  ngOnInit() {
    this.loadUserData();
  }

  async loadUserData() {
    this.isLoading = true;
    try {
      this.currentUser = await this.authService.getMe().toPromise();
      this.userForm.patchValue({
        name: this.currentUser.name,
        email: this.currentUser.email
      });
    } catch (error) {
      this.showToast('Error al cargar datos de usuario', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  async updatePersonalData() {
    if (this.userForm.invalid) return;

    try {
      const updatedData = {
        name: this.userForm.value.name,
        email: this.userForm.value.email
      };

      await this.authService.updateMe(updatedData).toPromise();
      this.showToast('Datos actualizados correctamente', 'success');
    } catch (error: any) {
      if (error.status === 409) {
        this.showToast('Este correo ya está en uso por otro usuario.', 'danger');
      } else {
        this.showToast('Error al actualizar datos', 'danger');
      }
    }
  }

  async updatePassword() {
    if (this.passwordForm.invalid) return;

    try {
      const updatedData = {
        passwordHash: this.passwordForm.value.newPassword,
        currentPassword: this.passwordForm.value.currentPassword
      };

      await this.authService.updateMe(updatedData).toPromise();
      this.showToast('Contraseña actualizada correctamente', 'success');
      this.passwordForm.reset();
    } catch (error: any) {
      this.showToast('Error al actualizar contraseña', 'danger');
    }
  }

  async confirmDeleteAccount() {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar cuenta?',
      message: 'Esta acción es irreversible. Se perderán todos tus personajes y campañas.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.deleteAccount()
        }
      ]
    });

    await alert.present();
  }

  async deleteAccount() {
    try {
      await this.authService.deleteMe().toPromise();
      this.router.navigate(['/login']);
      this.showToast('Cuenta eliminada correctamente', 'success');
    } catch (error) {
      this.showToast('Error al eliminar la cuenta', 'danger');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
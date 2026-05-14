import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonIcon, 
  IonRange, 
  IonLabel, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonButtons, 
  IonMenuButton,
  IonAvatar,
  IonSpinner,
  AlertController, 
  ToastController 
} from '@ionic/angular/standalone';
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
  eyeOffOutline,
  shieldCheckmarkOutline,
  copyOutline,
  downloadOutline,
  textOutline
} from 'ionicons/icons';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-config',
  templateUrl: './config.page.html',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonIcon, 
    IonRange, 
    IonLabel, 
    IonItem, 
    IonInput, 
    IonButton, 
    IonButtons, 
    IonMenuButton,
    IonAvatar,
    IonSpinner
  ],
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
  
  // 2FA variables
  is2faSetup = false;
  qrCodeDataUrl = '';
  twoFactorSecret = '';
  twoFactorCode = '';
  recoveryCodes: string[] = [];
  showRecoveryCodes = false;
  fontScale = 1;

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
      eyeOffOutline,
      shieldCheckmarkOutline,
      copyOutline,
      downloadOutline,
      textOutline
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
    this.loadFontScale();
  }

  loadFontScale() {
    const savedScale = localStorage.getItem('app-font-scale');
    if (savedScale) {
      this.fontScale = parseFloat(savedScale);
    } else {
      this.fontScale = 1.0;
    }
    this.applyFontScale();
  }

  setFontScale(scale: number) {
    this.fontScale = scale;
    localStorage.setItem('app-font-scale', scale.toString());
    this.applyFontScale();
  }

  private applyFontScale() {
    document.documentElement.style.setProperty('--app-font-scale', this.fontScale.toString());
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

  // 2FA methods
  async start2faSetup() {
    try {
      const setup = await this.authService.setup2fa().toPromise();
      this.twoFactorSecret = setup.secret;
      this.qrCodeDataUrl = await QRCode.toDataURL(setup.qrUri);
      this.is2faSetup = true;
    } catch (error) {
      this.showToast('Error al iniciar configuración 2FA', 'danger');
    }
  }

  async verifyAndEnable2fa() {
    if (!this.twoFactorCode) return;
    try {
      const res = await this.authService.enable2fa(this.twoFactorSecret, this.twoFactorCode).toPromise();
      this.recoveryCodes = res.recoveryCodes;
      this.showRecoveryCodes = true;
      this.showToast('2FA activado correctamente', 'success');
      this.cancel2faSetup();
      await this.loadUserData();
    } catch (error) {
      this.showToast('Código inválido', 'danger');
    }
  }

  closeRecoveryCodes() {
    this.showRecoveryCodes = false;
    this.recoveryCodes = [];
  }

  copyRecoveryCodes() {
    const text = this.recoveryCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Códigos copiados al portapapeles', 'success');
    });
  }

  downloadRecoveryCodes() {
    const text = `MASTERFORGE RECOVERY CODES\nGenerated: ${new Date().toLocaleString()}\n\n${this.recoveryCodes.join('\n')}\n\nKeep these codes safe!`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `masterforge-recovery-codes-${this.currentUser?.name}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async disable2fa() {
    try {
      await this.authService.disable2fa().toPromise();
      this.showToast('2FA desactivado', 'warning');
      await this.loadUserData();
    } catch (error) {
      this.showToast('Error al desactivar 2FA', 'danger');
    }
  }

  cancel2faSetup() {
    this.is2faSetup = false;
    this.qrCodeDataUrl = '';
    this.twoFactorSecret = '';
    this.twoFactorCode = '';
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
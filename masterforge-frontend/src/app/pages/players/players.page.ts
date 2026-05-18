import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonTitle, IonContent, IonSpinner, IonList, IonItem, IonLabel,
  IonAvatar, IonBadge, IonCard, IonCardContent, IonIcon,
  IonSearchbar, IonSegment, IonSegmentButton, IonButton,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline, searchOutline, shieldOutline,
  starOutline, banOutline, checkmarkCircleOutline,
  trashOutline, alertCircleOutline, diamondOutline
} from 'ionicons/icons';
import { ApiService } from '../../services/api';

interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  subscriptionTier: string;
  role: string;
  isActive: boolean;
  balance: number;
}

@Component({
  selector: 'app-players',
  templateUrl: './players.page.html',
  styleUrls: ['./players.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonTitle, IonContent, IonSpinner, IonList, IonItem, IonLabel,
    IonAvatar, IonBadge, IonCard, IonCardContent, IonIcon,
    IonSearchbar, IonSegment, IonSegmentButton, IonButton
  ],
})
export class PlayersPage implements OnInit {

  users: AdminUserDto[] = [];
  filteredUsers: AdminUserDto[] = [];
  
  loading = false;
  error: string | null = null;
  
  searchTerm: string = '';
  filterStatus: 'all' | 'active' | 'banned' | 'pro' = 'all';

  get totalUsers() { return this.users.length; }
  get activeUsers() { return this.users.filter(u => u.isActive).length; }
  get proUsers() { return this.users.filter(u => u.subscriptionTier === 'PRO').length; }

  constructor(
    private api: ApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      peopleOutline, searchOutline, shieldOutline,
      starOutline, banOutline, checkmarkCircleOutline,
      trashOutline, alertCircleOutline, diamondOutline
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;
    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudieron cargar los usuarios.';
        this.loading = false;
      },
    });
  }



  applyFilters() {
    let result = this.users;

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.name && u.name.toLowerCase().includes(term)) || 
        (u.email && u.email.toLowerCase().includes(term))
      );
    }

    if (this.filterStatus === 'active') {
      result = result.filter(u => u.isActive);
    } else if (this.filterStatus === 'banned') {
      result = result.filter(u => !u.isActive);
    } else if (this.filterStatus === 'pro') {
      result = result.filter(u => u.subscriptionTier === 'PRO');
    }

    this.filteredUsers = result;
  }

  async toggleActiveStatus(user: AdminUserDto) {
    const action = user.isActive ? 'Banear' : 'Activar';
    const alert = await this.alertCtrl.create({
      header: `¿${action} usuario?`,
      message: `¿Estás seguro de que deseas ${action.toLowerCase()} a ${user.name}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: action, 
          handler: () => {
            this.api.updateUserAdmin(user.id, { isActive: !user.isActive }).subscribe({
              next: () => {
                user.isActive = !user.isActive;
                this.applyFilters();
                this.showToast(`Usuario ${user.name} ${user.isActive ? 'activado' : 'baneado'} correctamente.`);
              },
              error: () => this.showToast('Error al actualizar el estado.', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async toggleProStatus(user: AdminUserDto) {
    const newTier = user.subscriptionTier === 'PRO' ? 'FREE' : 'PRO';
    const alert = await this.alertCtrl.create({
      header: `Cambiar Suscripción`,
      message: `¿Cambiar a ${user.name} al plan ${newTier}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Confirmar', 
          handler: () => {
            this.api.updateUserAdmin(user.id, { subscriptionTier: newTier }).subscribe({
              next: () => {
                user.subscriptionTier = newTier;
                this.applyFilters();
                this.showToast(`Suscripción de ${user.name} cambiada a ${newTier}.`);
              },
              error: () => this.showToast('Error al cambiar la suscripción.', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async changeRole(user: AdminUserDto) {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar Rol',
      inputs: [
        { label: 'Usuario Regular', type: 'radio', value: 'USER', checked: user.role === 'USER' },
        { label: 'Manager', type: 'radio', value: 'MANAGER', checked: user.role === 'MANAGER' },
        { label: 'Administrador', type: 'radio', value: 'ADMIN', checked: user.role === 'ADMIN' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: (newRole) => {
            if (newRole && newRole !== user.role) {
              this.api.updateUserAdmin(user.id, { role: newRole }).subscribe({
                next: () => {
                  user.role = newRole;
                  this.applyFilters();
                  this.showToast(`Rol de ${user.name} cambiado a ${newRole}.`);
                },
                error: () => this.showToast('Error al cambiar el rol.', 'danger')
              });
            }
          } 
        }
      ]
    });
    await alert.present();
  }

  async deleteUser(user: AdminUserDto) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Usuario',
      subHeader: '¡ACCIÓN IRREVERSIBLE!',
      message: `¿Eliminar definitivamente a ${user.name}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.api.deleteUserAdmin(user.id).subscribe({
              next: () => {
                this.users = this.users.filter(u => u.id !== user.id);
                this.applyFilters();
                this.showToast(`Usuario eliminado correctamente.`);
              },
              error: () => this.showToast('Error al eliminar el usuario.', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  private async showToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}

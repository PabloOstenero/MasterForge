import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonSpinner, IonCard, IonCardContent,
  IonButton, IonText, IonRow, IonCol, IonIcon,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { ApiService, CharacterSummary } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-my-characters',
  templateUrl: './my-characters.page.html',
  styleUrls: ['./my-characters.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonSpinner,
    IonCard, IonCardContent,
    IonButton, IonText, IonRow, IonCol, IonIcon
  ],
})
export class MyCharactersPage implements OnInit {

  characters: CharacterSummary[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ 'trash-outline': trashOutline });
  }

  ngOnInit(): void {
    this.loadCharacters();
  }

  loadCharacters(): void {
    this.loading = true;
    this.error = null;

    const userId = this.authService.getUserIdFromToken();

    if (!userId) {
      this.error = 'No se pudo identificar al usuario. Por favor, inicia sesión.';
      this.loading = false;
      return;
    }

    this.apiService.getCharactersByUser(userId).subscribe({
      next: (data) => {
        this.characters = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Error al cargar tus personajes';
        this.loading = false;
      },
    });
  }

  goToSheet(id: string): void {
    this.router.navigate(['/character-sheet', id]);
  }

  async confirmDelete(char: any) {
    const alert = await this.alertController.create({
      header: '¿Borrar personaje?',
      message: `¿Estás seguro de que quieres borrar a ${char.name}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => this.deleteCharacter(char.id)
        }
      ]
    });
    await alert.present();
  }

  private deleteCharacter(id: string) {
    this.apiService.deleteCharacter(id).subscribe({
      next: () => {
        this.characters = this.characters.filter(c => c.id !== id);
        this.showToast('Personaje borrado con éxito');
      },
      error: () => this.showToast('Error al borrar el personaje')
    });
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

}

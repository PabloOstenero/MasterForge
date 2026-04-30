import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  IonSpinner,
  IonCard, IonCardContent,
  IonButton, IonText, IonRow, IonCol,
} from '@ionic/angular/standalone';
import { ApiService, CharacterSummary } from '../../services/api';
import { AuthService } from '../../services/auth.service';

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
    IonButton, IonText, IonRow, IonCol,
  ],
})
export class MyCharactersPage implements OnInit {

  characters: CharacterSummary[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

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

}

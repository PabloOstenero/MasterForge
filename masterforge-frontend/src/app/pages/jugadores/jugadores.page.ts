import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonList, IonItem, IonLabel,
  IonAvatar, IonBadge, IonCard, IonCardContent,
} from '@ionic/angular/standalone';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-jugadores',
  templateUrl: './jugadores.page.html',
  styleUrls: ['./jugadores.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonList, IonItem, IonLabel,
    IonAvatar, IonBadge, IonCard, IonCardContent,
  ],
})
export class JugadoresPage implements OnInit {

  users: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;
    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message ?? 'Error';
        this.loading = false;
      },
    });
  }

  goToSheet(id: string) {
    this.router.navigate(['/character-sheet', id]);
  }
}

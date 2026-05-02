import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonSpinner, IonList, IonItem, IonLabel,
  IonAvatar, IonBadge, IonCard, IonCardContent, IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline } from 'ionicons/icons';
import { ApiService, CampaignPlayerDto } from '../../services/api';

@Component({
  selector: 'app-players',
  templateUrl: './players.page.html',
  styleUrls: ['./players.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonSpinner, IonList, IonItem, IonLabel,
    IonAvatar, IonBadge, IonCard, IonCardContent, IonIcon,
  ],
})
export class PlayersPage implements OnInit {

  users: CampaignPlayerDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(private router: Router, private api: ApiService) {
    addIcons({ peopleOutline });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;
    this.api.getCampaignPlayers().subscribe({
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

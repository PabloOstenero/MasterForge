import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonList, IonItem, IonAvatar, IonLabel, IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonContent, IonList, IonItem, IonAvatar, IonLabel, IonBadge, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonInput, IonButton, FormsModule],
})
export class HomePage implements OnInit {
  
  users: any[] = []; 

  newUser = {
    name: '',
    email: ''
  };

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.apiService.getUsers().subscribe({
      next: (data) => {
        console.log('¡Datos recibidos del backend!', data);
        this.users = data;
      },
      error: (err) => {
        console.error('Error al conectar con el backend', err);
      } 
    });
  }

  registerUsers() {
    // If any of the fields are empty, show an alert and don't proceed
    if (this.newUser.name === '' || this.newUser.email === '') {
      alert("Por favor, rellena todos los campos");
      return;
    }

    // The backend expects a more complex object, so we need to fill in the rest of the fields behind the scenes. 
    // Since the form is simple, we can do this easily:
    const BackendPackage = {
      name: this.newUser.name,
      email: this.newUser.email,
      passwordHash: "123456_temporal", // In the future, you should implement a proper password handling mechanism
      subscriptionTier: "FREE",
      balance: 0.00,
      isActive: true
    };

    // Call the API to create a new user
    this.apiService.createUser(BackendPackage).subscribe({
      next: (ans) => {
        console.log('¡Usuario creado en la BD!', ans);
        this.loadUsers(); // Reload the list to show the new user
        this.newUser = { name: '', email: '' }; // Clean the form
      },
      error: (err) => {
        console.error('Error al crear', err);
        alert("Hubo un error. ¿A lo mejor ese email ya existe en la base de datos?");
      }
    });
  }

  goToSheet(characterId: string) {
    console.log("Navegando a la ficha del personaje con ID:", characterId);
    this.router.navigate(['/character-sheet', characterId]);
  }
}
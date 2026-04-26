import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-objetos',
  template: `
    <ion-header><ion-toolbar><ion-title>Vademécum de Objetos</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      Catálogo de objetos mágicos y equipo (Inventario Digital).
    </ion-content>
  `,
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ObjetosPage {}

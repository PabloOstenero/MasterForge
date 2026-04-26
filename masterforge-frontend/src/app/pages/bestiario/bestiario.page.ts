import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-bestiario',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Bestiario AI</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">Generador de monstruos y catálogo SRD.</ion-content>
  `,
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class BestiarioPage {}
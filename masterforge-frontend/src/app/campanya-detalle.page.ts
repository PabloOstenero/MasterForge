import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-campanya-detalle',
  template: `
    <ion-header><ion-toolbar><ion-title>Detalle de Campaña</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      Información detallada de la campaña y control de sesiones.
    </ion-content>
  `,
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class CampanyaDetallePage {}
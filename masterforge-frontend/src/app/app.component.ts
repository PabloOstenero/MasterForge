import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    this.applySavedFontScale();
  }

  private applySavedFontScale() {
    // Try to get from mf_user first
    const savedUser = localStorage.getItem('mf_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.fontScale) {
          document.documentElement.style.setProperty('--app-font-scale', user.fontScale.toString());
          return;
        }
      } catch (e) {}
    }

    // Fallback to old localStorage key if present
    const savedScale = localStorage.getItem('app-font-scale');
    if (savedScale) {
      document.documentElement.style.setProperty('--app-font-scale', savedScale);
    }
  }
}

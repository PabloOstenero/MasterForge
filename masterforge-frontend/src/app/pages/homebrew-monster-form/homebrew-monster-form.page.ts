import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonButtons, IonSpinner,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

/** Valid size options for a D&D monster. */
export const MONSTER_SIZES = ['Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

/** The six base ability score fields for a monster. */
export const MONSTER_ABILITY_KEYS = ['str', 'dex', 'con', 'intStat', 'wis', 'cha'] as const;

@Component({
  selector: 'app-homebrew-monster-form',
  templateUrl: './homebrew-monster-form.page.html',
  styleUrls: ['./homebrew-monster-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  ],
})
export class HomebrewMonsterFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Exposed for template iteration. */
  readonly monsterSizes = MONSTER_SIZES;
  readonly abilityKeys = MONSTER_ABILITY_KEYS;

  /** Human-readable labels for each ability score key. */
  readonly abilityLabels: Record<string, string> = {
    str: 'FUE',
    dex: 'DES',
    con: 'CON',
    intStat: 'INT',
    wis: 'SAB',
    cha: 'CAR',
  };

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Build ability score controls — each required and clamped to [1, 30]
    const abilityControls = MONSTER_ABILITY_KEYS.reduce(
      (acc, key) => ({
        ...acc,
        [key]: [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      }),
      {} as Record<string, any>,
    );

    this.form = this.fb.group({
      name:            ['', Validators.required],
      type:            ['', Validators.required],
      size:            ['', Validators.required],
      armorClass:      [null, [Validators.required, Validators.min(1), Validators.max(30)]],
      hitPoints:       [null, [Validators.required, Validators.min(1)]],
      speed:           ['', Validators.required],
      ...abilityControls,
      challengeRating: [null, [Validators.required, Validators.min(0)]],
      xp:              [null, [Validators.required, Validators.min(0)]],
    });
  }

  submit(): void {
    // Mark all controls as touched so validation errors become visible
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.submitting = true;
    this.error = null;

    this.homebrewService.createMonster(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear el monstruo. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

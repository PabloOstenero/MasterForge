import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonButtons, IonSpinner,
  IonItem, IonLabel, IonInput
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

/** The six D&D ability score bonus fields for a Race. */
export const ABILITY_BONUS_KEYS = [
  'bonusStr',
  'bonusDex',
  'bonusCon',
  'bonusInt',
  'bonusWis',
  'bonusCha',
] as const;

@Component({
  selector: 'app-homebrew-race-form',
  templateUrl: './homebrew-race-form.page.html',
  styleUrls: ['./homebrew-race-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput,
  ],
})
export class HomebrewRaceFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Exposed for template iteration over ability score bonus fields. */
  readonly abilityBonusKeys = ABILITY_BONUS_KEYS;

  /** Human-readable labels for each ability score bonus key. */
  readonly abilityBonusLabels: Record<string, string> = {
    bonusStr: 'Bonus FUE',
    bonusDex: 'Bonus DES',
    bonusCon: 'Bonus CON',
    bonusInt: 'Bonus INT',
    bonusWis: 'Bonus SAB',
    bonusCha: 'Bonus CAR',
  };

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Build ability score bonus controls — each is required and clamped to [-10, 10]
    const abilityBonusControls = ABILITY_BONUS_KEYS.reduce(
      (acc, key) => ({
        ...acc,
        [key]: [null, [Validators.required, Validators.min(-10), Validators.max(10)]],
      }),
      {} as Record<string, any>,
    );

    this.form = this.fb.group({
      name:  ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      ...abilityBonusControls,
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

    this.homebrewService.createRace(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear la raza. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

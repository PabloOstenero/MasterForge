import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonButtons, IonSpinner,
  IonItem, IonLabel, IonInput, IonCheckbox,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

/** The six D&D saving throw keys used in the savingThrows FormGroup. */
export const SAVING_THROW_KEYS = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

/**
 * Custom validator for the savingThrows FormGroup.
 * Returns { atLeastOneRequired: true } if no checkbox is checked (all false).
 */
export function atLeastOneTrue(control: AbstractControl): ValidationErrors | null {
  const group = control as FormGroup;
  const hasTrue = Object.values(group.controls).some(c => c.value === true);
  return hasTrue ? null : { atLeastOneRequired: true };
}

@Component({
  selector: 'app-homebrew-class-form',
  templateUrl: './homebrew-class-form.page.html',
  styleUrls: ['./homebrew-class-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput, IonCheckbox,
  ],
})
export class HomebrewClassFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Exposed for template iteration over saving throw checkboxes. */
  readonly savingThrowKeys = SAVING_THROW_KEYS;

  /** Human-readable abbreviations for each saving throw key. */
  readonly savingThrowLabels: Record<string, string> = {
    strength: 'FUE',
    dexterity: 'DES',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'SAB',
    charisma: 'CAR',
  };

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Build the savingThrows nested FormGroup — one boolean control per D&D saving throw
    const savingThrowsGroup = this.fb.group(
      SAVING_THROW_KEYS.reduce((acc, key) => ({ ...acc, [key]: [false] }), {}),
      { validators: atLeastOneTrue },
    );

    this.form = this.fb.group({
      name: ['', Validators.required],
      hitDie: [null, [Validators.required, Validators.min(4), Validators.max(12)]],
      savingThrows: savingThrowsGroup,
      price: [null, [Validators.required, Validators.min(0)]],
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

    this.homebrewService.createClass(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear la clase. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

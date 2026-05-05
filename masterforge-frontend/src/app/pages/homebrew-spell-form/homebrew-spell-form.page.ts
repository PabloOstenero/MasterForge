import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonButtons, IonSpinner,
  IonItem, IonLabel, IonInput, IonTextarea
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

@Component({
  selector: 'app-homebrew-spell-form',
  templateUrl: './homebrew-spell-form.page.html',
  styleUrls: ['./homebrew-spell-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
  ],
})
export class HomebrewSpellFormPage implements OnInit {

  form!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      level:       [null, [Validators.required, Validators.min(0), Validators.max(9)]],
      school:      ['', Validators.required],
      description: ['', Validators.required],
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

    this.homebrewService.createSpell(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear el hechizo. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

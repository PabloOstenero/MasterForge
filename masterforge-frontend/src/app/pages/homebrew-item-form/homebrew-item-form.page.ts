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
  selector: 'app-homebrew-item-form',
  templateUrl: './homebrew-item-form.page.html',
  styleUrls: ['./homebrew-item-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput, IonTextarea,
  ],
})
export class HomebrewItemFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name:       ['', Validators.required],
      type:       ['', Validators.required],
      weight:     [null, [Validators.required, Validators.min(0)]],
      properties: [null],   // optional — defaults to {} on submit (task 68)
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

    const formValue = {
      ...this.form.value,
      properties: this.form.value.properties ?? {},
    };

    this.homebrewService.createItem(formValue).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear el objeto. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

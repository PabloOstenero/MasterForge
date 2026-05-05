import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButton, IonButtons, IonSpinner,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';

import { HomebrewService } from '../../services/homebrew.service';

@Component({
  selector: 'app-homebrew-subclass-form',
  templateUrl: './homebrew-subclass-form.page.html',
  styleUrls: ['./homebrew-subclass-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButton, IonButtons, IonSpinner,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  ],
})
export class HomebrewSubclassFormPage implements OnInit {

  form!: FormGroup;
  submitting = false;
  error: string | null = null;

  /** Available DnD Classes for the parent class selector. */
  availableClasses: { id: number; name: string }[] = [];
  loadingClasses = false;
  classesError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private homebrewService: HomebrewService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      parentClassId: [null, Validators.required],
    });

    this.loadClasses();
  }

  /** Fetches the list of available DnD Classes to populate the parent class selector. */
  loadClasses(): void {
    this.loadingClasses = true;
    this.classesError = null;

    this.homebrewService.getClasses().subscribe({
      next: (classes) => {
        this.availableClasses = classes;
        this.loadingClasses = false;
      },
      error: (err: any) => {
        this.loadingClasses = false;
        this.classesError =
          err?.error?.message ??
          err?.message ??
          'Error al cargar las clases. Por favor, recarga la página.';
      },
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

    this.homebrewService.createSubclass(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/homebrew']);
      },
      error: (err: any) => {
        this.submitting = false;
        this.error =
          err?.error?.message ??
          err?.message ??
          'Error al crear la subclase. Por favor, inténtalo de nuevo.';
        // Form values are retained automatically — no reset needed
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/homebrew']);
  }
}

/**
 * SearchInputComponent — search input with debouncing and clear button.
 *
 * Provides:
 * - Debounced text input (300 ms) for performance (Req 8.2)
 * - Case-insensitive search across name and description (Req 2.2)
 * - Clear button to reset search text (Req 2.4)
 * - Loading indicator while search results are being fetched (Req 8.2)
 * - Emits searchChange events for parent components to react to
 * - Accessible label and ARIA attributes
 *
 * Validates: Requirements 2.1, 2.2, 2.4, 8.2
 */

import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, closeCircleOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

/** Debounce delay in milliseconds. */
const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.component.html',
  styleUrls: ['./search-input.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, IonIcon, IonSpinner],
})
export class SearchInputComponent implements OnInit, OnDestroy {
  /**
   * Placeholder text shown when the input is empty.
   */
  @Input() placeholder = 'Buscar por nombre o descripción...';

  /**
   * When true, shows a loading spinner inside the input.
   * Req 8.2: Loading states and progress indicators.
   */
  @Input() loading = false;

  /**
   * Emits the debounced search text whenever it changes.
   * Emits an empty string when the search is cleared.
   *
   * Validates: Requirements 2.1, 2.4
   */
  @Output() searchChange = new EventEmitter<string>();

  /** The reactive form control for the search text. */
  searchControl = new FormControl('');

  private destroy$ = new Subject<void>();

  constructor() {
    addIcons({ searchOutline, closeCircleOutline });
  }

  ngOnInit(): void {
    // Req 8.2: Debounce input to avoid excessive API calls
    this.searchControl.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((value) => {
        this.searchChange.emit(value ?? '');
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Returns true when the search input has a non-empty value.
   */
  get hasValue(): boolean {
    return (this.searchControl.value ?? '').length > 0;
  }

  /**
   * Clears the search input and emits an empty string.
   * Req 2.4: When search text is empty, return all campaigns.
   */
  clearSearch(): void {
    this.searchControl.setValue('');
    // Emit immediately on clear (don't wait for debounce)
    this.searchChange.emit('');
  }
}

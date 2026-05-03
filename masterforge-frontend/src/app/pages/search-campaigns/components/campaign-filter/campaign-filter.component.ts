/**
 * CampaignFilterComponent — handles campaign filtering UI and logic.
 *
 * Provides:
 * - Price range filter with preset options (free, under $10, $25, $50, custom)
 * - Capacity filter (small 1-4, medium 5-6, large 7+)
 * - Availability filter (available only, full only, all)
 * - Filter reset functionality
 * - Emits filtersChanged event immediately when any filter changes
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6
 */

import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterOutline, closeOutline, chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CampaignFilters,
  PriceRange,
  CapacityFilter,
  AvailabilityFilter,
  PriceRangePreset,
  CapacityFilterType,
  AvailabilityFilterType,
} from '../../models/campaign.models';
import { HelpTooltipComponent } from '../help-tooltip/help-tooltip.component';

// ---------------------------------------------------------------------------
// Option types
// ---------------------------------------------------------------------------

export interface PriceRangeOption {
  label: string;
  value: PriceRangePreset | null;
  range?: PriceRange;
}

export interface CapacityOption {
  label: string;
  value: CapacityFilterType;
  description: string;
}

export interface AvailabilityOption {
  label: string;
  value: AvailabilityFilterType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-campaign-filter',
  templateUrl: './campaign-filter.component.html',
  styleUrls: ['./campaign-filter.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon, HelpTooltipComponent],
})
export class CampaignFilterComponent implements OnInit, OnDestroy {
  /** Emits the current filter state whenever any filter changes. */
  @Output() filtersChanged = new EventEmitter<CampaignFilters>();

  // ── Filter options ─────────────────────────────────────────────────────────

  /** Req 3.1: Price range preset options. */
  priceRangeOptions: PriceRangeOption[] = [
    { label: 'Todos los precios', value: null },
    { label: 'Gratis', value: PriceRangePreset.FREE, range: { preset: PriceRangePreset.FREE, min: 0, max: 0 } },
    { label: 'Menos de $10', value: PriceRangePreset.UNDER_10, range: { preset: PriceRangePreset.UNDER_10, max: 10 } },
    { label: 'Menos de $25', value: PriceRangePreset.UNDER_25, range: { preset: PriceRangePreset.UNDER_25, max: 25 } },
    { label: 'Menos de $50', value: PriceRangePreset.UNDER_50, range: { preset: PriceRangePreset.UNDER_50, max: 50 } },
    { label: 'Rango personalizado', value: PriceRangePreset.CUSTOM, range: { preset: PriceRangePreset.CUSTOM } },
  ];

  /** Req 3.2: Capacity filter options. */
  capacityOptions: CapacityOption[] = [
    { label: 'Cualquier tamaño', value: CapacityFilterType.ANY, description: '' },
    { label: 'Pequeño', value: CapacityFilterType.SMALL, description: '1–4 jugadores' },
    { label: 'Mediano', value: CapacityFilterType.MEDIUM, description: '5–6 jugadores' },
    { label: 'Grande', value: CapacityFilterType.LARGE, description: '7+ jugadores' },
  ];

  /** Req 3.3: Availability filter options. */
  availabilityOptions: AvailabilityOption[] = [
    { label: 'Todas', value: AvailabilityFilterType.ALL },
    { label: 'Con plazas disponibles', value: AvailabilityFilterType.AVAILABLE_ONLY },
    { label: 'Completas', value: AvailabilityFilterType.FULL_ONLY },
  ];

  // ── State ──────────────────────────────────────────────────────────────────

  filterForm: FormGroup;
  isExpanded = false;
  showCustomPriceRange = false;

  private destroy$ = new Subject<void>();

  // ── Constructor ────────────────────────────────────────────────────────────

  constructor(private fb: FormBuilder) {
    addIcons({ filterOutline, closeOutline, chevronDownOutline, chevronUpOutline });

    this.filterForm = this.fb.group({
      pricePreset: [null],
      customPriceMin: [null],
      customPriceMax: [null],
      capacity: [CapacityFilterType.ANY],
      availability: [AvailabilityFilterType.ALL],
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Req 3.5: Update results immediately when filters change
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitFilters());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  /** Req 3.1: Handle price range preset selection. */
  onPriceRangeChange(preset: PriceRangePreset | null): void {
    this.filterForm.patchValue({ pricePreset: preset }, { emitEvent: false });
    this.showCustomPriceRange = preset === PriceRangePreset.CUSTOM;
    if (!this.showCustomPriceRange) {
      this.filterForm.patchValue({ customPriceMin: null, customPriceMax: null }, { emitEvent: false });
    }
    this.emitFilters();
  }

  /** Req 3.2: Handle capacity filter selection. */
  onCapacityChange(capacity: CapacityFilterType): void {
    this.filterForm.patchValue({ capacity }, { emitEvent: false });
    this.emitFilters();
  }

  /** Req 3.3: Handle availability filter selection. */
  onAvailabilityChange(availability: AvailabilityFilterType): void {
    this.filterForm.patchValue({ availability }, { emitEvent: false });
    this.emitFilters();
  }

  /** Resets all filters to their default values. */
  resetFilters(): void {
    this.filterForm.patchValue({
      pricePreset: null,
      customPriceMin: null,
      customPriceMax: null,
      capacity: CapacityFilterType.ANY,
      availability: AvailabilityFilterType.ALL,
    }, { emitEvent: false });
    this.showCustomPriceRange = false;
    this.emitFilters();
  }

  /** Returns true if any filter is active (non-default). */
  get hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return (
      v.pricePreset !== null ||
      v.capacity !== CapacityFilterType.ANY ||
      v.availability !== AvailabilityFilterType.ALL
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Builds and emits the current CampaignFilters from the form state.
   * Req 3.4: Multiple filters combined with AND logic (handled by backend).
   */
  private emitFilters(): void {
    const v = this.filterForm.value;
    const filters: CampaignFilters = {};

    // Price range
    if (v.pricePreset !== null) {
      const option = this.priceRangeOptions.find((o) => o.value === v.pricePreset);
      if (option?.range) {
        if (v.pricePreset === PriceRangePreset.CUSTOM) {
          filters.priceRange = {
            preset: PriceRangePreset.CUSTOM,
            min: v.customPriceMin !== null ? Number(v.customPriceMin) : undefined,
            max: v.customPriceMax !== null ? Number(v.customPriceMax) : undefined,
          };
        } else {
          filters.priceRange = option.range;
        }
      }
    }

    // Capacity filter
    if (v.capacity && v.capacity !== CapacityFilterType.ANY) {
      const capacityFilter: CapacityFilter = { type: v.capacity };
      if (v.capacity === CapacityFilterType.SMALL) {
        capacityFilter.minPlayers = 1;
        capacityFilter.maxPlayers = 4;
      } else if (v.capacity === CapacityFilterType.MEDIUM) {
        capacityFilter.minPlayers = 5;
        capacityFilter.maxPlayers = 6;
      } else if (v.capacity === CapacityFilterType.LARGE) {
        capacityFilter.minPlayers = 7;
      }
      filters.capacityFilter = capacityFilter;
    }

    // Availability filter
    if (v.availability && v.availability !== AvailabilityFilterType.ALL) {
      const availabilityFilter: AvailabilityFilter = { type: v.availability };
      filters.availabilityFilter = availabilityFilter;
    }

    this.filtersChanged.emit(filters);
  }
}

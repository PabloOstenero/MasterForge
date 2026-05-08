import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { IonSpinner } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

import { HomebrewService } from '../../services/homebrew.service';
import {
  StructuredEquipment,
  ItemSummary,
  FixedGrant,
  ChoiceSet,
  EquipmentOption,
  EquipmentItemLine,
} from '../../models/equipment.models';

// ---------------------------------------------------------------------------
// Custom validators
// ---------------------------------------------------------------------------

/** Validates that a FormArray has at least 2 entries. */
export function minOptionsValidator(control: AbstractControl): ValidationErrors | null {
  const arr = control as FormArray;
  return arr.length >= 2 ? null : { minOptions: true };
}

/** Validates that a FormArray has at least 1 entry. */
export function minLinesValidator(control: AbstractControl): ValidationErrors | null {
  const arr = control as FormArray;
  return arr.length >= 1 ? null : { minLines: true };
}

// ---------------------------------------------------------------------------
// Search context type
// ---------------------------------------------------------------------------

export type SearchContext =
  | { type: 'fixed'; index: number }
  | { type: 'option'; setIndex: number; optIndex: number; lineIndex: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-starting-equipment-picker',
  templateUrl: './starting-equipment-picker.component.html',
  styleUrls: ['./starting-equipment-picker.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonSpinner,
  ],
})
export class StartingEquipmentPickerComponent implements OnInit, OnDestroy {

  // ---------------------------------------------------------------------------
  // Inputs / Outputs
  // ---------------------------------------------------------------------------

  @Input() initialValue: StructuredEquipment | null = null;
  @Input() legacyText: string | null = null;

  @Output() equipmentChange = new EventEmitter<StructuredEquipment | null>();
  @Output() validityChange = new EventEmitter<boolean>();

  // ---------------------------------------------------------------------------
  // Dependencies
  // ---------------------------------------------------------------------------

  private fb = inject(FormBuilder);
  private homebrewService = inject(HomebrewService);

  // ---------------------------------------------------------------------------
  // Catalog state
  // ---------------------------------------------------------------------------

  itemCatalog: ItemSummary[] = [];
  catalogLoading = false;
  catalogError = false;

  // ---------------------------------------------------------------------------
  // Search state
  // ---------------------------------------------------------------------------

  searchQuery = '';
  filteredItems: ItemSummary[] = [];
  activeSearchContext: SearchContext | null = null;

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------

  form!: FormGroup;

  private formSub: Subscription | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.form = this.fb.group({
      fixedGrants: this.fb.array([]),
      choiceSets: this.fb.array([]),
    });

    // Restore from initialValue if provided
    if (this.initialValue) {
      this.populateFromValue(this.initialValue);
    }

    // Subscribe to form changes to emit outputs
    this.formSub = this.form.valueChanges.subscribe(() => {
      this.equipmentChange.emit(this.serialize());
      this.validityChange.emit(this.form.valid);
    });

    // Load catalog unless we're in legacy mode
    if (!this.legacyText) {
      this.loadCatalog();
    }
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Catalog loading
  // ---------------------------------------------------------------------------

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = false;

    this.homebrewService.getAllItems().subscribe({
      next: (items) => {
        this.itemCatalog = items;
        this.catalogLoading = false;
        // After catalog loads, re-hydrate any item names that are missing
        // (happens when restoring from serialized data that strips itemName/itemType)
        this.rehydrateItemNames();
      },
      error: () => {
        this.catalogLoading = false;
        this.catalogError = true;
      },
    });
  }

  /** Patches itemName/itemType for any form controls that have an itemId but no itemName. */
  private rehydrateItemNames(): void {
    const lookup = new Map(this.itemCatalog.map(i => [i.id, i]));

    // Fixed grants
    for (let i = 0; i < this.fixedGrants.length; i++) {
      const group = this.fixedGrants.at(i) as FormGroup;
      const itemId = group.get('itemId')?.value;
      const itemName = group.get('itemName')?.value;
      if (itemId && !itemName) {
        const item = lookup.get(itemId);
        if (item) {
          group.patchValue({ itemName: item.name, itemType: item.type }, { emitEvent: false });
        }
      }
    }

    // Choice set option lines
    for (let si = 0; si < this.choiceSets.length; si++) {
      const opts = this.getOptions(si);
      for (let oi = 0; oi < opts.length; oi++) {
        const lines = this.getLines(si, oi);
        for (let li = 0; li < lines.length; li++) {
          const group = lines.at(li) as FormGroup;
          const itemId = group.get('itemId')?.value;
          const itemName = group.get('itemName')?.value;
          if (itemId && !itemName) {
            const item = lookup.get(itemId);
            if (item) {
              group.patchValue({ itemName: item.name, itemType: item.type }, { emitEvent: false });
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Item search
  // ---------------------------------------------------------------------------

  onSearchInput(query: string, context: SearchContext): void {
    this.searchQuery = query;
    this.activeSearchContext = context;

    if (!query.trim()) {
      this.filteredItems = [];
      return;
    }

    const lower = query.toLowerCase();
    this.filteredItems = this.itemCatalog.filter(item =>
      item.name.toLowerCase().includes(lower)
    );
  }

  selectItem(context: SearchContext, item: ItemSummary): void {
    if (context.type === 'fixed') {
      const grant = this.fixedGrants.at(context.index) as FormGroup;
      grant.patchValue({
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
      });
    } else {
      const lines = this.getLines(context.setIndex, context.optIndex);
      const line = lines.at(context.lineIndex) as FormGroup;
      line.patchValue({
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
      });
    }
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredItems = [];
    this.activeSearchContext = null;
  }

  isSearchActiveFor(context: SearchContext): boolean {
    if (!this.activeSearchContext) return false;
    if (this.activeSearchContext.type !== context.type) return false;
    if (context.type === 'fixed' && this.activeSearchContext.type === 'fixed') {
      return this.activeSearchContext.index === context.index;
    }
    if (context.type === 'option' && this.activeSearchContext.type === 'option') {
      return (
        this.activeSearchContext.setIndex === context.setIndex &&
        this.activeSearchContext.optIndex === context.optIndex &&
        this.activeSearchContext.lineIndex === context.lineIndex
      );
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Fixed grants FormArray
  // ---------------------------------------------------------------------------

  get fixedGrants(): FormArray {
    return this.form.get('fixedGrants') as FormArray;
  }

  private buildFixedGrantGroup(
    itemId = '',
    itemName = '',
    itemType = '',
    quantity = 1,
  ): FormGroup {
    return this.fb.group({
      itemId:   [itemId,   Validators.required],
      itemName: [itemName, Validators.required],
      itemType: [itemType],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
    });
  }

  addFixedGrant(): void {
    this.fixedGrants.push(this.buildFixedGrantGroup());
  }

  removeFixedGrant(index: number): void {
    this.fixedGrants.removeAt(index);
  }

  // ---------------------------------------------------------------------------
  // Choice sets FormArray
  // ---------------------------------------------------------------------------

  get choiceSets(): FormArray {
    return this.form.get('choiceSets') as FormArray;
  }

  getChoiceSet(i: number): FormGroup {
    return this.choiceSets.at(i) as FormGroup;
  }

  getOptions(setIndex: number): FormArray {
    return this.getChoiceSet(setIndex).get('options') as FormArray;
  }

  getLines(setIndex: number, optIndex: number): FormArray {
    return (this.getOptions(setIndex).at(optIndex) as FormGroup).get('lines') as FormArray;
  }

  private buildItemLineGroup(
    itemId = '',
    itemName = '',
    itemType = '',
    quantity = 1,
  ): FormGroup {
    return this.fb.group({
      itemId:   [itemId,   Validators.required],
      itemName: [itemName, Validators.required],
      itemType: [itemType],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
    });
  }

  private buildOptionGroup(lines: FormGroup[] = []): FormGroup {
    const linesArray = this.fb.array(
      lines.length > 0 ? lines : [this.buildItemLineGroup()],
      minLinesValidator,
    );
    return this.fb.group({
      lines: linesArray,
    });
  }

  private buildChoiceSetGroup(label = 'Elige uno'): FormGroup {
    const optionsArray = this.fb.array(
      [this.buildOptionGroup(), this.buildOptionGroup()],
      minOptionsValidator,
    );
    return this.fb.group({
      label:   [label, [Validators.required, Validators.maxLength(100)]],
      options: optionsArray,
    });
  }

  addChoiceSet(): void {
    this.choiceSets.push(this.buildChoiceSetGroup());
  }

  removeChoiceSet(index: number): void {
    this.choiceSets.removeAt(index);
  }

  addOption(setIndex: number): void {
    this.getOptions(setIndex).push(this.buildOptionGroup());
  }

  removeOption(setIndex: number, optIndex: number): void {
    this.getOptions(setIndex).removeAt(optIndex);
  }

  addItemLine(setIndex: number, optIndex: number): void {
    this.getLines(setIndex, optIndex).push(this.buildItemLineGroup());
  }

  removeItemLine(setIndex: number, optIndex: number, lineIndex: number): void {
    this.getLines(setIndex, optIndex).removeAt(lineIndex);
  }

  // ---------------------------------------------------------------------------
  // Serialize
  // ---------------------------------------------------------------------------

  serialize(): StructuredEquipment | null {
    if (this.fixedGrants.length === 0 && this.choiceSets.length === 0) {
      return null;
    }

    const fixedGrantsValue: FixedGrant[] = this.fixedGrants.controls.map(ctrl => {
      const g = ctrl.value;
      return {
        itemId:   g.itemId   ?? '',
        itemName: g.itemName ?? '',
        itemType: g.itemType ?? '',
        quantity: g.quantity ?? 1,
      };
    });

    const choiceSetsValue: ChoiceSet[] = this.choiceSets.controls.map(csCtrl => {
      const cs = csCtrl.value;
      const options: EquipmentOption[] = (cs.options ?? []).map((opt: any) => ({
        lines: (opt.lines ?? []).map((l: any): EquipmentItemLine => ({
          itemId:   l.itemId   ?? '',
          itemName: l.itemName ?? '',
          itemType: l.itemType ?? '',
          quantity: l.quantity ?? 1,
        })),
      }));
      return {
        label: cs.label ?? '',
        options,
      };
    });

    return {
      version: 'structured',
      fixedGrants: fixedGrantsValue,
      choiceSets: choiceSetsValue,
    };
  }

  // ---------------------------------------------------------------------------
  // Edit-mode restore
  // ---------------------------------------------------------------------------

  populateFromValue(value: StructuredEquipment): void {
    // Clear existing arrays
    while (this.fixedGrants.length > 0) {
      this.fixedGrants.removeAt(0);
    }
    while (this.choiceSets.length > 0) {
      this.choiceSets.removeAt(0);
    }

    // Restore fixed grants
    for (const grant of value.fixedGrants) {
      this.fixedGrants.push(
        this.buildFixedGrantGroup(grant.itemId, grant.itemName, grant.itemType, grant.quantity)
      );
    }

    // Restore choice sets
    for (const cs of value.choiceSets) {
      const optionGroups = cs.options.map(opt => {
        const lineGroups = opt.lines.map(l =>
          this.buildItemLineGroup(l.itemId, l.itemName, l.itemType, l.quantity)
        );
        return this.buildOptionGroup(lineGroups);
      });

      const optionsArray = this.fb.array(
        optionGroups.length > 0 ? optionGroups : [this.buildOptionGroup(), this.buildOptionGroup()],
        minOptionsValidator,
      );

      const csGroup = this.fb.group({
        label:   [cs.label, [Validators.required, Validators.maxLength(100)]],
        options: optionsArray,
      });

      this.choiceSets.push(csGroup);
    }
  }

  // ---------------------------------------------------------------------------
  // Template helpers
  // ---------------------------------------------------------------------------

  /** Returns the search query for a given context (for binding to input value). */
  getSearchQueryFor(context: SearchContext): string {
    if (!this.isSearchActiveFor(context)) {
      // Return the item name already selected, if any
      if (context.type === 'fixed') {
        return (this.fixedGrants.at(context.index) as FormGroup).get('itemName')?.value ?? '';
      } else {
        return (this.getLines(context.setIndex, context.optIndex).at(context.lineIndex) as FormGroup)
          .get('itemName')?.value ?? '';
      }
    }
    return this.searchQuery;
  }

  /** Returns the selected item name for a fixed grant. */
  getFixedGrantItemName(index: number): string {
    return (this.fixedGrants.at(index) as FormGroup).get('itemName')?.value ?? '';
  }

  /** Returns the selected item type for a fixed grant. */
  getFixedGrantItemType(index: number): string {
    return (this.fixedGrants.at(index) as FormGroup).get('itemType')?.value ?? '';
  }

  /** Returns the selected item name for an option line. */
  getLineItemName(setIndex: number, optIndex: number, lineIndex: number): string {
    return (this.getLines(setIndex, optIndex).at(lineIndex) as FormGroup).get('itemName')?.value ?? '';
  }

  /** Returns the selected item type for an option line. */
  getLineItemType(setIndex: number, optIndex: number, lineIndex: number): string {
    return (this.getLines(setIndex, optIndex).at(lineIndex) as FormGroup).get('itemType')?.value ?? '';
  }

  /** Checks if a fixed grant has an item selected. */
  fixedGrantHasItem(index: number): boolean {
    return !!(this.fixedGrants.at(index) as FormGroup).get('itemId')?.value;
  }

  /** Checks if an option line has an item selected. */
  lineHasItem(setIndex: number, optIndex: number, lineIndex: number): boolean {
    return !!(this.getLines(setIndex, optIndex).at(lineIndex) as FormGroup).get('itemId')?.value;
  }

  /** Returns the FormGroup for a fixed grant. */
  getFixedGrantGroup(index: number): FormGroup {
    return this.fixedGrants.at(index) as FormGroup;
  }

  /** Returns the FormGroup for an option line. */
  getLineGroup(setIndex: number, optIndex: number, lineIndex: number): FormGroup {
    return this.getLines(setIndex, optIndex).at(lineIndex) as FormGroup;
  }

  /** Returns the FormGroup for an option. */
  getOptionGroup(setIndex: number, optIndex: number): FormGroup {
    return this.getOptions(setIndex).at(optIndex) as FormGroup;
  }

  /** Checks if the options FormArray for a choice set has the minOptions error. */
  choiceSetHasMinOptionsError(setIndex: number): boolean {
    const opts = this.getOptions(setIndex);
    return !!(opts.errors?.['minOptions'] && opts.touched);
  }

  /** Checks if the lines FormArray for an option has the minLines error. */
  optionHasMinLinesError(setIndex: number, optIndex: number): boolean {
    const lines = this.getLines(setIndex, optIndex);
    return !!(lines.errors?.['minLines'] && lines.touched);
  }

  /** Marks all controls as touched to trigger validation display. */
  markAllTouched(): void {
    this.form.markAllAsTouched();
  }

  /** Returns indices array for a FormArray (for @for loops). */
  indices(arr: FormArray): number[] {
    return Array.from({ length: arr.length }, (_, i) => i);
  }
}

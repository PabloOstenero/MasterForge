import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { StartingEquipmentPickerComponent } from './starting-equipment-picker.component';
import { HomebrewService } from '../../services/homebrew.service';
import { ItemSummary, StructuredEquipment } from '../../models/equipment.models';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_ITEMS: ItemSummary[] = [
  { id: 'sword', name: 'Longsword', type: 'weapon', weight: 3 },
  { id: 'shield', name: 'Shield', type: 'armor', weight: 6 },
];

function makeStructuredEquipment(
  fixedGrants: StructuredEquipment['fixedGrants'] = [],
  choiceSets: StructuredEquipment['choiceSets'] = [],
): StructuredEquipment {
  return { version: 'structured', fixedGrants, choiceSets };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StartingEquipmentPickerComponent', () => {
  let fixture: ComponentFixture<StartingEquipmentPickerComponent>;
  let component: StartingEquipmentPickerComponent;
  let mockHomebrewService: jasmine.SpyObj<HomebrewService>;
  let itemsSubject: Subject<ItemSummary[]>;

  beforeEach(async () => {
    itemsSubject = new Subject<ItemSummary[]>();
    mockHomebrewService = jasmine.createSpyObj('HomebrewService', ['getAllItems']);
    mockHomebrewService.getAllItems.and.returnValue(itemsSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [StartingEquipmentPickerComponent],
      providers: [
        { provide: HomebrewService, useValue: mockHomebrewService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StartingEquipmentPickerComponent);
    component = fixture.componentInstance;
    // Do NOT call fixture.detectChanges() here — done per test after setting inputs
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // =========================================================================
  // 1. Catalog loading states
  // =========================================================================

  describe('Catalog loading states', () => {

    it('shows loading indicator while getAllItems() is in flight', () => {
      fixture.detectChanges(); // triggers ngOnInit → loadCatalog()

      expect(component.catalogLoading).toBeTrue();
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[data-testid="catalog-loading"]');
      expect(el).not.toBeNull();
    });

    it('hides loading indicator and shows error state when getAllItems() errors', fakeAsync(() => {
      mockHomebrewService.getAllItems.and.returnValue(throwError(() => new Error('Network error')));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(component.catalogLoading).toBeFalse();
      expect(component.catalogError).toBeTrue();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="catalog-error"]');
      expect(errorEl).not.toBeNull();

      const retryBtn = fixture.nativeElement.querySelector('[data-testid="retry-button"]');
      expect(retryBtn).not.toBeNull();
    }));

    it('populates itemCatalog and clears loading/error on success', fakeAsync(() => {
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      expect(component.catalogLoading).toBeFalse();
      expect(component.catalogError).toBeFalse();
      expect(component.itemCatalog).toEqual(MOCK_ITEMS);

      const loadingEl = fixture.nativeElement.querySelector('[data-testid="catalog-loading"]');
      expect(loadingEl).toBeNull();
    }));

    it('clicking retry button calls loadCatalog() again', fakeAsync(() => {
      mockHomebrewService.getAllItems.and.returnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const callsBefore = mockHomebrewService.getAllItems.calls.count();

      // Reset to a successful observable for the retry
      mockHomebrewService.getAllItems.and.returnValue(of(MOCK_ITEMS));

      const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="retry-button"]');
      retryBtn.click();
      tick();
      fixture.detectChanges();

      expect(mockHomebrewService.getAllItems.calls.count()).toBeGreaterThan(callsBefore);
      expect(component.catalogError).toBeFalse();
      expect(component.itemCatalog).toEqual(MOCK_ITEMS);
    }));
  });

  // =========================================================================
  // 2. Fixed grants
  // =========================================================================

  describe('Fixed grants', () => {

    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();
    }));

    it('addFixedGrant() increases fixedGrants.length by 1', () => {
      const before = component.fixedGrants.length;
      component.addFixedGrant();
      expect(component.fixedGrants.length).toBe(before + 1);
    });

    it('new fixed grant has quantity defaulting to 1', () => {
      component.addFixedGrant();
      const last = component.fixedGrants.at(component.fixedGrants.length - 1);
      expect(last.get('quantity')?.value).toBe(1);
    });

    it('removeFixedGrant(0) decreases fixedGrants.length by 1', () => {
      component.addFixedGrant();
      const before = component.fixedGrants.length;
      component.removeFixedGrant(0);
      expect(component.fixedGrants.length).toBe(before - 1);
    });

    it('adding multiple grants and removing one by index works correctly', () => {
      component.addFixedGrant();
      component.addFixedGrant();
      component.addFixedGrant();
      expect(component.fixedGrants.length).toBe(3);

      component.removeFixedGrant(1);
      expect(component.fixedGrants.length).toBe(2);
    });
  });

  // =========================================================================
  // 3. Choice sets and options
  // =========================================================================

  describe('Choice sets and options', () => {

    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();
    }));

    it('addChoiceSet() increases choiceSets.length by 1', () => {
      const before = component.choiceSets.length;
      component.addChoiceSet();
      expect(component.choiceSets.length).toBe(before + 1);
    });

    it('new choice set has label "Elige uno" and 2 default options', () => {
      component.addChoiceSet();
      const cs = component.getChoiceSet(0);
      expect(cs.get('label')?.value).toBe('Elige uno');
      expect(component.getOptions(0).length).toBe(2);
    });

    it('removeChoiceSet(0) decreases choiceSets.length by 1', () => {
      component.addChoiceSet();
      const before = component.choiceSets.length;
      component.removeChoiceSet(0);
      expect(component.choiceSets.length).toBe(before - 1);
    });

    it('addOption(0) increases options count for that choice set', () => {
      component.addChoiceSet();
      const before = component.getOptions(0).length;
      component.addOption(0);
      expect(component.getOptions(0).length).toBe(before + 1);
    });

    it('removeOption(0, 0) decreases options count', () => {
      component.addChoiceSet();
      const before = component.getOptions(0).length;
      component.removeOption(0, 0);
      expect(component.getOptions(0).length).toBe(before - 1);
    });

    it('empty label makes the label control invalid', () => {
      component.addChoiceSet();
      const labelCtrl = component.getChoiceSet(0).get('label')!;
      labelCtrl.setValue('');
      labelCtrl.markAsTouched();
      expect(labelCtrl.invalid).toBeTrue();
      expect(labelCtrl.hasError('required')).toBeTrue();
    });

    it('label longer than 100 chars makes the label control invalid', () => {
      component.addChoiceSet();
      const labelCtrl = component.getChoiceSet(0).get('label')!;
      labelCtrl.setValue('a'.repeat(101));
      labelCtrl.markAsTouched();
      expect(labelCtrl.invalid).toBeTrue();
      expect(labelCtrl.hasError('maxlength')).toBeTrue();
    });

    it('valid label (non-empty, ≤100 chars) is valid', () => {
      component.addChoiceSet();
      const labelCtrl = component.getChoiceSet(0).get('label')!;
      labelCtrl.setValue('Choose a weapon');
      expect(labelCtrl.valid).toBeTrue();
    });

    it('choice set with only 1 option has minOptions error on the options FormArray', () => {
      component.addChoiceSet();
      // Remove one of the two default options
      component.removeOption(0, 0);
      const opts = component.getOptions(0);
      expect(opts.errors?.['minOptions']).toBeTrue();
    });

    it('addItemLine(0, 0) increases lines count for that option', () => {
      component.addChoiceSet();
      const before = component.getLines(0, 0).length;
      component.addItemLine(0, 0);
      expect(component.getLines(0, 0).length).toBe(before + 1);
    });

    it('removeItemLine(0, 0, 0) decreases lines count', () => {
      component.addChoiceSet();
      component.addItemLine(0, 0); // ensure at least 2 lines
      const before = component.getLines(0, 0).length;
      component.removeItemLine(0, 0, 0);
      expect(component.getLines(0, 0).length).toBe(before - 1);
    });
  });

  // =========================================================================
  // 4. serialize()
  // =========================================================================

  describe('serialize()', () => {

    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();
    }));

    it('returns null when both fixedGrants and choiceSets are empty', () => {
      expect(component.serialize()).toBeNull();
    });

    it('returns a StructuredEquipment with version "structured" when a fixed grant is added', () => {
      component.addFixedGrant();
      const result = component.serialize();
      expect(result).not.toBeNull();
      expect(result!.version).toBe('structured');
    });

    it('returns correct fixedGrants array with itemId, itemName, itemType, quantity', () => {
      component.addFixedGrant();
      const grant = component.fixedGrants.at(0);
      grant.patchValue({ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 2 });

      const result = component.serialize();
      expect(result).not.toBeNull();
      expect(result!.fixedGrants.length).toBe(1);
      expect(result!.fixedGrants[0].itemId).toBe('sword');
      expect(result!.fixedGrants[0].itemName).toBe('Longsword');
      expect(result!.fixedGrants[0].itemType).toBe('weapon');
      expect(result!.fixedGrants[0].quantity).toBe(2);
    });

    it('returns correct choiceSets array structure when a choice set is added and populated', () => {
      component.addChoiceSet();
      const cs = component.getChoiceSet(0);
      cs.get('label')!.setValue('Choose a weapon');

      // Populate option 0, line 0
      const line0 = component.getLines(0, 0).at(0);
      line0.patchValue({ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 });

      // Populate option 1, line 0
      const line1 = component.getLines(0, 1).at(0);
      line1.patchValue({ itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 1 });

      const result = component.serialize();
      expect(result).not.toBeNull();
      expect(result!.choiceSets.length).toBe(1);
      expect(result!.choiceSets[0].label).toBe('Choose a weapon');
      expect(result!.choiceSets[0].options.length).toBe(2);
      expect(result!.choiceSets[0].options[0].lines[0].itemId).toBe('sword');
      expect(result!.choiceSets[0].options[1].lines[0].itemId).toBe('shield');
    });
  });

  // =========================================================================
  // 5. Edit-mode restore (initialValue)
  // =========================================================================

  describe('Edit-mode restore (initialValue)', () => {

    it('setting initialValue with 2 fixed grants results in fixedGrants.length === 2', fakeAsync(() => {
      component.initialValue = makeStructuredEquipment([
        { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 },
        { itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 2 },
      ]);
      fixture.detectChanges(); // triggers ngOnInit
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      expect(component.fixedGrants.length).toBe(2);
    }));

    it('restored fixed grant has correct itemId, itemName, itemType, quantity', fakeAsync(() => {
      component.initialValue = makeStructuredEquipment([
        { itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 3 },
      ]);
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      const grant = component.fixedGrants.at(0);
      expect(grant.get('itemId')?.value).toBe('sword');
      expect(grant.get('itemName')?.value).toBe('Longsword');
      expect(grant.get('itemType')?.value).toBe('weapon');
      expect(grant.get('quantity')?.value).toBe(3);
    }));

    it('setting initialValue with 1 choice set (2 options) results in choiceSets.length === 1 and getOptions(0).length === 2', fakeAsync(() => {
      component.initialValue = makeStructuredEquipment([], [
        {
          label: 'Choose a weapon',
          options: [
            { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
            { lines: [{ itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 1 }] },
          ],
        },
      ]);
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      expect(component.choiceSets.length).toBe(1);
      expect(component.getOptions(0).length).toBe(2);
    }));

    it('restored choice set has the correct label', fakeAsync(() => {
      component.initialValue = makeStructuredEquipment([], [
        {
          label: 'Arma de combate',
          options: [
            { lines: [{ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 }] },
            { lines: [{ itemId: 'shield', itemName: 'Shield', itemType: 'armor', quantity: 1 }] },
          ],
        },
      ]);
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      expect(component.getChoiceSet(0).get('label')?.value).toBe('Arma de combate');
    }));
  });

  // =========================================================================
  // 6. Legacy text mode
  // =========================================================================

  describe('Legacy text mode', () => {

    it('when legacyText is set, [data-testid="legacy-equipment"] is in the DOM', () => {
      component.legacyText = 'Longsword, Shield, 5 gold pieces';
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[data-testid="legacy-equipment"]');
      expect(el).not.toBeNull();
    });

    it('when legacyText is set, [data-testid="catalog-loading"] is NOT in the DOM', () => {
      component.legacyText = 'Longsword, Shield';
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[data-testid="catalog-loading"]');
      expect(el).toBeNull();
    });

    it('when legacyText is set, loadCatalog() is NOT called during ngOnInit', () => {
      component.legacyText = 'Longsword, Shield';
      fixture.detectChanges();

      expect(mockHomebrewService.getAllItems).not.toHaveBeenCalled();
    });

    it('when legacyText is null, [data-testid="legacy-equipment"] is NOT in the DOM', fakeAsync(() => {
      component.legacyText = null;
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[data-testid="legacy-equipment"]');
      expect(el).toBeNull();
    }));
  });

  // =========================================================================
  // 7. equipmentChange and validityChange emissions
  // =========================================================================

  describe('equipmentChange and validityChange emissions', () => {

    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      itemsSubject.next(MOCK_ITEMS);
      itemsSubject.complete();
      tick();
      fixture.detectChanges();
    }));

    it('when a fixed grant is added, equipmentChange emits a non-null StructuredEquipment', () => {
      const emitted: (StructuredEquipment | null)[] = [];
      component.equipmentChange.subscribe(v => emitted.push(v));

      component.addFixedGrant();
      // Trigger form valueChanges by patching a value
      component.fixedGrants.at(0).patchValue({ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 });

      expect(emitted.length).toBeGreaterThan(0);
      const last = emitted[emitted.length - 1];
      expect(last).not.toBeNull();
      expect(last!.version).toBe('structured');
    });

    it('when all grants/sets are removed (empty state), equipmentChange emits null', () => {
      component.addFixedGrant();
      component.fixedGrants.at(0).patchValue({ itemId: 'sword', itemName: 'Longsword', itemType: 'weapon', quantity: 1 });

      const emitted: (StructuredEquipment | null)[] = [];
      component.equipmentChange.subscribe(v => emitted.push(v));

      component.removeFixedGrant(0);

      expect(emitted.length).toBeGreaterThan(0);
      expect(emitted[emitted.length - 1]).toBeNull();
    });

    it('validityChange emits false when a fixed grant has an invalid quantity (< 1)', () => {
      const validityValues: boolean[] = [];
      component.validityChange.subscribe(v => validityValues.push(v));

      component.addFixedGrant();
      component.fixedGrants.at(0).patchValue({
        itemId: 'sword',
        itemName: 'Longsword',
        itemType: 'weapon',
        quantity: 0, // invalid: min is 1
      });

      expect(validityValues.length).toBeGreaterThan(0);
      expect(validityValues[validityValues.length - 1]).toBeFalse();
    });

    it('validityChange emits true when the form is valid', () => {
      const validityValues: boolean[] = [];
      component.validityChange.subscribe(v => validityValues.push(v));

      component.addFixedGrant();
      component.fixedGrants.at(0).patchValue({
        itemId: 'sword',
        itemName: 'Longsword',
        itemType: 'weapon',
        quantity: 1,
      });

      expect(validityValues.length).toBeGreaterThan(0);
      expect(validityValues[validityValues.length - 1]).toBeTrue();
    });
  });
});

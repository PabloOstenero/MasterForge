/**
 * Property-Based Tests for HomebrewPage
 *
 * Feature: homebrew-content-creation
 * Property 2: Homebrew items are grouped by content type
 * Property 9: Successful deletion removes the item from the displayed list
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * **Validates: Requirements 2.2, 9.4**
 *
 * Strategy:
 *   Generate arbitrary arrays of HomebrewItem objects with random contentType
 *   values. Build a HomebrewSummary by distributing items into their respective
 *   groups. Set the summary on the component, trigger change detection, and
 *   assert that:
 *     1. Each item appears in exactly one rendered section.
 *     2. The section it appears in matches its contentType.
 *     3. No item leaks into a section of a different contentType.
 *     4. The total number of rendered item rows equals the total number of
 *        items in the summary.
 *     5. Empty sections show an empty-state message; non-empty sections do not.
 *
 * Property 9 Strategy:
 *   Generate arbitrary lists of HomebrewItem objects. Pick a random item to
 *   delete. Mock successful DELETE response. Call deleteItem(). Assert:
 *     1. The deleted item is absent from the component's homebrewItems state.
 *     2. All other items remain in the state.
 *     3. The total count decreases by exactly 1.
 *     4. The deleted item is removed from the correct content-type list.
 *
 * DOM approach:
 *   Each <ion-item> carries [data-testid="item-row"], [data-item-id], and
 *   [data-item-type] attributes (set in the template). These are light-DOM
 *   attributes on the custom element host, so they are queryable without
 *   piercing Ionic's shadow DOM.
 *   Each section block carries [data-testid="section-{TYPE}"].
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import * as fc from 'fast-check';

import { HomebrewPage } from './homebrew.page';
import { HomebrewService, HomebrewItem, HomebrewSummary, ContentType } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

// ---------------------------------------------------------------------------
// Helpers shared across suites (defined at module level to avoid duplication)
// ---------------------------------------------------------------------------

/** Returns the total number of items across all six lists in a HomebrewSummary. */
function totalItems(summary: HomebrewSummary): number {
  return (
    summary.classes.length +
    summary.subclasses.length +
    summary.races.length +
    summary.monsters.length +
    summary.spells.length +
    summary.items.length
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_CONTENT_TYPES: ContentType[] = ['CLASS', 'SUBCLASS', 'RACE', 'MONSTER', 'SPELL', 'ITEM'];

/** Maps each ContentType to the corresponding key in HomebrewSummary. */
const CONTENT_TYPE_TO_KEY: Record<ContentType, keyof HomebrewSummary> = {
  CLASS:    'classes',
  SUBCLASS: 'subclasses',
  RACE:     'races',
  MONSTER:  'monsters',
  SPELL:    'spells',
  ITEM:     'items',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyHomebrew(): HomebrewSummary {
  return { classes: [], subclasses: [], races: [], monsters: [], spells: [], items: [] };
}

/**
 * Distributes a flat array of HomebrewItem objects into a HomebrewSummary,
 * placing each item in the list that matches its contentType.
 */
function buildSummaryFromItems(items: HomebrewItem[]): HomebrewSummary {
  const summary = emptyHomebrew();
  for (const item of items) {
    const key = CONTENT_TYPE_TO_KEY[item.contentType];
    (summary[key] as HomebrewItem[]).push(item);
  }
  return summary;
}

/**
 * Returns all [data-testid="item-row"] elements inside a given section element.
 * Uses querySelectorAll on the section's light DOM (the ion-item host elements
 * carry the attribute directly, so no shadow-DOM piercing is needed).
 */
function getItemRowsInSection(sectionEl: HTMLElement): HTMLElement[] {
  return Array.from(sectionEl.querySelectorAll<HTMLElement>('[data-testid="item-row"]'));
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/** Generates a single HomebrewItem with a random (but valid) contentType. */
const homebrewItemArb: fc.Arbitrary<HomebrewItem> = fc.record<HomebrewItem>({
  id:          fc.uuid(),
  name:        fc.string({ minLength: 1, maxLength: 60 }),
  authorName:  fc.constant('Mío'),
  contentType: fc.constantFrom<ContentType>(...ALL_CONTENT_TYPES),
  price:       fc.constant(0),
  isOwned:     fc.constant(true),
  isAuthor:    fc.constant(true),
});

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

function buildHomebrewServiceSpy(): jasmine.SpyObj<HomebrewService> {
  const spy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
    'getMyHomebrew',
    'getCommunityHomebrew',
    'deleteItem',
  ]);
  spy.getMyHomebrew.and.returnValue(of(emptyHomebrew()));
  spy.getCommunityHomebrew.and.returnValue(of(emptyHomebrew()));
  return spy;
}

// ---------------------------------------------------------------------------
// Property-Based Test Suite
// ---------------------------------------------------------------------------

describe('HomebrewPage — Property 2: Grouping by content type', () => {
  // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type

  let fixture: ComponentFixture<HomebrewPage>;
  let component: HomebrewPage;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;

  async function setup(): Promise<void> {
    homebrewServiceSpy = buildHomebrewServiceSpy();

    const authServiceMock = {
      getUserIdFromToken: () => 'user-pbt',
      getCurrentUser: () => ({ id: 'user-pbt', name: 'PBT User' }),
      isPro: () => false,
    };

    const notificationServiceMock = {
      showError: jasmine.createSpy('showError'),
      showSuccess: jasmine.createSpy('showSuccess'),
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → resolves synchronously via of()
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // P2a — Each item appears in exactly one section
  // -------------------------------------------------------------------------

  it('P2a — each item appears in exactly one section across all content types', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          // Assign unique IDs to avoid accidental cross-section matches
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          // Count how many sections each item's id appears in
          for (const item of uniqueItems) {
            let sectionsContainingItem = 0;

            for (const type of ALL_CONTENT_TYPES) {
              const sectionEl: HTMLElement | null = fixture.nativeElement.querySelector(
                `[data-testid="section-${type}"]`
              );
              if (sectionEl) {
                const rows = getItemRowsInSection(sectionEl);
                const found = rows.some((row) => row.getAttribute('data-item-id') === item.id);
                if (found) sectionsContainingItem++;
              }
            }

            expect(sectionsContainingItem)
              .withContext(`Item id="${item.id}" (${item.contentType}) should appear in exactly 1 section`)
              .toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2b — Each item appears in the section matching its contentType
  // -------------------------------------------------------------------------

  it('P2b — each item is rendered inside the section that matches its contentType', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          for (const item of uniqueItems) {
            const expectedSectionEl: HTMLElement | null = fixture.nativeElement.querySelector(
              `[data-testid="section-${item.contentType}"]`
            );

            expect(expectedSectionEl)
              .withContext(`Section [data-testid="section-${item.contentType}"] should exist`)
              .toBeTruthy();

            if (expectedSectionEl) {
              const rows = getItemRowsInSection(expectedSectionEl);
              const found = rows.some((row) => row.getAttribute('data-item-id') === item.id);
              expect(found)
                .withContext(`Item id="${item.id}" should be rendered in its ${item.contentType} section`)
                .toBeTrue();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2c — Items do not appear in sections of a different contentType
  // -------------------------------------------------------------------------

  it('P2c — no item leaks into a section belonging to a different contentType', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          for (const item of uniqueItems) {
            // Check every OTHER section does NOT contain this item's id
            for (const otherType of ALL_CONTENT_TYPES) {
              if (otherType === item.contentType) continue;

              const otherSectionEl: HTMLElement | null = fixture.nativeElement.querySelector(
                `[data-testid="section-${otherType}"]`
              );
              if (otherSectionEl) {
                const rows = getItemRowsInSection(otherSectionEl);
                const leaked = rows.some((row) => row.getAttribute('data-item-id') === item.id);
                expect(leaked)
                  .withContext(
                    `Item id="${item.id}" (${item.contentType}) must NOT appear in the ${otherType} section`
                  )
                  .toBeFalse();
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2d — Total rendered item count equals total items in the summary
  // -------------------------------------------------------------------------

  it('P2d — total number of rendered item rows equals total items across all groups', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          // Count all [data-testid="item-row"] elements across the entire component
          const allRenderedRows = fixture.nativeElement.querySelectorAll('[data-testid="item-row"]');
          expect(allRenderedRows.length)
            .withContext(`Expected ${uniqueItems.length} rendered item rows but found ${allRenderedRows.length}`)
            .toBe(uniqueItems.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2e — data-item-type attribute on each row matches the item's contentType
  // -------------------------------------------------------------------------

  it('P2e — each rendered item row carries a data-item-type attribute matching its contentType', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          for (const item of uniqueItems) {
            const rowEl: HTMLElement | null = fixture.nativeElement.querySelector(
              `[data-testid="item-row"][data-item-id="${item.id}"]`
            );

            expect(rowEl)
              .withContext(`Row for item id="${item.id}" should exist in the DOM`)
              .toBeTruthy();

            if (rowEl) {
              expect(rowEl.getAttribute('data-item-type'))
                .withContext(`data-item-type on row for id="${item.id}" should be "${item.contentType}"`)
                .toBe(item.contentType);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P2f — Empty sections show empty-state message; non-empty sections do not
  // -------------------------------------------------------------------------

  it('P2f — empty sections show empty-state message; sections with items do not', async () => {
    // Feature: homebrew-content-creation, Property 2: Homebrew items are grouped by content type
    // **Validates: Requirements 2.2, 2.3**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 0, maxLength: 30 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          for (const type of ALL_CONTENT_TYPES) {
            const key = CONTENT_TYPE_TO_KEY[type];
            const groupIsEmpty = (summary[key] as HomebrewItem[]).length === 0;

            const emptyEl = fixture.nativeElement.querySelector(`[data-testid="empty-${type}"]`);

            if (groupIsEmpty) {
              expect(emptyEl)
                .withContext(`Empty-state for ${type} should be visible when the group is empty`)
                .toBeTruthy();
            } else {
              expect(emptyEl)
                .withContext(`Empty-state for ${type} should NOT be visible when the group has items`)
                .toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 9: Successful deletion removes the item from the displayed list
// ===========================================================================

describe('HomebrewPage — Property 9: Deletion removes item from list', () => {
  // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list

  let fixture: ComponentFixture<HomebrewPage>;
  let component: HomebrewPage;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;

  async function setup(): Promise<void> {
    homebrewServiceSpy = buildHomebrewServiceSpy();

    const authServiceMock = {
      getUserIdFromToken: () => 'user-pbt-p9',
      getCurrentUser: () => ({ id: 'user-pbt-p9', name: 'PBT User P9' }),
      isPro: () => false,
    };

    const notificationServiceMock = {
      showError: jasmine.createSpy('showError'),
      showSuccess: jasmine.createSpy('showSuccess'),
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → resolves synchronously via of()
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // P9a — Deleted item is absent from the list after successful DELETE
  // -------------------------------------------------------------------------

  it('P9a — deleted item is absent from the list after successful DELETE', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }), // index to delete (will be modulo array length)
        (items, indexSeed) => {
          // Assign unique IDs
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          // Pick a random item to delete
          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];

          // Mock successful DELETE
          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

          // Call deleteItem
          component.deleteItem(itemToDelete);

          // Assert the deleted item is absent from the component's state
          const key = CONTENT_TYPE_TO_KEY[itemToDelete.contentType];
          const listAfterDelete = component.homebrewItems[key] as HomebrewItem[];
          const found = listAfterDelete.some(i => i.id === itemToDelete.id);

          expect(found)
            .withContext(`Item id="${itemToDelete.id}" (${itemToDelete.contentType}) should be absent after deletion`)
            .toBeFalse();
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P9b — All other items remain in the list after successful DELETE
  // -------------------------------------------------------------------------

  it('P9b — all other items remain in the list after successful DELETE', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 2, maxLength: 20 }), // at least 2 items so we have "others"
        fc.integer({ min: 0 }),
        (items, indexSeed) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9b-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];
          const otherItems = uniqueItems.filter((_, i) => i !== indexToDelete);

          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
          component.deleteItem(itemToDelete);

          // Assert all other items are still present
          for (const otherItem of otherItems) {
            const key = CONTENT_TYPE_TO_KEY[otherItem.contentType];
            const listAfterDelete = component.homebrewItems[key] as HomebrewItem[];
            const found = listAfterDelete.some(i => i.id === otherItem.id);

            expect(found)
              .withContext(`Item id="${otherItem.id}" (${otherItem.contentType}) should remain after deleting a different item`)
              .toBeTrue();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P9c — Total item count decreases by exactly 1 after successful DELETE
  // -------------------------------------------------------------------------

  it('P9c — total item count decreases by exactly 1 after successful DELETE', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (items, indexSeed) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9c-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          const countBefore = totalItems(component.homebrewItems);

          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];

          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
          component.deleteItem(itemToDelete);

          const countAfter = totalItems(component.homebrewItems);

          expect(countAfter)
            .withContext(`Total count should decrease by 1 after deleting item id="${itemToDelete.id}"`)
            .toBe(countBefore - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P9d — Item is removed from the correct content-type list
  // -------------------------------------------------------------------------

  it('P9d — deleted item is removed from the correct content-type list', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (items, indexSeed) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9d-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];
          const key = CONTENT_TYPE_TO_KEY[itemToDelete.contentType];
          const countBeforeInList = (component.homebrewItems[key] as HomebrewItem[]).length;

          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
          component.deleteItem(itemToDelete);

          const countAfterInList = (component.homebrewItems[key] as HomebrewItem[]).length;

          expect(countAfterInList)
            .withContext(`Count in ${itemToDelete.contentType} list should decrease by 1 after deletion`)
            .toBe(countBeforeInList - 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P9e — Other content-type lists remain unchanged after DELETE
  // -------------------------------------------------------------------------

  it('P9e — other content-type lists remain unchanged after DELETE', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (items, indexSeed) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9e-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];
          const deletedKey = CONTENT_TYPE_TO_KEY[itemToDelete.contentType];

          // Capture counts of all OTHER lists before deletion
          const countsBefore: Record<string, number> = {};
          for (const type of ALL_CONTENT_TYPES) {
            const key = CONTENT_TYPE_TO_KEY[type];
            if (key !== deletedKey) {
              countsBefore[key] = (component.homebrewItems[key] as HomebrewItem[]).length;
            }
          }

          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
          component.deleteItem(itemToDelete);

          // Assert all OTHER lists have the same count
          for (const type of ALL_CONTENT_TYPES) {
            const key = CONTENT_TYPE_TO_KEY[type];
            if (key !== deletedKey) {
              const countAfter = (component.homebrewItems[key] as HomebrewItem[]).length;
              expect(countAfter)
                .withContext(`Count in ${type} list should remain unchanged after deleting from ${itemToDelete.contentType}`)
                .toBe(countsBefore[key]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P9f — deletingId is cleared after successful DELETE
  // -------------------------------------------------------------------------

  it('P9f — deletingId is cleared after successful DELETE', async () => {
    // Feature: homebrew-content-creation, Property 9: Successful deletion removes the item from the displayed list
    // **Validates: Requirements 9.4**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0 }),
        (items, indexSeed) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p9f-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;

          const indexToDelete = indexSeed % uniqueItems.length;
          const itemToDelete = uniqueItems[indexToDelete];

          homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
          component.deleteItem(itemToDelete);

          expect(component.deletingId)
            .withContext('deletingId should be null after successful DELETE')
            .toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Property 10: Each displayed homebrew item has a delete action
// ===========================================================================
// Feature: homebrew-content-creation, Property 10: Each displayed homebrew item has a delete action
// **Validates: Requirements 9.1**

describe('HomebrewPage — Property 10: Delete action present for each item', () => {
  // Feature: homebrew-content-creation, Property 10: Each displayed homebrew item has a delete action

  let fixture: ComponentFixture<HomebrewPage>;
  let component: HomebrewPage;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;

  async function setup(): Promise<void> {
    homebrewServiceSpy = buildHomebrewServiceSpy();

    const authServiceMock = {
      getUserIdFromToken: () => 'user-pbt-p10',
      getCurrentUser: () => ({ id: 'user-pbt-p10', name: 'PBT User P10' }),
      isPro: () => false,
    };

    const notificationServiceMock = {
      showError: jasmine.createSpy('showError'),
      showSuccess: jasmine.createSpy('showSuccess'),
    };

    await TestBed.configureTestingModule({
      imports: [HomebrewPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → resolves synchronously via of()
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // P10a — Every rendered item has a [data-testid="delete-action"] element
  // -------------------------------------------------------------------------

  it('P10a — every rendered item has a [data-testid="delete-action"] element', async () => {
    // Feature: homebrew-content-creation, Property 10: Each displayed homebrew item has a delete action
    // **Validates: Requirements 9.1**
    await setup();

    fc.assert(
      fc.property(
        // Generate non-empty lists of HomebrewItem objects (minLength: 1)
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 30 }),
        (items) => {
          // Assign unique IDs to avoid accidental cross-section matches
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p10-${i}-${item.id}` }));

          // Build a HomebrewSummary from the generated items and set it on the component
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          // Count all [data-testid="delete-action"] elements in the DOM
          const deleteActions = fixture.nativeElement.querySelectorAll('[data-testid="delete-action"]');

          // There should be exactly one delete action per item
          expect(deleteActions.length)
            .withContext(
              `Expected ${uniqueItems.length} delete-action elements but found ${deleteActions.length} ` +
              `(items: ${uniqueItems.map(i => `${i.contentType}:${i.id}`).join(', ')})`
            )
            .toBe(uniqueItems.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P10b — Each item row contains its own [data-testid="delete-action"] element
  // -------------------------------------------------------------------------

  it('P10b — each individual item row contains a [data-testid="delete-action"] element', async () => {
    // Feature: homebrew-content-creation, Property 10: Each displayed homebrew item has a delete action
    // **Validates: Requirements 9.1**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p10b-${i}-${item.id}` }));
          component.homebrewItems = buildSummaryFromItems(uniqueItems);
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          // For each item, find its row by data-item-id and verify it contains a delete-action
          for (const item of uniqueItems) {
            const rowEl: HTMLElement | null = fixture.nativeElement.querySelector(
              `[data-testid="item-row"][data-item-id="${item.id}"]`
            );

            expect(rowEl)
              .withContext(`Row for item id="${item.id}" (${item.contentType}) should exist in the DOM`)
              .toBeTruthy();

            if (rowEl) {
              const deleteAction = rowEl.querySelector('[data-testid="delete-action"]');
              expect(deleteAction)
                .withContext(
                  `Item id="${item.id}" (${item.contentType}) should have a [data-testid="delete-action"] element`
                )
                .toBeTruthy();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P10c — Delete action count equals total item count across all content types
  // -------------------------------------------------------------------------

  it('P10c — delete action count equals total item count across all content types', async () => {
    // Feature: homebrew-content-creation, Property 10: Each displayed homebrew item has a delete action
    // **Validates: Requirements 9.1**
    await setup();

    fc.assert(
      fc.property(
        fc.array(homebrewItemArb, { minLength: 1, maxLength: 30 }),
        (items) => {
          const uniqueItems = items.map((item, i) => ({ ...item, id: `pbt-p10c-${i}-${item.id}` }));
          const summary = buildSummaryFromItems(uniqueItems);
          component.homebrewItems = summary;
          component.loading = false;
          component.error = null;
          fixture.detectChanges();

          const totalItemCount = totalItems(summary);
          const deleteActionCount = fixture.nativeElement.querySelectorAll('[data-testid="delete-action"]').length;

          expect(deleteActionCount)
            .withContext(
              `Delete action count (${deleteActionCount}) should equal total item count (${totalItemCount})`
            )
            .toBe(totalItemCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

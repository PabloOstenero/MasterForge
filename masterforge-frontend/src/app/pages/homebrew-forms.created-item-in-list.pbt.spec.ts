/**
 * Property-Based Tests for All Homebrew Creation Forms — Property 5
 *
 * Feature: homebrew-content-creation
 * Property 5: Created item appears in the user's homebrew list
 * Testing framework: fast-check (property-based) + Jasmine
 *
 * **Validates: Requirements 3.4, 4.5, 5.4, 6.4, 7.4, 10.4**
 *
 * Strategy:
 *   For each content type (CLASS, SUBCLASS, RACE, MONSTER, SPELL, ITEM):
 *     1. Generate arbitrary valid form data using fast-check arbitraries.
 *     2. Derive a new HomebrewItem from the generated data (simulating the
 *        backend's POST response returning the created item).
 *     3. Mock HomebrewService.getMyHomebrew() to return a HomebrewSummary
 *        that includes the newly created item in the appropriate list.
 *     4. Trigger HomebrewPage.loadMyHomebrew() (as ngOnInit does after
 *        navigating back from the creation form).
 *     5. Assert the dashboard's homebrewItems state contains the new item
 *        in the correct content-type list.
 *
 * This models the full round-trip described in the design:
 *   - User submits a creation form → POST succeeds → navigate to /homebrew
 *   - HomebrewPage.ngOnInit() calls loadMyHomebrew()
 *   - getMyHomebrew() returns the updated list including the new item
 *   - The dashboard reflects the newly created item
 *
 * Each test runs a minimum of 100 iterations with randomly generated data.
 */

// Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import * as fc from 'fast-check';

import { HomebrewPage } from './homebrew/homebrew.page';
import {
  HomebrewService,
  HomebrewItem,
  HomebrewSummary,
  ContentType,
} from '../services/homebrew.service';
import { AuthService } from '../services/auth.service';

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
 * Builds a HomebrewSummary that contains the given item in the list
 * corresponding to its contentType, plus any pre-existing items.
 */
function summaryWithItem(
  newItem: HomebrewItem,
  existing: HomebrewSummary = emptyHomebrew()
): HomebrewSummary {
  const key = CONTENT_TYPE_TO_KEY[newItem.contentType];
  return {
    ...existing,
    [key]: [...(existing[key] as HomebrewItem[]), newItem],
  };
}

// ---------------------------------------------------------------------------
// fast-check arbitraries
// ---------------------------------------------------------------------------

/** Non-empty string arbitrary (printable, trimmed, at least 1 char) */
const nonEmptyString = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary for a valid CLASS creation form data */
const classFormArb = fc.record({
  name: nonEmptyString,
  hitDie: fc.integer({ min: 4, max: 12 }),
  savingThrows: fc.record({
    strength: fc.boolean(),
    dexterity: fc.boolean(),
    constitution: fc.boolean(),
    intelligence: fc.boolean(),
    wisdom: fc.boolean(),
    charisma: fc.boolean(),
  }),
  price: fc.float({ min: 0, max: 1000, noNaN: true }),
});

/** Arbitrary for a valid SUBCLASS creation form data */
const subclassFormArb = fc.record({
  name: nonEmptyString,
  description: nonEmptyString,
  parentClassId: fc.integer({ min: 1, max: 1000 }),
  subclassFeatures: fc.constant({
    weaponProficiencies: [],
    armorProficiencies: [],
    toolProficiencies: [],
    damageResistances: [],
    damageImmunities: [],
    conditionImmunities: [],
    skillProficiencies: { fixed: [], choicePool: [], choiceCount: 0 },
    subclassFeatureEntries: [],
    expandedSpellList: [],
    resourcePools: [],
  }),
});

/** Arbitrary for a valid RACE creation form data */
const raceFormArb = fc.record({
  name: nonEmptyString,
  price: fc.float({ min: 0, max: 1000, noNaN: true }),
  bonusStr: fc.integer({ min: -10, max: 10 }),
  bonusDex: fc.integer({ min: -10, max: 10 }),
  bonusCon: fc.integer({ min: -10, max: 10 }),
  bonusInt: fc.integer({ min: -10, max: 10 }),
  bonusWis: fc.integer({ min: -10, max: 10 }),
  bonusCha: fc.integer({ min: -10, max: 10 }),
});

/** Arbitrary for a valid MONSTER creation form data */
const monsterFormArb = fc.record({
  name: nonEmptyString,
  type: nonEmptyString,
  size: fc.constantFrom('Small', 'Medium', 'Large', 'Huge', 'Gargantuan'),
  armorClass: fc.integer({ min: 1, max: 30 }),
  hitPoints: fc.integer({ min: 1, max: 1000 }),
  speed: nonEmptyString,
  str: fc.integer({ min: 1, max: 30 }),
  dex: fc.integer({ min: 1, max: 30 }),
  con: fc.integer({ min: 1, max: 30 }),
  intStat: fc.integer({ min: 1, max: 30 }),
  wis: fc.integer({ min: 1, max: 30 }),
  cha: fc.integer({ min: 1, max: 30 }),
  challengeRating: fc.float({ min: 0, max: 30, noNaN: true }),
  xp: fc.integer({ min: 0, max: 1000000 }),
});

/** Arbitrary for a valid SPELL creation form data */
const spellFormArb = fc.record({
  name: nonEmptyString,
  level: fc.integer({ min: 0, max: 9 }),
  school: nonEmptyString,
  description: nonEmptyString,
});

/** Arbitrary for a valid ITEM creation form data */
const itemFormArb = fc.record({
  name: nonEmptyString,
  type: nonEmptyString,
  weight: fc.float({ min: 0, max: 1000, noNaN: true }),
  properties: fc.option(
    fc.dictionary(nonEmptyString, fc.string()),
    { nil: undefined }
  ),
});

/**
 * Generates a HomebrewItem that would be returned by the backend after
 * successfully creating a content item of the given type.
 * The id is a UUID, and the name comes from the form data.
 */
function newItemArb(contentType: ContentType, name: string): HomebrewItem {
  return {
    id: `pbt-p5-${contentType.toLowerCase()}-${Math.random().toString(36).slice(2)}`,
    name,
    contentType,
  };
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

function buildHomebrewServiceSpy(): jasmine.SpyObj<HomebrewService> {
  const spy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
    'getMyHomebrew',
    'createClass',
    'createSubclass',
    'createRace',
    'createMonster',
    'createSpell',
    'createItem',
    'deleteItem',
  ]);
  spy.getMyHomebrew.and.returnValue(of(emptyHomebrew()));
  return spy;
}

const authServiceMock = {
  getUserIdFromToken: () => 'user-pbt-p5',
  getCurrentUser: () => ({ id: 'user-pbt-p5', name: 'PBT User P5' }),
};

// ---------------------------------------------------------------------------
// Property 5 Test Suite
// ---------------------------------------------------------------------------

describe('Homebrew Creation Forms — Property 5: Created item appears in the user\'s homebrew list', () => {
  // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
  // **Validates: Requirements 3.4, 4.5, 5.4, 6.4, 7.4, 10.4**

  let fixture: ComponentFixture<HomebrewPage>;
  let component: HomebrewPage;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;

  async function setup(): Promise<void> {
    homebrewServiceSpy = buildHomebrewServiceSpy();

    await TestBed.configureTestingModule({
      imports: [HomebrewPage],
      providers: [
        { provide: HomebrewService, useValue: homebrewServiceSpy },
        { provide: AuthService, useValue: authServiceMock },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomebrewPage);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit → resolves synchronously via of()
  }

  afterEach(() => TestBed.resetTestingModule());

  // -------------------------------------------------------------------------
  // P5a — CLASS: created item appears in the classes list after reload
  // -------------------------------------------------------------------------

  it('P5a — CLASS: newly created class appears in the dashboard classes list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 3.4**
    await setup();

    fc.assert(
      fc.property(classFormArb, (formData) => {
        // Simulate the backend returning the newly created item
        const createdItem: HomebrewItem = newItemArb('CLASS', formData.name);

        // Mock POST response (createClass returns the new item)
        homebrewServiceSpy.createClass.and.returnValue(of(createdItem));

        // Mock the subsequent GET /api/homebrew/my to include the new item
        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        // Simulate the reload that happens when HomebrewPage.ngOnInit() is called
        // after navigating back from the creation form
        component.loadMyHomebrew();

        // Assert the new item is present in the classes list
        const found = component.homebrewItems.classes.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `CLASS item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.classes after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5b — SUBCLASS: created item appears in the subclasses list after reload
  // -------------------------------------------------------------------------

  it('P5b — SUBCLASS: newly created subclass appears in the dashboard subclasses list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 4.5**
    await setup();

    fc.assert(
      fc.property(subclassFormArb, (formData) => {
        const createdItem: HomebrewItem = newItemArb('SUBCLASS', formData.name);

        homebrewServiceSpy.createSubclass.and.returnValue(of(createdItem));

        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        const found = component.homebrewItems.subclasses.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `SUBCLASS item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.subclasses after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5c — RACE: created item appears in the races list after reload
  // -------------------------------------------------------------------------

  it('P5c — RACE: newly created race appears in the dashboard races list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 5.4**
    await setup();

    fc.assert(
      fc.property(raceFormArb, (formData) => {
        const createdItem: HomebrewItem = newItemArb('RACE', formData.name);

        homebrewServiceSpy.createRace.and.returnValue(of(createdItem));

        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        const found = component.homebrewItems.races.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `RACE item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.races after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5d — MONSTER: created item appears in the monsters list after reload
  // -------------------------------------------------------------------------

  it('P5d — MONSTER: newly created monster appears in the dashboard monsters list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 6.4**
    await setup();

    fc.assert(
      fc.property(monsterFormArb, (formData) => {
        const createdItem: HomebrewItem = newItemArb('MONSTER', formData.name);

        homebrewServiceSpy.createMonster.and.returnValue(of(createdItem));

        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        const found = component.homebrewItems.monsters.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `MONSTER item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.monsters after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5e — SPELL: created item appears in the spells list after reload
  // -------------------------------------------------------------------------

  it('P5e — SPELL: newly created spell appears in the dashboard spells list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 7.4**
    await setup();

    fc.assert(
      fc.property(spellFormArb, (formData) => {
        const createdItem: HomebrewItem = newItemArb('SPELL', formData.name);

        homebrewServiceSpy.createSpell.and.returnValue(of(createdItem));

        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        const found = component.homebrewItems.spells.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `SPELL item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.spells after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5f — ITEM: created item appears in the items list after reload
  // -------------------------------------------------------------------------

  it('P5f — ITEM: newly created item appears in the dashboard items list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 10.4**
    await setup();

    fc.assert(
      fc.property(itemFormArb, (formData) => {
        const createdItem: HomebrewItem = newItemArb('ITEM', formData.name);

        homebrewServiceSpy.createItem.and.returnValue(of(createdItem));

        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        const found = component.homebrewItems.items.some((i) => i.id === createdItem.id);
        expect(found)
          .withContext(
            `ITEM item id="${createdItem.id}" name="${createdItem.name}" should appear in ` +
            `homebrewItems.items after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5g — All types: created item appears in the correct list (parametric)
  // -------------------------------------------------------------------------

  it('P5g — any content type: created item appears in the correct content-type list after reload', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 3.4, 4.5, 5.4, 6.4, 7.4, 10.4**
    await setup();

    const homebrewItemArb = fc.record<HomebrewItem>({
      id: fc.uuid(),
      name: nonEmptyString,
      contentType: fc.constantFrom<ContentType>(...ALL_CONTENT_TYPES),
    });

    fc.assert(
      fc.property(homebrewItemArb, (createdItem) => {
        // Mock the subsequent GET /api/homebrew/my to include the new item
        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        // Simulate the reload triggered by ngOnInit after navigating back
        component.loadMyHomebrew();

        // Assert the item is in the correct content-type list
        const key = CONTENT_TYPE_TO_KEY[createdItem.contentType];
        const list = component.homebrewItems[key] as HomebrewItem[];
        const found = list.some((i) => i.id === createdItem.id);

        expect(found)
          .withContext(
            `Item id="${createdItem.id}" (${createdItem.contentType}) should appear in ` +
            `homebrewItems.${key} after reload`
          )
          .toBeTrue();
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5h — New item does not appear in other content-type lists
  // -------------------------------------------------------------------------

  it('P5h — created item does not appear in lists of other content types', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 3.4, 4.5, 5.4, 6.4, 7.4, 10.4**
    await setup();

    const homebrewItemArb = fc.record<HomebrewItem>({
      id: fc.uuid(),
      name: nonEmptyString,
      contentType: fc.constantFrom<ContentType>(...ALL_CONTENT_TYPES),
    });

    fc.assert(
      fc.property(homebrewItemArb, (createdItem) => {
        const updatedSummary = summaryWithItem(createdItem);
        homebrewServiceSpy.getMyHomebrew.and.returnValue(of(updatedSummary));

        component.loadMyHomebrew();

        // Assert the item does NOT appear in any other content-type list
        for (const type of ALL_CONTENT_TYPES) {
          if (type === createdItem.contentType) continue;

          const key = CONTENT_TYPE_TO_KEY[type];
          const list = component.homebrewItems[key] as HomebrewItem[];
          const leaked = list.some((i) => i.id === createdItem.id);

          expect(leaked)
            .withContext(
              `Item id="${createdItem.id}" (${createdItem.contentType}) must NOT appear in ` +
              `homebrewItems.${key} (${type} list)`
            )
            .toBeFalse();
        }
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // P5i — Pre-existing items are preserved after reload with new item
  // -------------------------------------------------------------------------

  it('P5i — pre-existing items remain in the list after a new item is added', async () => {
    // Feature: homebrew-content-creation, Property 5: Created item appears in the user's homebrew list
    // **Validates: Requirements 3.4, 4.5, 5.4, 6.4, 7.4, 10.4**
    await setup();

    const existingItemArb = fc.record<HomebrewItem>({
      id: fc.uuid(),
      name: nonEmptyString,
      contentType: fc.constantFrom<ContentType>(...ALL_CONTENT_TYPES),
    });

    const newItemArbLocal = fc.record<HomebrewItem>({
      id: fc.uuid(),
      name: nonEmptyString,
      contentType: fc.constantFrom<ContentType>(...ALL_CONTENT_TYPES),
    });

    fc.assert(
      fc.property(
        fc.array(existingItemArb, { minLength: 1, maxLength: 10 }),
        newItemArbLocal,
        fc.integer({ min: 0 }), // seed for unique IDs
        (existingItems, newItem, seed) => {
          // Ensure unique IDs between existing and new items
          const uniqueExisting = existingItems.map((item, i) => ({
            ...item,
            id: `existing-${seed}-${i}-${item.id}`,
          }));
          const uniqueNew: HomebrewItem = {
            ...newItem,
            id: `new-${seed}-${newItem.id}`,
          };

          // Build a summary with both existing items and the new item
          let summary = emptyHomebrew();
          for (const item of uniqueExisting) {
            const key = CONTENT_TYPE_TO_KEY[item.contentType];
            (summary[key] as HomebrewItem[]).push(item);
          }
          summary = summaryWithItem(uniqueNew, summary);

          homebrewServiceSpy.getMyHomebrew.and.returnValue(of(summary));
          component.loadMyHomebrew();

          // Assert all pre-existing items are still present
          for (const existingItem of uniqueExisting) {
            const key = CONTENT_TYPE_TO_KEY[existingItem.contentType];
            const list = component.homebrewItems[key] as HomebrewItem[];
            const found = list.some((i) => i.id === existingItem.id);

            expect(found)
              .withContext(
                `Pre-existing item id="${existingItem.id}" (${existingItem.contentType}) should ` +
                `remain in homebrewItems.${key} after adding a new item`
              )
              .toBeTrue();
          }

          // Also assert the new item is present
          const newKey = CONTENT_TYPE_TO_KEY[uniqueNew.contentType];
          const newList = component.homebrewItems[newKey] as HomebrewItem[];
          const newFound = newList.some((i) => i.id === uniqueNew.id);
          expect(newFound)
            .withContext(
              `New item id="${uniqueNew.id}" (${uniqueNew.contentType}) should appear in ` +
              `homebrewItems.${newKey} after reload`
            )
            .toBeTrue();
        }
      ),
      { numRuns: 100 }
    );
  });
});

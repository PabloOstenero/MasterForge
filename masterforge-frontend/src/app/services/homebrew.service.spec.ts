/**
 * Unit tests for HomebrewService HTTP methods.
 *
 * Verifies correct HTTP method, URL, and request body for each operation.
 * Verifies authorId is always included from AuthService.getUserIdFromToken()
 * in all create methods.
 *
 * Validates: Requirements 3.3, 4.4, 5.3, 6.3, 7.3, 10.3, 9.3
 */

import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import * as fc from 'fast-check';

import { HomebrewService, ContentType } from './homebrew.service';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const mockUserId = 'test-user-uuid-1234';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCreateClassDto() {
  return {
    name: 'Artificer',
    hitDie: 8,
    savingThrows: { constitution: true, intelligence: true },
    price: 0,
  };
}

function makeCreateSubclassDto() {
  return {
    name: 'Battle Smith',
    description: 'A subclass focused on combat and constructs.',
    parentClassId: 1,
  };
}

function makeCreateRaceDto() {
  return {
    name: 'Warforged',
    price: 0,
    bonusStr: 0,
    bonusDex: 0,
    bonusCon: 2,
    bonusInt: 0,
    bonusWis: 0,
    bonusCha: 0,
  };
}

function makeCreateMonsterDto() {
  return {
    name: 'Goblin',
    type: 'Humanoid',
    size: 'Small',
    armorClass: 15,
    hitPoints: 7,
    speed: '30 ft.',
    str: 8,
    dex: 14,
    con: 10,
    intStat: 10,
    wis: 8,
    cha: 8,
    challengeRating: 0.25,
    xp: 50,
  };
}

function makeCreateSpellDto() {
  return {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    description: 'A bright streak flashes from your pointing finger.',
  };
}

function makeCreateItemDto() {
  return {
    name: 'Sword of Flames',
    type: 'Weapon',
    weight: 3,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewService', () => {
  let service: HomebrewService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserIdFromToken',
    ]);
    authServiceSpy.getUserIdFromToken.and.returnValue(mockUserId);

    TestBed.configureTestingModule({
      providers: [
        HomebrewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(HomebrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // getMyHomebrew()
  // -------------------------------------------------------------------------

  describe('getMyHomebrew()', () => {
    it('should send GET to /api/homebrew/my', () => {
      const mockResponse = {
        classes: [],
        subclasses: [],
        races: [],
        monsters: [],
        spells: [],
        items: [],
      };

      service.getMyHomebrew().subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/homebrew/my');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // -------------------------------------------------------------------------
  // createClass()
  // -------------------------------------------------------------------------

  describe('createClass()', () => {
    it('should send POST to /api/dnd-classes', () => {
      const dto = makeCreateClassDto();

      service.createClass({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-classes');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateClassDto();

      service.createClass({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-classes');
      const body = req.request.body;
      expect(body.name).toBe('Artificer');
      expect(body.hitDie).toBe(8);
      expect(body.savingThrows).toEqual({ constitution: true, intelligence: true });
      expect(body.price).toBe(0);
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateClassDto();

      service.createClass({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/dnd-classes');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });

    it('should call AuthService.getUserIdFromToken() to obtain the authorId', () => {
      const dto = makeCreateClassDto();

      service.createClass({ ...dto, authorId: mockUserId }).subscribe();

      httpMock.expectOne('/api/dnd-classes').flush({});
      expect(authServiceSpy.getUserIdFromToken).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // createSubclass()
  // -------------------------------------------------------------------------

  describe('createSubclass()', () => {
    it('should send POST to /api/dnd-subclasses', () => {
      const dto = makeCreateSubclassDto();

      service.createSubclass({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-subclasses');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateSubclassDto();

      service.createSubclass({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-subclasses');
      const body = req.request.body;
      expect(body.name).toBe('Battle Smith');
      expect(body.description).toBe('A subclass focused on combat and constructs.');
      expect(body.parentClassId).toBe(1);
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateSubclassDto();

      service.createSubclass({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/dnd-subclasses');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // createRace()
  // -------------------------------------------------------------------------

  describe('createRace()', () => {
    it('should send POST to /api/dnd-races', () => {
      const dto = makeCreateRaceDto();

      service.createRace({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-races');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateRaceDto();

      service.createRace({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/dnd-races');
      const body = req.request.body;
      expect(body.name).toBe('Warforged');
      expect(body.price).toBe(0);
      expect(body.bonusStr).toBe(0);
      expect(body.bonusDex).toBe(0);
      expect(body.bonusCon).toBe(2);
      expect(body.bonusInt).toBe(0);
      expect(body.bonusWis).toBe(0);
      expect(body.bonusCha).toBe(0);
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateRaceDto();

      service.createRace({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/dnd-races');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // createMonster()
  // -------------------------------------------------------------------------

  describe('createMonster()', () => {
    it('should send POST to /api/monsters', () => {
      const dto = makeCreateMonsterDto();

      service.createMonster({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/monsters');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateMonsterDto();

      service.createMonster({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/monsters');
      const body = req.request.body;
      expect(body.name).toBe('Goblin');
      expect(body.type).toBe('Humanoid');
      expect(body.size).toBe('Small');
      expect(body.armorClass).toBe(15);
      expect(body.hitPoints).toBe(7);
      expect(body.speed).toBe('30 ft.');
      expect(body.str).toBe(8);
      expect(body.dex).toBe(14);
      expect(body.con).toBe(10);
      expect(body.intStat).toBe(10);
      expect(body.wis).toBe(8);
      expect(body.cha).toBe(8);
      expect(body.challengeRating).toBe(0.25);
      expect(body.xp).toBe(50);
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateMonsterDto();

      service.createMonster({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/monsters');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // createSpell()
  // -------------------------------------------------------------------------

  describe('createSpell()', () => {
    it('should send POST to /api/spells', () => {
      const dto = makeCreateSpellDto();

      service.createSpell({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/spells');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateSpellDto();

      service.createSpell({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/spells');
      const body = req.request.body;
      expect(body.name).toBe('Fireball');
      expect(body.level).toBe(3);
      expect(body.school).toBe('Evocation');
      expect(body.description).toBe('A bright streak flashes from your pointing finger.');
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateSpellDto();

      service.createSpell({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/spells');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // createItem()
  // -------------------------------------------------------------------------

  describe('createItem()', () => {
    it('should send POST to /api/items', () => {
      const dto = makeCreateItemDto();

      service.createItem({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/items');
      expect(req.request.method).toBe('POST');
      req.flush({});
    });

    it('should include all form fields in the request body', () => {
      const dto = makeCreateItemDto();

      service.createItem({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/items');
      const body = req.request.body;
      expect(body.name).toBe('Sword of Flames');
      expect(body.type).toBe('Weapon');
      expect(body.weight).toBe(3);
      req.flush({});
    });

    it('should include authorId from AuthService.getUserIdFromToken() in the request body', () => {
      const dto = makeCreateItemDto();

      service.createItem({ ...dto, authorId: 'ignored' }).subscribe();

      const req = httpMock.expectOne('/api/items');
      expect(req.request.body.authorId).toBe(mockUserId);
      req.flush({});
    });

    it('should default properties to {} when not provided', () => {
      const dto = makeCreateItemDto(); // no properties field

      service.createItem({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/items');
      expect(req.request.body.properties).toEqual({});
      req.flush({});
    });

    it('should preserve provided properties in the request body', () => {
      const dto = { ...makeCreateItemDto(), properties: { damage: '1d8', damageType: 'fire' } };

      service.createItem({ ...dto, authorId: mockUserId }).subscribe();

      const req = httpMock.expectOne('/api/items');
      expect(req.request.body.properties).toEqual({ damage: '1d8', damageType: 'fire' });
      req.flush({});
    });
  });

  // -------------------------------------------------------------------------
  // deleteItem()
  // -------------------------------------------------------------------------

  describe('deleteItem()', () => {
    const contentTypes: Array<{ type: ContentType; expectedUrl: string }> = [
      { type: 'CLASS',    expectedUrl: '/api/dnd-classes/42' },
      { type: 'SUBCLASS', expectedUrl: '/api/dnd-subclasses/42' },
      { type: 'RACE',     expectedUrl: '/api/dnd-races/42' },
      { type: 'MONSTER',  expectedUrl: '/api/monsters/42' },
      { type: 'SPELL',    expectedUrl: '/api/spells/42' },
      { type: 'ITEM',     expectedUrl: '/api/items/42' },
    ];

    contentTypes.forEach(({ type, expectedUrl }) => {
      it(`should send DELETE to ${expectedUrl} for ContentType=${type}`, () => {
        service.deleteItem(type, '42').subscribe();

        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
      });
    });

    it('should use the provided id in the DELETE URL', () => {
      service.deleteItem('CLASS', 'abc-uuid-999').subscribe();

      const req = httpMock.expectOne('/api/dnd-classes/abc-uuid-999');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — Property 4: authorId always present
// ---------------------------------------------------------------------------
// Feature: homebrew-content-creation, Property 4: Every valid form submission includes the authenticated user's ID as authorId

// ---------------------------------------------------------------------------
// fast-check arbitraries for valid form data
// ---------------------------------------------------------------------------

/** Non-empty string arbitrary (printable ASCII, trimmed, at least 1 char) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** Arbitrary for CreateClassDto (without authorId — service injects it) */
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

/** Arbitrary for CreateSubclassDto (without authorId) */
const subclassFormArb = fc.record({
  name: nonEmptyString,
  description: nonEmptyString,
  parentClassId: fc.integer({ min: 1, max: 1000 }),
});

/** Arbitrary for CreateRaceDto (without authorId) */
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

/** Arbitrary for CreateMonsterDto (without authorId) */
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

/** Arbitrary for CreateSpellDto (without authorId) */
const spellFormArb = fc.record({
  name: nonEmptyString,
  level: fc.integer({ min: 0, max: 9 }),
  school: nonEmptyString,
  description: nonEmptyString,
});

/** Arbitrary for CreateItemDto (without authorId) */
const itemFormArb = fc.record({
  name: nonEmptyString,
  type: nonEmptyString,
  weight: fc.float({ min: 0, max: 1000, noNaN: true }),
  properties: fc.option(
    fc.dictionary(nonEmptyString, fc.string()),
    { nil: undefined }
  ),
});

// ---------------------------------------------------------------------------
// Property 4 test suite
// ---------------------------------------------------------------------------

describe('HomebrewService — Property 4: authorId always present on submission', () => {
  let service: HomebrewService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserIdFromToken',
    ]);
    authServiceSpy.getUserIdFromToken.and.returnValue(mockUserId);

    TestBed.configureTestingModule({
      providers: [
        HomebrewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(HomebrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('createClass() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(classFormArb, (formData) => {
        service.createClass({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/dnd-classes');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });

  it('createSubclass() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(subclassFormArb, (formData) => {
        service.createSubclass({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/dnd-subclasses');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });

  it('createRace() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(raceFormArb, (formData) => {
        service.createRace({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/dnd-races');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });

  it('createMonster() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(monsterFormArb, (formData) => {
        service.createMonster({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/monsters');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });

  it('createSpell() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(spellFormArb, (formData) => {
        service.createSpell({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/spells');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });

  it('createItem() — request body always contains authorId === mockUserId for arbitrary valid form data', () => {
    fc.assert(
      fc.property(itemFormArb, (formData) => {
        service.createItem({ ...formData, authorId: 'will-be-overridden' }).subscribe();

        const req = httpMock.expectOne('/api/items');
        const body = req.request.body;
        req.flush({});

        expect(body.authorId).toBe(mockUserId);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — Property 8: Delete endpoint routing
// ---------------------------------------------------------------------------
// Feature: homebrew-content-creation, Property 8: Delete request targets the correct endpoint for each content type

/** Arbitrary for HomebrewItem with random ContentType */
const homebrewItemArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }).filter(s => s.trim().length > 0),
  name: nonEmptyString,
  contentType: fc.constantFrom<ContentType>('CLASS', 'SUBCLASS', 'RACE', 'MONSTER', 'SPELL', 'ITEM'),
});

/** Expected endpoint mapping for each ContentType */
function expectedDeleteUrl(contentType: ContentType, id: string): string {
  const endpointMap: Record<ContentType, string> = {
    CLASS:    `/api/dnd-classes/${id}`,
    SUBCLASS: `/api/dnd-subclasses/${id}`,
    RACE:     `/api/dnd-races/${id}`,
    MONSTER:  `/api/monsters/${id}`,
    SPELL:    `/api/spells/${id}`,
    ITEM:     `/api/items/${id}`,
  };
  return endpointMap[contentType];
}

describe('HomebrewService — Property 8: Delete request targets the correct endpoint for each content type', () => {
  let service: HomebrewService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'getUserIdFromToken',
    ]);
    authServiceSpy.getUserIdFromToken.and.returnValue(mockUserId);

    TestBed.configureTestingModule({
      providers: [
        HomebrewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(HomebrewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deleteItem() — DELETE URL always matches the expected endpoint for the given contentType and id', () => {
    // Validates: Requirements 9.3
    fc.assert(
      fc.property(homebrewItemArb, (item) => {
        service.deleteItem(item.contentType, item.id).subscribe();

        const expectedUrl = expectedDeleteUrl(item.contentType, item.id);
        const req = httpMock.expectOne(expectedUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
      }),
      { numRuns: 100 }
    );
  });
});

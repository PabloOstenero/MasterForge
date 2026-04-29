import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ApiService } from './api';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ApiService — Character Creation Methods Unit Tests
// Validates: Requirements 10.1, 10.2, 10.3, 10.4
// ---------------------------------------------------------------------------

describe('ApiService — Character Creation Methods', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const BASE_URL = 'http://localhost:8080/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // -------------------------------------------------------------------------
  // Requirement 10.1: getRaces() calls GET /api/dnd-races
  // -------------------------------------------------------------------------
  it('getRaces() should call GET /api/dnd-races and return an Observable<any[]>', () => {
    const mockRaces = [
      { id: '1', name: 'Human', bonusStr: 1 },
      { id: '2', name: 'Elf', bonusDex: 2 }
    ];

    service.getRaces().subscribe(races => {
      expect(races).toEqual(mockRaces);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-races`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRaces);
  });

  it('getRaces() should return an empty array when the API returns no races', () => {
    service.getRaces().subscribe(races => {
      expect(races).toEqual([]);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-races`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // -------------------------------------------------------------------------
  // Requirement 10.2: getClasses() calls GET /api/dnd-classes
  // -------------------------------------------------------------------------
  it('getClasses() should call GET /api/dnd-classes and return an Observable<any[]>', () => {
    const mockClasses = [
      { id: '1', name: 'Fighter', hitDie: 10, savingThrows: { str: true, con: true } },
      { id: '2', name: 'Wizard', hitDie: 6, savingThrows: { int: true, wis: true } }
    ];

    service.getClasses().subscribe(classes => {
      expect(classes).toEqual(mockClasses);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-classes`);
    expect(req.request.method).toBe('GET');
    req.flush(mockClasses);
  });

  it('getClasses() should return an empty array when the API returns no classes', () => {
    service.getClasses().subscribe(classes => {
      expect(classes).toEqual([]);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-classes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // -------------------------------------------------------------------------
  // Requirement 10.3: getSubclasses() calls GET /api/dnd-subclasses
  // -------------------------------------------------------------------------
  it('getSubclasses() should call GET /api/dnd-subclasses and return an Observable<any[]>', () => {
    const mockSubclasses = [
      { id: '1', name: 'Champion', parentClass: { id: '1' } },
      { id: '2', name: 'Battle Master', parentClass: { id: '1' } }
    ];

    service.getSubclasses().subscribe(subclasses => {
      expect(subclasses).toEqual(mockSubclasses);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-subclasses`);
    expect(req.request.method).toBe('GET');
    req.flush(mockSubclasses);
  });

  it('getSubclasses() should return an empty array when the API returns no subclasses', () => {
    service.getSubclasses().subscribe(subclasses => {
      expect(subclasses).toEqual([]);
    });

    const req = httpMock.expectOne(`${BASE_URL}/dnd-subclasses`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // -------------------------------------------------------------------------
  // Requirement 10.4: createCharacter(dto) calls POST /api/characters
  // -------------------------------------------------------------------------
  it('createCharacter(dto) should call POST /api/characters with the provided DTO', () => {
    const mockDto = {
      name: 'Aragorn',
      level: 1,
      dndRace: { id: '1' },
      dndClass: { id: '2' },
      user: { id: 'user-123' }
    };
    const mockResponse = { id: 'char-456', ...mockDto };

    service.createCharacter(mockDto).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${BASE_URL}/characters`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockDto);
    req.flush(mockResponse);
  });

  it('createCharacter(dto) should send the DTO body exactly as provided', () => {
    const mockDto = {
      name: 'Gandalf',
      level: 1,
      maxHp: 8,
      currentHp: 8,
      tempHp: 0,
      speed: 30,
      hitDiceTotal: 1,
      hitDiceSpent: 0,
      baseStr: 10, baseDex: 14, baseCon: 12, baseInt: 18, baseWis: 16, baseCha: 10,
      savingThrowsProficiencies: { int: true, wis: true },
      skillProficiencies: { arcana: true, history: true },
      spellSlots: {},
      choicesJson: {},
      cp: 0, sp: 0, ep: 0, gp: 0, pp: 0,
      user: { id: 'user-789' },
      dndRace: { id: 'race-1' },
      dndClass: { id: 'class-1' },
      inventory: []
    };

    service.createCharacter(mockDto).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/characters`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockDto);
    req.flush({ id: 'new-char-id', ...mockDto });
  });
});

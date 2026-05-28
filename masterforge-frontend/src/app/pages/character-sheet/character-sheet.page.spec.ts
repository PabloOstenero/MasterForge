import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { CharacterSheetPage } from './character-sheet.page';
import { ApiService } from '../../services/api';
import { HomebrewService } from '../../services/homebrew.service';
import { AlertController, ActionSheetController, ModalController, ToastController } from '@ionic/angular/standalone';

describe('CharacterSheetPage', () => {
  let component: CharacterSheetPage;
  let fixture: ComponentFixture<CharacterSheetPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterSheetPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: ApiService, useValue: jasmine.createSpyObj('ApiService', ['getCharacter', 'updateSpellSlots', 'updateCharacterHp', 'updateHitDice']) },
        { provide: HomebrewService, useValue: jasmine.createSpyObj('HomebrewService', ['getAllSpells']) },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
        { provide: ActionSheetController, useValue: jasmine.createSpyObj('ActionSheetController', ['create']) },
        { provide: ModalController, useValue: jasmine.createSpyObj('ModalController', ['create']) },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterSheetPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getAutoSpellSlots - Issue 2 Multiclass spell caster summing consolidation', () => {
    it('should calculate spell slots for a single-class Full Caster correctly (Cleric 5)', () => {
      const char = {
        level: 5,
        dndClass: {
          name: 'Cleric',
          classFeatures: {
            spellcasting: { spellcastingType: 'Full Caster' }
          }
        },
        classLevels: []
      };
      const slots = component.getAutoSpellSlots(char);
      expect(slots['level_1']).toEqual({ max: 4, available: 4 });
      expect(slots['level_2']).toEqual({ max: 3, available: 3 });
      expect(slots['level_3']).toEqual({ max: 2, available: 2 });
      expect(slots['level_4']).toBeUndefined();
    });

    it('should calculate spell slots for a single-class Half Caster correctly (Paladin 3)', () => {
      const char = {
        level: 3,
        dndClass: {
          name: 'Paladin',
          classFeatures: {
            spellcasting: { spellcastingType: 'Half Caster' }
          }
        },
        classLevels: []
      };
      const slots = component.getAutoSpellSlots(char);
      expect(slots['level_1']).toEqual({ max: 3, available: 3 });
      expect(slots['level_2']).toBeUndefined();
    });

    it('should calculate consolidated multiclass slots using floor ECL math (Cleric 3 / Paladin 2)', () => {
      // Cleric 3 (3 ECL) + Paladin 2 (2/2 = 1 ECL) = 4 ECL Full Caster slots
      const char = {
        level: 5,
        dndClass: {
          name: 'Cleric',
          classFeatures: {
            spellcasting: { spellcastingType: 'Full Caster' }
          }
        },
        classLevels: [
          {
            level: 2,
            dndClass: {
              name: 'Paladin',
              classFeatures: {
                spellcasting: { spellcastingType: 'Half Caster' }
              }
            }
          }
        ]
      };
      const slots = component.getAutoSpellSlots(char);
      // ECL 4 Full Caster slots: 4 1st, 3 2nd
      expect(slots['level_1']).toEqual({ max: 4, available: 4 });
      expect(slots['level_2']).toEqual({ max: 3, available: 3 });
      expect(slots['level_3']).toBeUndefined();
    });

    it('should round down fractional caster levels in multiclass (Cleric 3 / Paladin 3)', () => {
      // Cleric 3 (3 ECL) + Paladin 3 (3/2 = 1.5 rounded down = 1 ECL) = 4 ECL Full Caster slots
      const char = {
        level: 6,
        dndClass: {
          name: 'Cleric',
          classFeatures: {
            spellcasting: { spellcastingType: 'Full Caster' }
          }
        },
        classLevels: [
          {
            level: 3,
            dndClass: {
              name: 'Paladin',
              classFeatures: {
                spellcasting: { spellcastingType: 'Half Caster' }
              }
            }
          }
        ]
      };
      const slots = component.getAutoSpellSlots(char);
      expect(slots['level_1']).toEqual({ max: 4, available: 4 });
      expect(slots['level_2']).toEqual({ max: 3, available: 3 });
      expect(slots['level_3']).toBeUndefined();
    });

    it('should consolidate full, half, and third casters together (Cleric 3 / Ranger 2 / Arcane Trickster 3)', () => {
      // Cleric 3 (3 ECL) + Ranger 2 (2/2 = 1 ECL) + Arcane Trickster 3 (3/3 = 1 ECL) = 5 ECL Full Caster slots
      const char = {
        level: 8,
        dndClass: {
          name: 'Cleric',
          classFeatures: {
            spellcasting: { spellcastingType: 'Full Caster' }
          }
        },
        classLevels: [
          {
            level: 2,
            dndClass: {
              name: 'Ranger',
              classFeatures: {
                spellcasting: { spellcastingType: 'Half Caster' }
              }
            }
          },
          {
            level: 3,
            dndClass: {
              name: 'Rogue',
              subclass: {
                subclassFeatures: {
                  spellcasting: { spellcastingType: 'Third Caster' }
                }
              }
            }
          }
        ]
      };
      const slots = component.getAutoSpellSlots(char);
      // ECL 5 Full Caster slots: 4 1st, 3 2nd, 2 3rd
      expect(slots['level_1']).toEqual({ max: 4, available: 4 });
      expect(slots['level_2']).toEqual({ max: 3, available: 3 });
      expect(slots['level_3']).toEqual({ max: 2, available: 2 });
      expect(slots['level_4']).toBeUndefined();
    });
  });
});

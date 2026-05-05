/**
 * Unit tests for HomebrewPage — loading, error, and empty states.
 *
 * Validates: Requirements 2.3, 2.4
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { HomebrewPage } from './homebrew.page';
import { HomebrewService, HomebrewSummary } from '../../services/homebrew.service';
import { AuthService } from '../../services/auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyHomebrew(): HomebrewSummary {
  return {
    classes: [],
    subclasses: [],
    races: [],
    monsters: [],
    spells: [],
    items: [],
  };
}

function makeItem(id: string, name: string, contentType: any) {
  return { id, name, contentType };
}

function buildHomebrewServiceSpy(): jasmine.SpyObj<HomebrewService> {
  const spy = jasmine.createSpyObj<HomebrewService>('HomebrewService', [
    'getMyHomebrew',
    'deleteItem',
  ]);
  // Default: return empty homebrew so ngOnInit doesn't leave loading=true
  spy.getMyHomebrew.and.returnValue(of(emptyHomebrew()));
  return spy;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('HomebrewPage', () => {
  let component: HomebrewPage;
  let fixture: ComponentFixture<HomebrewPage>;
  let homebrewServiceSpy: jasmine.SpyObj<HomebrewService>;

  beforeEach(async () => {
    homebrewServiceSpy = buildHomebrewServiceSpy();

    const authServiceMock = {
      getUserIdFromToken: () => 'user-1',
      getCurrentUser: () => ({ id: 'user-1', name: 'Test User' }),
    };

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
    // Run ngOnInit (calls loadMyHomebrew which resolves synchronously via of())
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Loading state — Requirement 2.4 (spinner while fetching)
  // -------------------------------------------------------------------------

  describe('Loading state', () => {
    it('should render <ion-spinner> while loading is true', () => {
      // Override state after ngOnInit has already run
      component.loading = true;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="homebrew-spinner"]');
      expect(spinner).toBeTruthy();
    });

    it('should NOT render <ion-spinner> when loading is false', () => {
      component.loading = false;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[data-testid="homebrew-spinner"]');
      expect(spinner).toBeNull();
    });

    it('should set loading=true before the HTTP call resolves', () => {
      // Use a Subject so we control when the observable emits
      const subject = new Subject<HomebrewSummary>();
      homebrewServiceSpy.getMyHomebrew.and.returnValue(subject.asObservable());

      component.loading = false;
      component.loadMyHomebrew();

      expect(component.loading).toBeTrue();
    });

    it('should set loading=false after the HTTP call resolves', () => {
      homebrewServiceSpy.getMyHomebrew.and.returnValue(of(emptyHomebrew()));
      component.loadMyHomebrew();
      expect(component.loading).toBeFalse();
    });

    it('should set loading=false after the HTTP call errors', () => {
      homebrewServiceSpy.getMyHomebrew.and.returnValue(
        throwError(() => new Error('network error'))
      );
      component.loadMyHomebrew();
      expect(component.loading).toBeFalse();
    });
  });

  // -------------------------------------------------------------------------
  // Error state — Requirement 2.4
  // -------------------------------------------------------------------------

  describe('Error state', () => {
    it('should render error paragraph when error is set', () => {
      component.error = 'Error al cargar el contenido homebrew';
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="homebrew-error"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain('Error al cargar el contenido homebrew');
    });

    it('should render error paragraph with class "text-muted"', () => {
      component.error = 'Something went wrong';
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="homebrew-error"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl.classList).toContain('text-muted');
    });

    it('should NOT render error paragraph when error is null', () => {
      component.error = null;
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="homebrew-error"]');
      expect(errorEl).toBeNull();
    });

    it('should set error when getMyHomebrew() fails', () => {
      homebrewServiceSpy.getMyHomebrew.and.returnValue(
        throwError(() => new Error('backend error'))
      );
      component.loadMyHomebrew();
      expect(component.error).toBeTruthy();
    });

    it('should clear error before each new load attempt', () => {
      component.error = 'previous error';
      homebrewServiceSpy.getMyHomebrew.and.returnValue(of(emptyHomebrew()));
      component.loadMyHomebrew();
      expect(component.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state — Requirement 2.3
  // -------------------------------------------------------------------------

  describe('Empty state — Classes section', () => {
    it('should show empty-state message when classes list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), classes: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-CLASS"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when classes list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        classes: [makeItem('1', 'Artificer', 'CLASS')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-CLASS"]');
      expect(emptyEl).toBeNull();
    });
  });

  describe('Empty state — Subclasses section', () => {
    it('should show empty-state message when subclasses list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), subclasses: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-SUBCLASS"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when subclasses list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        subclasses: [makeItem('2', 'Battle Smith', 'SUBCLASS')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-SUBCLASS"]');
      expect(emptyEl).toBeNull();
    });
  });

  describe('Empty state — Races section', () => {
    it('should show empty-state message when races list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), races: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-RACE"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when races list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        races: [makeItem('3', 'Warforged', 'RACE')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-RACE"]');
      expect(emptyEl).toBeNull();
    });
  });

  describe('Empty state — Monsters section', () => {
    it('should show empty-state message when monsters list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), monsters: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-MONSTER"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when monsters list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        monsters: [makeItem('4', 'Goblin', 'MONSTER')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-MONSTER"]');
      expect(emptyEl).toBeNull();
    });
  });

  describe('Empty state — Spells section', () => {
    it('should show empty-state message when spells list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), spells: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-SPELL"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when spells list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        spells: [makeItem('5', 'Fireball', 'SPELL')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-SPELL"]');
      expect(emptyEl).toBeNull();
    });
  });

  describe('Empty state — Items section', () => {
    it('should show empty-state message when items list is empty', () => {
      component.homebrewItems = { ...emptyHomebrew(), items: [] };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-ITEM"]');
      expect(emptyEl).toBeTruthy();
    });

    it('should NOT show empty-state message when items list has items', () => {
      component.homebrewItems = {
        ...emptyHomebrew(),
        items: [makeItem('6', 'Sword of Flames', 'ITEM')],
      };
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-ITEM"]');
      expect(emptyEl).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // All sections empty at once — Requirement 2.3
  // -------------------------------------------------------------------------

  describe('All sections empty', () => {
    it('should show empty-state messages for all six sections when homebrewItems is fully empty', () => {
      // ngOnInit already ran with emptyHomebrew() — all sections should show empty state
      const sections = ['CLASS', 'SUBCLASS', 'RACE', 'MONSTER', 'SPELL', 'ITEM'];
      sections.forEach(type => {
        const emptyEl = fixture.nativeElement.querySelector(`[data-testid="empty-${type}"]`);
        expect(emptyEl).withContext(`empty-state for ${type}`).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Delete confirmation flow — Requirements 9.2, 9.4, 9.5
  // -------------------------------------------------------------------------

  describe('Delete confirmation flow', () => {
    const classItem = makeItem('10', 'Artificer', 'CLASS');
    const spellItem = makeItem('20', 'Fireball', 'SPELL');

    beforeEach(() => {
      // Pre-populate the list with two items so we can verify removal
      component.homebrewItems = {
        ...emptyHomebrew(),
        classes: [classItem, makeItem('11', 'Paladin', 'CLASS')],
        spells: [spellItem],
      };
      fixture.detectChanges();
    });

    // -----------------------------------------------------------------------
    // Requirement 9.2 — confirmation prompt before proceeding
    // -----------------------------------------------------------------------

    it('should NOT call deleteItem() when user cancels the confirm dialog', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(component, 'deleteItem');

      component.confirmDelete(classItem);

      expect(window.confirm).toHaveBeenCalled();
      expect(component.deleteItem).not.toHaveBeenCalled();
    });

    it('should call deleteItem() when user confirms the dialog', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));
      spyOn(component, 'deleteItem').and.callThrough();

      component.confirmDelete(classItem);

      expect(component.deleteItem).toHaveBeenCalledWith(classItem);
    });

    it('should pass the item name in the confirm message', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.confirmDelete(classItem);

      const confirmArg = (window.confirm as jasmine.Spy).calls.mostRecent().args[0] as string;
      expect(confirmArg).toContain(classItem.name);
    });

    // -----------------------------------------------------------------------
    // Requirement 9.4 — item removed from list after successful DELETE
    // -----------------------------------------------------------------------

    it('should remove the deleted item from the list on successful DELETE', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

      component.deleteItem(classItem);

      expect(component.homebrewItems.classes.find(i => i.id === classItem.id)).toBeUndefined();
    });

    it('should keep other items in the list after a successful DELETE', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

      component.deleteItem(classItem);

      // The second class ('11') must still be present
      expect(component.homebrewItems.classes.find(i => i.id === '11')).toBeTruthy();
    });

    it('should remove the item from the correct content-type list', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

      component.deleteItem(spellItem);

      expect(component.homebrewItems.spells.find(i => i.id === spellItem.id)).toBeUndefined();
      // Classes list must be untouched
      expect(component.homebrewItems.classes.length).toBe(2);
    });

    it('should clear deletingId after a successful DELETE', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

      component.deleteItem(classItem);

      expect(component.deletingId).toBeNull();
    });

    it('should update the DOM to remove the deleted item after a successful DELETE', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(of(undefined));

      component.deleteItem(classItem);
      fixture.detectChanges();

      // The deleted item's name should no longer appear in the rendered list
      const listText: string = fixture.nativeElement.textContent;
      expect(listText).not.toContain(classItem.name);
    });

    // -----------------------------------------------------------------------
    // Requirement 9.5 — error shown and item retained after failed DELETE
    // -----------------------------------------------------------------------

    it('should show an error message when DELETE fails', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      component.deleteItem(classItem);
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('[data-testid="homebrew-error"]');
      expect(errorEl).toBeTruthy();
      expect(component.error).toBeTruthy();
    });

    it('should retain the item in the list when DELETE fails', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      component.deleteItem(classItem);

      expect(component.homebrewItems.classes.find(i => i.id === classItem.id)).toBeTruthy();
    });

    it('should clear deletingId after a failed DELETE', () => {
      homebrewServiceSpy.deleteItem.and.returnValue(
        throwError(() => ({ message: 'Server error' }))
      );

      component.deleteItem(classItem);

      expect(component.deletingId).toBeNull();
    });

    it('should set deletingId to the item id while DELETE is in progress', () => {
      const subject = new Subject<void>();
      homebrewServiceSpy.deleteItem.and.returnValue(subject.asObservable());

      component.deleteItem(classItem);

      expect(component.deletingId).toBe(classItem.id);

      // Complete the observable so the test doesn't leave a dangling subscription
      subject.complete();
    });
  });
});

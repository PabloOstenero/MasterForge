import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import * as fc from 'fast-check';

import { PlayersPage } from './players.page';
import { ApiService } from '../../services/api';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  email: fc.emailAddress(),
  subscriptionTier: fc.constantFrom('FREE', 'PRO'),
  role: fc.constantFrom('USER', 'MANAGER', 'ADMIN'),
  isActive: fc.boolean(),
  balance: fc.float({ min: 0, max: 100 }),
});

describe('PlayersPage — Property-Based Tests', () => {
  let fixture: ComponentFixture<PlayersPage>;
  let component: PlayersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let alertSpy: jasmine.SpyObj<AlertController>;
  let toastSpy: jasmine.SpyObj<ToastController>;
  let alertElSpy: jasmine.SpyObj<any>;
  let toastElSpy: jasmine.SpyObj<any>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getUsers',
      'updateUserAdmin',
      'deleteUserAdmin',
    ]);
    apiSpy.getUsers.and.returnValue(of([]));
    apiSpy.updateUserAdmin.and.returnValue(of({}));
    apiSpy.deleteUserAdmin.and.returnValue(of({}));

    alertSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertElSpy = jasmine.createSpyObj('Alert', ['present']);
    alertSpy.create.and.returnValue(Promise.resolve(alertElSpy));

    toastSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastElSpy = jasmine.createSpyObj('Toast', ['present']);
    toastSpy.create.and.returnValue(Promise.resolve(toastElSpy));

    await TestBed.configureTestingModule({
      imports: [PlayersPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AlertController, useValue: alertSpy },
        { provide: ToastController, useValue: toastSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------------------------------------------------------------
  // Property 1: getUsers success loads users
  // -------------------------------------------------------------------------
  it('P1 — loadUsers successfully updates users and filteredUsers', () => {
    fc.assert(
      fc.property(fc.array(userArb, { minLength: 0, maxLength: 20 }), (usersData) => {
        apiSpy.getUsers.and.returnValue(of(usersData));
        component.loadUsers();
        expect(component.loading).toBeFalse();
        expect(component.error).toBeNull();
        expect(component.users).toEqual(usersData);
        expect(component.filteredUsers).toEqual(usersData);
      }),
      { numRuns: 50 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 2: getUsers error sets error msg
  // -------------------------------------------------------------------------
  it('P2 — loadUsers error sets error state', () => {
    fc.assert(
      fc.property(fc.string(), (errMsg) => {
        apiSpy.getUsers.and.returnValue(throwError(() => new Error(errMsg)));
        component.loadUsers();
        expect(component.loading).toBeFalse();
        expect(component.error).toBe('No se pudieron cargar los usuarios.');
      }),
      { numRuns: 20 }
    );
  });

  // -------------------------------------------------------------------------
  // Property 3: filtering users works correctly
  // -------------------------------------------------------------------------
  it('P3 — filtering by search term or status returns correct subsets', () => {
    fc.assert(
      fc.property(
        fc.array(userArb, { minLength: 5, maxLength: 20 }),
        fc.constantFrom('all', 'active', 'banned', 'pro'),
        (usersData, filterStatus) => {
          component.users = [...usersData];
          component.filterStatus = filterStatus as any;
          component.searchTerm = '';
          component.applyFilters();

          // Check segment filtering
          if (filterStatus === 'active') {
            expect(component.filteredUsers.every(u => u.isActive)).toBeTrue();
          } else if (filterStatus === 'banned') {
            expect(component.filteredUsers.every(u => !u.isActive)).toBeTrue();
          } else if (filterStatus === 'pro') {
            expect(component.filteredUsers.every(u => u.subscriptionTier === 'PRO')).toBeTrue();
          } else {
            expect(component.filteredUsers.length).toBe(usersData.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('PlayersPage — Unit Tests', () => {
  let fixture: ComponentFixture<PlayersPage>;
  let component: PlayersPage;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let alertSpy: jasmine.SpyObj<AlertController>;
  let toastSpy: jasmine.SpyObj<ToastController>;
  let alertElSpy: jasmine.SpyObj<any>;
  let toastElSpy: jasmine.SpyObj<any>;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiService>('ApiService', [
      'getUsers',
      'updateUserAdmin',
      'deleteUserAdmin',
    ]);
    apiSpy.getUsers.and.returnValue(of([]));
    apiSpy.updateUserAdmin.and.returnValue(of({}));
    apiSpy.deleteUserAdmin.and.returnValue(of({}));

    alertSpy = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertElSpy = jasmine.createSpyObj('Alert', ['present']);
    alertSpy.create.and.returnValue(Promise.resolve(alertElSpy));

    toastSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastElSpy = jasmine.createSpyObj('Toast', ['present']);
    toastSpy.create.and.returnValue(Promise.resolve(toastElSpy));

    await TestBed.configureTestingModule({
      imports: [PlayersPage],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AlertController, useValue: alertSpy },
        { provide: ToastController, useValue: toastSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadUsers on ngOnInit', () => {
    expect(apiSpy.getUsers).toHaveBeenCalled();
  });

  it('should trigger alert and call updateUserAdmin on toggleActiveStatus', fakeAsync(() => {
    const mockUser = {
      id: '123',
      name: 'Test',
      email: 'test@example.com',
      subscriptionTier: 'FREE',
      role: 'USER',
      isActive: true,
      balance: 0,
    };
    alertSpy.create.and.callFake((options: any) => {
      // Simulate confirmation click
      options.buttons[1].handler();
      return Promise.resolve(alertElSpy);
    });

    component.toggleActiveStatus(mockUser);
    tick();

    expect(alertSpy.create).toHaveBeenCalled();
    expect(apiSpy.updateUserAdmin).toHaveBeenCalledWith('123', { isActive: false });
    expect(mockUser.isActive).toBeFalse();
  }));

  it('should trigger alert and call updateUserAdmin on toggleProStatus', fakeAsync(() => {
    const mockUser = {
      id: '123',
      name: 'Test',
      email: 'test@example.com',
      subscriptionTier: 'FREE',
      role: 'USER',
      isActive: true,
      balance: 0,
    };
    alertSpy.create.and.callFake((options: any) => {
      options.buttons[1].handler();
      return Promise.resolve(alertElSpy);
    });

    component.toggleProStatus(mockUser);
    tick();

    expect(alertSpy.create).toHaveBeenCalled();
    expect(apiSpy.updateUserAdmin).toHaveBeenCalledWith('123', { subscriptionTier: 'PRO' });
    expect(mockUser.subscriptionTier).toBe('PRO');
  }));

  it('should trigger alert and call updateUserAdmin on changeRole', fakeAsync(() => {
    const mockUser = {
      id: '123',
      name: 'Test',
      email: 'test@example.com',
      subscriptionTier: 'FREE',
      role: 'USER',
      isActive: true,
      balance: 0,
    };
    alertSpy.create.and.callFake((options: any) => {
      options.buttons[1].handler('ADMIN');
      return Promise.resolve(alertElSpy);
    });

    component.changeRole(mockUser);
    tick();

    expect(alertSpy.create).toHaveBeenCalled();
    expect(apiSpy.updateUserAdmin).toHaveBeenCalledWith('123', { role: 'ADMIN' });
    expect(mockUser.role).toBe('ADMIN');
  }));

  it('should trigger alert and call deleteUserAdmin on deleteUser', fakeAsync(() => {
    const mockUser = {
      id: '123',
      name: 'Test',
      email: 'test@example.com',
      subscriptionTier: 'FREE',
      role: 'USER',
      isActive: true,
      balance: 0,
    };
    component.users = [mockUser];
    alertSpy.create.and.callFake((options: any) => {
      options.buttons[1].handler();
      return Promise.resolve(alertElSpy);
    });

    component.deleteUser(mockUser);
    tick();

    expect(alertSpy.create).toHaveBeenCalled();
    expect(apiSpy.deleteUserAdmin).toHaveBeenCalledWith('123');
    expect(component.users.length).toBe(0);
  }));
});

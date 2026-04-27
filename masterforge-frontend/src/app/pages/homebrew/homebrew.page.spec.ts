import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomebrewPage } from './homebrew.page';

describe('HomebrewPage', () => {
  let component: HomebrewPage;
  let fixture: ComponentFixture<HomebrewPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomebrewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

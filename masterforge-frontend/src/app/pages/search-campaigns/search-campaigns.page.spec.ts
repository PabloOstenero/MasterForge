import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SearchCampaignsPage } from './search-campaigns.page';

describe('SearchCampaignsPage', () => {
  let component: SearchCampaignsPage;
  let fixture: ComponentFixture<SearchCampaignsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchCampaignsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchCampaignsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

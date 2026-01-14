import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderComponent } from './loader.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BehaviorSubject, of } from 'rxjs';
import { ModelsLoaderService } from '../../core/services/models-loader.service';

class MockModelsLoaderService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  isLoading$ = this.loadingSubject.asObservable();

  setLoading(value: boolean) {
    this.loadingSubject.next(value);
  }
}

describe('LoaderComponent', () => {
  let component: LoaderComponent;
  let fixture: ComponentFixture<LoaderComponent>;
  let mockService: MockModelsLoaderService;
  let compiled: HTMLElement;

  beforeEach(async () => {
    mockService = new MockModelsLoaderService();

    await TestBed.configureTestingModule({
      imports: [LoaderComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ModelsLoaderService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoaderComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with isLoading = false', () => {
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('Loader display', () => {
    it('should not show loader when isLoading is false', () => {
      expect(compiled.querySelector('.loader-overlay')).toBeNull();
    });

    it('should show loader when isLoading is true', async () => {
      mockService.setLoading(true);
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const loader = compiled.querySelector('.loader-overlay');
      expect(loader).not.toBeNull();
      expect(loader?.classList.contains('loader-overlay')).toBeTrue();
    });

    it('should not show loader when isLoading is false', async () => {
      mockService.setLoading(false);
      fixture.detectChanges();

      await fixture.whenStable();
      fixture.detectChanges();

      const loader = compiled.querySelector('.loader-overlay');
      expect(loader).toBeNull();
    });
  });
});

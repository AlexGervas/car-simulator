import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePageComponent } from './home-page.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideNoopAnimations(),
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('navigation methods', () => {
    it('should navigate to "game" when openStartGame is called', () => {
      component.openStartGame();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['game']);
    });

    it('should navigate to "model-viewer" when openModelViewer is called', () => {
      component.openModelViewer();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['model-viewer']);
    });
  });

  describe('button clicks', () => {
    it('should call openStartGame on first button click', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[0].click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['game']);
    });

    it('should call openModelViewer on second button click', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[1].click();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['model-viewer']);
    });

    it('should alert "Coming soon!" on third button click', () => {
      spyOn(window, 'alert');
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[2].click();
      expect(window.alert).toHaveBeenCalledWith('Coming soon!');
    });
  });
});

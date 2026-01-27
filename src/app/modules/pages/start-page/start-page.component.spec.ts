import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { StartPageComponent } from './start-page.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LevelService } from '../../../core/services/level.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('StartPageComponent', () => {
  let component: StartPageComponent;
  let fixture: ComponentFixture<StartPageComponent>;
  let mockLevelService: jasmine.SpyObj<LevelService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let levels$: BehaviorSubject<Record<string, boolean>>;

  beforeEach(waitForAsync(() => {
    levels$ = new BehaviorSubject<Record<string, boolean>>({
      snake: true,
      'parallel-parking': true,
      garage: false,
      'steep-grade': false,
    });

    mockLevelService = jasmine.createSpyObj(
      'LevelService',
      ['isLevelAvailable'],
      {
        levels$: levels$,
        levelOrder: ['snake', 'parallel-parking', 'garage', 'steep-grade'],
      }
    );

    const mockTelegramService = jasmine.createSpyObj('TelegramService', [
      'getTelegramUser',
    ]);
    mockTelegramService.getTelegramUser.and.returnValue({ userId: '12345' });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [StartPageComponent, CommonModule, HttpClientModule],
      providers: [
        provideNoopAnimations(),
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: LevelService, useValue: mockLevelService },
        { provide: Router, useValue: mockRouter },
      ],
    })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(StartPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  describe('initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should generate level buttons with correct availability and icons', () => {
      expect(component.levelBtns.length).toBe(4);

      const snakeBtn = component.levelBtns.find((btn) => btn.name === 'snake');
      const parkingBtn = component.levelBtns.find(
        (btn) => btn.name === 'parallel-parking'
      );
      const garageBtn = component.levelBtns.find(
        (btn) => btn.name === 'garage'
      );

      expect(snakeBtn?.available).toBeTrue();
      expect(parkingBtn?.available).toBeTrue();
      expect(garageBtn?.available).toBeFalse();
      expect(snakeBtn?.icon).toBe('svg/snake.svg');
      expect(parkingBtn?.icon).toBe('svg/parallel_parking.svg');
      expect(parkingBtn?.tooltip).toBe('Practice Parallel Parking');
    });
  });

  describe('startGame()', () => {
    it('should navigate to /game/simulator with level param if level is available', () => {
      mockLevelService.isLevelAvailable.and.returnValue(true);

      component.startGame('snake');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/game/simulator'], {
        queryParams: { level: 'snake' },
      });
    });

    it('should alert if level is not available', () => {
      spyOn(window, 'alert');
      mockLevelService.isLevelAvailable.and.returnValue(false);

      component.startGame('garage');

      expect(window.alert).toHaveBeenCalledWith('Этот уровень недоступен!');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  it('should unsubscribe on destroy', () => {
    spyOn(component['sub'], 'unsubscribe');
    component.ngOnDestroy();
    expect(component['sub'].unsubscribe).toHaveBeenCalled();
  });
});

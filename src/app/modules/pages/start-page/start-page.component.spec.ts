import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartPageComponent } from './start-page.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LevelService } from '../../../core/services/level.service';
import { TelegramService } from '../../../core/services/telegram.service';

describe('StartPageComponent', () => {
    let component: StartPageComponent;
    let fixture: ComponentFixture<StartPageComponent>;

    beforeEach(async () => {
        const mockTelegramService = jasmine.createSpyObj('TelegramService', ['getTelegramUser']);
        mockTelegramService.getTelegramUser.and.returnValue({ userId: '12345' });

        await TestBed.configureTestingModule({
            imports: [StartPageComponent, CommonModule, HttpClientModule],
            providers: [
                provideNoopAnimations(),
                { provide: TelegramService, useValue: mockTelegramService },
                LevelService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StartPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimulatorComponent } from './simulator.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LevelService } from '../../../core/services/level.service';
import { DeviceService } from '../../../core/services/device.service';
import { ConeStateService } from '../../../core/services/cone-state.service';
import { StopLineService } from '../../../core/services/stop-line.service';
import { ComponentFactoryResolver } from '@angular/core';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import { DialogService } from '../../../core/services/dialog.service';
import { MatDialog } from '@angular/material/dialog';
import { TelegramService } from '../../../core/services/telegram.service';

describe('SimulatorComponent', () => {
    let component: SimulatorComponent;
    let fixture: ComponentFixture<SimulatorComponent>;

    const mockTelegramService = {
        tg: {
            initDataUnsafe: {
                user: {
                    id: 0,
                    username: "alex_gervas",
                    first_name: "Alexandra",
                    last_name: "Gervas"
                }
            }
        },
        getTelegramUser: () => ({
            userId: 0,
            username: "alex_gervas",
            userfirstname: "Alexandra",
            userlastname: "Gervas"
        })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SimulatorComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({}),
                        snapshot: {
                            params: {}
                        }
                    }
                },
                {
                    provide: TelegramService,
                    useValue: mockTelegramService 
                },
                ApiService,
                LevelService,
                DeviceService,
                ConeStateService,
                StopLineService,
                ComponentFactoryResolver,
                ModelsLoaderService,
                DialogService,
                MatDialog
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SimulatorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

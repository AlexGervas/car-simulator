import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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
import * as THREE from 'three';

describe('SimulatorComponent', () => {
    let component: SimulatorComponent;
    let fixture: ComponentFixture<SimulatorComponent>;

    const mockTelegramService = {
        tg: {
            initDataUnsafe: {
                user: {
                    id: 784002330,
                    username: "alex_gervas",
                    first_name: "Alexandra",
                    last_name: "Gervas"
                }
            }
        },
        getTelegramUser: () => ({
            userId: 784002330,
            username: "alex_gervas",
            userfirstname: "Alexandra",
            userlastname: "Gervas"
        })
    };

    const mockDeviceService = {
        isMobile: () => false
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [SimulatorComponent, HttpClientTestingModule],
            providers: [
                provideNoopAnimations(),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParams: of({ level: 'snake' }),
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
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('Level initialization', () => {
        it('should call initSnakeScene when level is snake', async () => {
            spyOn(component, 'initSnakeScene').and.returnValue(Promise.resolve());
            await component.initLevel('snake');
            expect(component.initSnakeScene).toHaveBeenCalled();
        });

        it('should call initParallelParkingScene when level is parallel-parking', async () => {
            spyOn(component, 'initParallelParkingScene').and.returnValue(Promise.resolve());
            await component.initLevel('parallel-parking');
            expect(component.initParallelParkingScene).toHaveBeenCalled();
        });

        it('should call initGarageScene when level is garage', async () => {
            spyOn(component, 'initGarageScene').and.returnValue(Promise.resolve());
            await component.initLevel('garage');
            expect(component.initGarageScene).toHaveBeenCalled();
        });

        it('should call initSteepGradeScene for unknown level', async () => {
            spyOn(component, 'initSteepGradeScene').and.returnValue(Promise.resolve());
            await component.initLevel('unknown-level');
            expect(component.initSteepGradeScene).toHaveBeenCalled();
        });
    });

    describe('clearLevelScene', () => {
        it('should call removeCones, clearConeStates, and removeStopLine', async () => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['removeCones']);
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'clearConeStates');
            const stopLineServiceSpy = spyOn(component['stopLineService'], 'removeStopLine');

            await component['clearLevelScene']();

            expect(component.trafficCones.removeCones).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalled();
            expect(stopLineServiceSpy).toHaveBeenCalled();
        });
    });

    describe('initSnakeScene', () => {
        it('should create snake cones and initialize cone states', async () => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createSnake'], { cones: [1, 2, 3] });
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'initializeConeStates');

            await component.initSnakeScene();

            expect(component.trafficCones.createSnake).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalledWith(3);
        });

        it('should catch and log errors during snake scene initialization', async () => {
            const error = new Error('Failure');

            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createSnake'], { cones: [] });

            (component.trafficCones.createSnake as jasmine.Spy).and.rejectWith(error);

            spyOn(console, 'error');

            await component.initSnakeScene();

            expect(console.error).toHaveBeenCalledWith('Error when initializing Snake scene:', error);
        });
    });

    describe('initParallelParkingScene', () => {
        beforeEach(() => {
            component.scene = {} as THREE.Scene;
        });

        it('should initialize properties and call createParallelParking and initializeConeStates', async () => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createParallelParking'], { cones: [1, 2] });
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'initializeConeStates');

            await component.initParallelParkingScene();

            expect(component.exerciseStarted).toBeFalse();
            expect(component.checkDialogShown).toBeFalse();
            expect(component.stoppedOnce).toBeFalse();
            expect(component['isCheckingConditions']).toBeFalse();
            expect(component.trafficCones.createParallelParking).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalledWith(2);
        });

        it('should reject if scene is not initialized', async () => {
            component.scene = undefined as any;
            await expectAsync(component.initParallelParkingScene()).toBeRejectedWith('Scene is not initialized');
        });

        it('should handle error during createParallelParking', async () => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createParallelParking'], { cones: [1] });
            (component.trafficCones.createParallelParking as jasmine.Spy).and.throwError('Some error');
            spyOn(console, 'error');

            await component.initParallelParkingScene();

            expect(console.error).toHaveBeenCalledWith('Error initialization of the ParallelParking scene:');
        });
    });

});

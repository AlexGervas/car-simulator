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
import * as CANNON from 'cannon-es';

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

    describe('initGarageScene', () => {
        beforeEach(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createGarage'], {
                cones: [1, 2, 3]
            });
            spyOn(component['coneStateService'], 'initializeConeStates');
        });

        it('should reset flags and initialize garage scene', async () => {
            await component.initGarageScene();

            expect(component.exerciseStarted).toBeFalse();
            expect(component.checkDialogShown).toBeFalse();
            expect(component.stoppedOnce).toBeFalse();
            expect(component['isCheckingConditions']).toBeFalse();
            expect(component.trafficCones.createGarage).toHaveBeenCalled();
            expect(component['coneStateService'].initializeConeStates).toHaveBeenCalledWith(3);
        });

        it('should catch and log errors during garage scene initialization', async () => {
            (component.trafficCones.createGarage as jasmine.Spy).and.throwError('Garage error');
            spyOn(console, 'error');

            await component.initGarageScene();

            expect(console.error).toHaveBeenCalledWith('Error initialization of the Garage scene');
        });

    });

    describe('initSteepGradeScene', () => {
        let bridgeComponentRefMock: any;

        beforeEach(() => {
            component.scene = {} as THREE.Scene;
            component.world = {} as CANNON.World;

            bridgeComponentRefMock = {
                instance: {
                    createBridge: jasmine.createSpy('createBridge').and.returnValue(Promise.resolve()),
                    hasCrossedBridge: true,
                    isOnBridge: true,
                    outOfBounds: true,
                    hasPassedByBridge: true
                }
            };

            component.dynamicComponents = jasmine.createSpyObj('ViewContainerRef', ['createComponent']);
            (component.dynamicComponents.createComponent as jasmine.Spy).and.returnValue(bridgeComponentRefMock);

            spyOn(component['componentFactoryResolver'], 'resolveComponentFactory').and.returnValue({} as any);
        });

        it('should create bridge component and initialize bridge scene', async () => {
            component.bridgeComponentInstance = undefined;

            await component.initSteepGradeScene();

            expect(component.dynamicComponents.createComponent).toHaveBeenCalled();
            expect(bridgeComponentRefMock.instance.createBridge).toHaveBeenCalled();

            expect(bridgeComponentRefMock.instance.scene).toBe(component.scene);
            expect(bridgeComponentRefMock.instance.world).toBe(component.world);

            expect(bridgeComponentRefMock.instance.hasCrossedBridge).toBeFalse();
            expect(bridgeComponentRefMock.instance.isOnBridge).toBeFalse();
            expect(bridgeComponentRefMock.instance.outOfBounds).toBeFalse();
            expect(bridgeComponentRefMock.instance.hasPassedByBridge).toBeFalse();
        });

        it('should assign bridge instance to carComponent if present', async () => {
            component.bridgeComponentInstance = {
                createBridge: jasmine.createSpy().and.returnValue(Promise.resolve()),
                hasCrossedBridge: true,
                isOnBridge: true,
                outOfBounds: true,
                hasPassedByBridge: true
            } as any;
            component.carComponent = { bridge: null } as any;

            await component.initSteepGradeScene();

            expect(component.bridgeComponentInstance).toBeDefined();
            expect(component.carComponent.bridge).toBe(component.bridgeComponentInstance!);
        });

        it('should log an error if bridge instance creation failed', async () => {
            (component.dynamicComponents.createComponent as jasmine.Spy).and.returnValue({ instance: null });
            spyOn(console, 'error');

            component.bridgeComponentInstance = undefined;
            await component.initSteepGradeScene();

            expect(console.error).toHaveBeenCalledWith('BridgeComponent instance not created.');
        });

    });

    describe('Game control methods', () => {
        describe('startGame', () => {
            it('should reset isGameOver and disable controls', () => {
                component.isGameOver = true;
                component.controlsEnabled = true;

                component.startGame();

                expect(component.isGameOver).toBeFalse();
                expect(component.controlsEnabled).toBeFalse();
            });
        });

        describe('resetGameState', () => {
            beforeEach(() => {
                component.carBody = {} as any;
                component.world = jasmine.createSpyObj('World', ['removeBody']);
                component.dialog = jasmine.createSpyObj('MatDialog', ['closeAll']);

                component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['resetCones', 'clearParkingLines']);
                component.coneStateService = jasmine.createSpyObj('ConeStateService', ['resetConeState']);

                component.bridgeComponentInstance = {
                    hasCrossedBridge: true,
                    isOnBridge: true,
                    outOfBounds: true,
                    hasPassedByBridge: true
                } as any;

                component.carComponent = {
                    currentSpeed: 5,
                    finalHeight: 1.5,
                    resetCarPosition: jasmine.createSpy(),
                    createPhysicsCarBody: jasmine.createSpy(),
                    createPhysicsWheels: jasmine.createSpy(),
                    scaleFactor: 1,
                    vehicle: {
                        wheelInfos: [{ deltaRotation: 3 }, { deltaRotation: 4 }]
                    }
                } as any;
            });

            it('should reset game flags, car state, cone and bridge state', () => {
                component.resetGameState();

                expect(component.isGameOver).toBeFalse();
                expect(component.isMovingForward).toBeFalse();
                expect(component.isMovingBackward).toBeFalse();
                expect(component.hitConeCount).toBe(0);
                expect(component.checkDialogShown).toBeFalse();
                expect(component.stoppedOnce).toBeFalse();
                expect(component.isCheckingConditions).toBeFalse();
                expect(component.isResultDialogShown).toBeFalse();
                expect(component.temporaryBlockDialog).toBeFalse();

                expect(component.coneStateService.resetConeState).toHaveBeenCalled();
                expect(component.trafficCones.resetCones).toHaveBeenCalled();
                expect(component.world.removeBody).toHaveBeenCalledWith(component.carBody);
                expect(component.dialog.closeAll).toHaveBeenCalled();

                expect(component.carComponent.currentSpeed).toBe(0);
                expect(component.carComponent.resetCarPosition).toHaveBeenCalled();
                expect(component.carComponent.createPhysicsCarBody).toHaveBeenCalledWith(component.carComponent.finalHeight);
                expect(component.carComponent.createPhysicsWheels).toHaveBeenCalledWith(component.carComponent.scaleFactor);
                expect(component.carComponent.vehicle.wheelInfos[0].deltaRotation).toBe(0);
                expect(component.carComponent.vehicle.wheelInfos[1].deltaRotation).toBe(0);

                expect(component.bridgeComponentInstance!.hasCrossedBridge).toBeFalse();
                expect(component.bridgeComponentInstance!.isOnBridge).toBeFalse();
                expect(component.bridgeComponentInstance!.outOfBounds).toBeFalse();
                expect(component.bridgeComponentInstance!.hasPassedByBridge).toBeFalse();
            });
        });

        describe('goToNextLevel', () => {
            beforeEach(() => {
                component.resetGameState = jasmine.createSpy();
                component.coneStateService = jasmine.createSpyObj('ConeStateService', ['resetConeState']);
                component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['clearParkingLines']);
                component.router = jasmine.createSpyObj('Router', ['navigate']);
                component.route = {} as ActivatedRoute;
            });

            it('should go to the next level if available', async () => {
                component.currentLevel = 'snake';
                const nextLevel = 'garage';

                component.levelService = jasmine.createSpyObj('LevelService', ['getNextLevel', 'isNextLevelAvailable']);
                (component.levelService.getNextLevel as jasmine.Spy).and.returnValue(nextLevel);
                (component.levelService.isNextLevelAvailable as jasmine.Spy).and.returnValue(true);

                await component.goToNextLevel();

                expect(component.resetGameState).toHaveBeenCalled();
                expect(component.coneStateService.resetConeState).toHaveBeenCalled();
                expect(component.trafficCones.clearParkingLines).toHaveBeenCalled();
                expect(component.router.navigate).toHaveBeenCalledWith([], {
                    relativeTo: component.route,
                    queryParams: { level: nextLevel },
                    queryParamsHandling: 'merge'
                });
            });

            it('should not go to the next level if unavailable', async () => {
                component.levelService = jasmine.createSpyObj('LevelService', ['getNextLevel', 'isNextLevelAvailable']);
                (component.levelService.getNextLevel as jasmine.Spy).and.returnValue(null);
                (component.levelService.isNextLevelAvailable as jasmine.Spy).and.returnValue(false);

                await component.goToNextLevel();

                expect(component.resetGameState).not.toHaveBeenCalled();
                expect(component.router.navigate).not.toHaveBeenCalled();
            });

        });

    });

});

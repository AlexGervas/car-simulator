import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
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
import { RendererFactoryService } from '../../../core/services/renderer-factory.service';

describe('SimulatorComponent', () => {
    let component: SimulatorComponent;
    let fixture: ComponentFixture<SimulatorComponent>;

    class MockWebGLRenderer {
        domElement = document.createElement('canvas');
        setSize() { }
        setPixelRatio() { }
        render() { }
        dispose() { }
        setClearColor() { }
        getContext() {
            return {};
        }
    }

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
                { 
                    provide: DeviceService, 
                    useValue: mockDeviceService 
                },
                {
                    provide: RendererFactoryService,
                    useValue: {
                        createRenderer: () => new MockWebGLRenderer(),
                    },
                },
                ApiService,
                LevelService,
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
        it('should call initSnakeScene when level is snake', fakeAsync(() => {
            spyOn(component, 'initSnakeScene').and.returnValue(Promise.resolve());
            component.initLevel('snake');
            tick();
            expect(component.initSnakeScene).toHaveBeenCalled();
        }));

        it('should call initParallelParkingScene when level is parallel-parking', fakeAsync(() => {
            spyOn(component, 'initParallelParkingScene').and.returnValue(Promise.resolve());
            component.initLevel('parallel-parking');
            tick();
            expect(component.initParallelParkingScene).toHaveBeenCalled();
        }));

        it('should call initGarageScene when level is garage', fakeAsync(() => {
            spyOn(component, 'initGarageScene').and.returnValue(Promise.resolve());
            component.initLevel('garage');
            tick();
            expect(component.initGarageScene).toHaveBeenCalled();
        }));

        it('should call initSteepGradeScene for unknown level', fakeAsync(() => {
            spyOn(component, 'initSteepGradeScene').and.returnValue(Promise.resolve());
            component.initLevel('unknown-level');
            tick();
            expect(component.initSteepGradeScene).toHaveBeenCalled();
        }));
    });

    describe('clearLevelScene', () => {
        it('should call removeCones, clearConeStates, and removeStopLine', fakeAsync(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['removeCones']);
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'clearConeStates');
            const stopLineServiceSpy = spyOn(component['stopLineService'], 'removeStopLine');

            component['clearLevelScene']();
            tick();

            expect(component.trafficCones.removeCones).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalled();
            expect(stopLineServiceSpy).toHaveBeenCalled();
        }));
    });

    describe('initSnakeScene', () => {
        it('should create snake cones and initialize cone states', fakeAsync(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createSnake'], { cones: [1, 2, 3] });
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'initializeConeStates');

            component.initSnakeScene();
            tick();

            expect(component.trafficCones.createSnake).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalledWith(3);
        }));

        it('should catch and log errors during snake scene initialization', fakeAsync(() => {
            const error = new Error('Failure');

            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createSnake'], { cones: [] });

            (component.trafficCones.createSnake as jasmine.Spy).and.rejectWith(error);

            spyOn(console, 'error');

            component.initSnakeScene();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error when initializing Snake scene:', error);
        }));
    });

    describe('initParallelParkingScene', () => {
        beforeEach(() => {
            component.scene = {} as THREE.Scene;
        });

        it('should initialize properties and call createParallelParking and initializeConeStates', fakeAsync(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createParallelParking'], { cones: [1, 2] });
            const coneStateServiceSpy = spyOn(component['coneStateService'], 'initializeConeStates');

            component.initParallelParkingScene();
            tick();

            expect(component.exerciseStarted).toBeFalse();
            expect(component.checkDialogShown).toBeFalse();
            expect(component.stoppedOnce).toBeFalse();
            expect(component['isCheckingConditions']).toBeFalse();
            expect(component.trafficCones.createParallelParking).toHaveBeenCalled();
            expect(coneStateServiceSpy).toHaveBeenCalledWith(2);
        }));

        it('should reject if scene is not initialized', fakeAsync(() => {
            component.scene = undefined as any;
            tick();
            expectAsync(component.initParallelParkingScene()).toBeRejectedWith('Scene is not initialized');
        }));

        it('should handle error during createParallelParking', fakeAsync(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createParallelParking'], { cones: [1] });
            (component.trafficCones.createParallelParking as jasmine.Spy).and.throwError('Some error');
            spyOn(console, 'error');

            component.initParallelParkingScene();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error initialization of the ParallelParking scene:');
        }));
    });

    describe('initGarageScene', () => {
        beforeEach(() => {
            component.trafficCones = jasmine.createSpyObj('TrafficConesComponent', ['createGarage'], {
                cones: [1, 2, 3]
            });
            spyOn(component['coneStateService'], 'initializeConeStates');
        });

        it('should reset flags and initialize garage scene', fakeAsync(() => {
            component.initGarageScene();
            tick();

            expect(component.exerciseStarted).toBeFalse();
            expect(component.checkDialogShown).toBeFalse();
            expect(component.stoppedOnce).toBeFalse();
            expect(component['isCheckingConditions']).toBeFalse();
            expect(component.trafficCones.createGarage).toHaveBeenCalled();
            expect(component['coneStateService'].initializeConeStates).toHaveBeenCalledWith(3);
        }));

        it('should catch and log errors during garage scene initialization', fakeAsync(() => {
            (component.trafficCones.createGarage as jasmine.Spy).and.throwError('Garage error');
            spyOn(console, 'error');

            component.initGarageScene();
            tick();

            expect(console.error).toHaveBeenCalledWith('Error initialization of the Garage scene');
        }));

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

        it('should create bridge component and initialize bridge scene', fakeAsync(() => {
            component.bridgeComponentInstance = undefined;

            component.initSteepGradeScene();
            tick();

            expect(component.dynamicComponents.createComponent).toHaveBeenCalled();
            expect(bridgeComponentRefMock.instance.createBridge).toHaveBeenCalled();

            expect(bridgeComponentRefMock.instance.scene).toBe(component.scene);
            expect(bridgeComponentRefMock.instance.world).toBe(component.world);

            expect(bridgeComponentRefMock.instance.hasCrossedBridge).toBeFalse();
            expect(bridgeComponentRefMock.instance.isOnBridge).toBeFalse();
            expect(bridgeComponentRefMock.instance.outOfBounds).toBeFalse();
            expect(bridgeComponentRefMock.instance.hasPassedByBridge).toBeFalse();
        }));

        it('should assign bridge instance to carComponent if present', fakeAsync(() => {
            component.bridgeComponentInstance = {
                createBridge: jasmine.createSpy().and.returnValue(Promise.resolve()),
                hasCrossedBridge: true,
                isOnBridge: true,
                outOfBounds: true,
                hasPassedByBridge: true
            } as any;
            component.carComponent = { bridge: null } as any;

            component.initSteepGradeScene();
            tick();

            expect(component.bridgeComponentInstance).toBeDefined();
            expect(component.carComponent.bridge).toBe(component.bridgeComponentInstance!);
        }));

        it('should log an error if bridge instance creation failed', fakeAsync(() => {
            (component.dynamicComponents.createComponent as jasmine.Spy).and.returnValue({ instance: null });
            spyOn(console, 'error');

            component.bridgeComponentInstance = undefined;
            component.initSteepGradeScene();
            tick();

            expect(console.error).toHaveBeenCalledWith('BridgeComponent instance not created.');
        }));

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

            it('should go to the next level if available', fakeAsync(() => {
                component.currentLevel = 'snake';
                const nextLevel = 'garage';

                component.levelService = jasmine.createSpyObj('LevelService', ['getNextLevel', 'isNextLevelAvailable']);
                (component.levelService.getNextLevel as jasmine.Spy).and.returnValue(nextLevel);
                (component.levelService.isNextLevelAvailable as jasmine.Spy).and.returnValue(true);

                component.goToNextLevel();
                tick();

                expect(component.resetGameState).toHaveBeenCalled();
                expect(component.coneStateService.resetConeState).toHaveBeenCalled();
                expect(component.trafficCones.clearParkingLines).toHaveBeenCalled();
                expect(component.router.navigate).toHaveBeenCalledWith([], {
                    relativeTo: component.route,
                    queryParams: { level: nextLevel },
                    queryParamsHandling: 'merge'
                });
            }));

            it('should not go to the next level if unavailable', fakeAsync(() => {
                component.levelService = jasmine.createSpyObj('LevelService', ['getNextLevel', 'isNextLevelAvailable']);
                (component.levelService.getNextLevel as jasmine.Spy).and.returnValue(null);
                (component.levelService.isNextLevelAvailable as jasmine.Spy).and.returnValue(false);

                component.goToNextLevel();
                tick();

                expect(component.resetGameState).not.toHaveBeenCalled();
                expect(component.router.navigate).not.toHaveBeenCalled();
            }));

        });

    });

    describe('initSceneAndWorld', () => {
        it('should initialize the scene and world correctly', () => {
            component.initSceneAndWorld();
            expect(component.scene).toBeDefined();
            expect(component.world).toBeDefined();
            expect(component.camera).toBeDefined();
            expect(component.renderer).toBeDefined();
            expect(component.scene.background).toEqual(new THREE.Color(0xc0c0c0));
            expect(component.world.gravity).toEqual(new CANNON.Vec3(0, -9.82, 0));
        });

        it('should set up the camera position correctly', () => {
            component.initSceneAndWorld();
            expect(component.camera.position).toEqual(new THREE.Vector3(0, 2, 5));
        });

        it('should add lights to the scene', () => {
            component.initSceneAndWorld();
            const ambientLight = component.scene.children.find(child => child instanceof THREE.AmbientLight);
            const directionalLight = component.scene.children.find(child => child instanceof THREE.DirectionalLight);
            expect(ambientLight).toBeDefined();
            expect(directionalLight).toBeDefined();
        });
    });

    describe('animatePhysics', () => {
        beforeEach(() => {
            component.car = {
                position: new THREE.Vector3(),
                quaternion: new THREE.Quaternion()
            } as any;

            component.carBody = {
                position: new CANNON.Vec3(1, 2, 3),
                quaternion: new CANNON.Quaternion(0, 0, 0, 1)
            } as any;

            component.world = jasmine.createSpyObj('CANNON.World', ['step']);

            component.trafficCones = {
                coneBodies: [],
                getCones: () => []
            } as any;
        });

        it('should step the physics world and sync car transform', () => {
            component.animatePhysics(1 / 60);

            const args = (component.world.step as jasmine.Spy).calls.mostRecent().args;
            expect(args[0]).toBeCloseTo(1 / 60);

            expect(component.car.position.x).toBeCloseTo(1);
            expect(component.car.position.y).toBeCloseTo(2);
            expect(component.car.position.z).toBeCloseTo(3);

            expect(component.car.quaternion.x).toBeCloseTo(0);
            expect(component.car.quaternion.y).toBeCloseTo(0);
            expect(component.car.quaternion.z).toBeCloseTo(0);
            expect(component.car.quaternion.w).toBeCloseTo(1);
        });

        it('should not throw if car or carBody are missing', () => {
            component.car = undefined!;
            component.carBody = undefined!;

            expect(() => component.animatePhysics(1 / 60)).not.toThrow();
        });
    });

    describe('animate', () => {
        let rafSpy: jasmine.Spy;
        let frameExecuted = false;

        beforeEach(() => {
            frameExecuted = false;

            rafSpy = spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback): number => {
                if (!frameExecuted) {
                    frameExecuted = true;
                    cb(0);
                }
                return 0;
            });

            component.clock = new THREE.Clock();
            spyOn(component, 'animatePhysics');
            spyOn(component.carComponent, 'updateCarPosition');
            spyOn(component, 'updateCameraPosition');
            component.scene = new THREE.Scene();
            component.camera = new THREE.PerspectiveCamera();
            component.renderer = jasmine.createSpyObj('WebGLRenderer', ['render']);
        });

        afterEach(() => {
            rafSpy.and.stub();
        });

        it('should schedule the next animation frame and update the scene', () => {
            component.animate();

            expect(rafSpy).toHaveBeenCalled();
            expect(component.animatePhysics).toHaveBeenCalled();
            expect(component.carComponent.updateCarPosition).toHaveBeenCalledWith(
                jasmine.any(Number),
                {
                    isMovingForward: component.isMovingForward,
                    isMovingBackward: component.isMovingBackward,
                    isTurningLeft: component.isTurningLeft,
                    isTurningRight: component.isTurningRight,
                    isGameOver: component.isGameOver,
                }
            );
            expect(component.updateCameraPosition).toHaveBeenCalled();
            expect(component.renderer.render).toHaveBeenCalledWith(component.scene, component.camera);
        });
    });

    describe('updateCameraPosition', () => {
        beforeEach(() => {
            component.camera = new THREE.PerspectiveCamera();
            component.car = new THREE.Object3D();
        });

        it('should update the camera position based on the car position and offset', () => {
            component.car.position.set(1, 1, 1);

            component.updateCameraPosition();

            const expectedPosition = new THREE.Vector3(1, 1, 1).add(new THREE.Vector3(0, 2, 5));
            expect(component.camera.position).toEqual(expectedPosition);
        });

        it('should do nothing if car is undefined', () => {
            component.car = undefined!;
            component.camera = jasmine.createSpyObj('camera', ['lookAt', 'position']);

            expect(() => component.updateCameraPosition()).not.toThrow();
        });

        it('should position camera correctly and look at the expected point based on car direction', () => {
            const mockCar = new THREE.Object3D();
            mockCar.position.set(1, 0, 2);

            spyOn(mockCar, 'getWorldDirection').and.callFake((target: THREE.Vector3) => {
                target.set(0, 0, -1);
                return target;
            });

            const mockCamera = new THREE.PerspectiveCamera();
            const lookAtSpy = spyOn(mockCamera, 'lookAt');

            component.car = mockCar;
            component.camera = mockCamera;

            component.updateCameraPosition();

            expect(mockCamera.position.x).toBeCloseTo(1);
            expect(mockCamera.position.y).toBeCloseTo(2);
            expect(mockCamera.position.z).toBeCloseTo(7);

            expect(lookAtSpy).toHaveBeenCalled();
        });

    });


});

import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { SimulatorComponent } from './simulator.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
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
import { AuthService } from '../../../core/services/auth.service';

describe('SimulatorComponent', () => {
    let component: SimulatorComponent;
    let fixture: ComponentFixture<SimulatorComponent>;
    let mockTrafficCones: any;
    let mockConeStateService: any;
    let mockConeBody: any;

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
        isTelegramEnv: () => true,
        getTelegramUser: () => ({
            userId: 784002330,
            username: "alex_gervas",
            userfirstname: "Alexandra",
            userlastname: "Gervas"
        })
    };

    const mockAuthService = {
        loginWithTelegram: jasmine.createSpy('loginWithTelegram').and.returnValue(of({ token: 'mockToken', user: {} })),
        setUser: jasmine.createSpy('setUser'),
        getToken: jasmine.createSpy('getToken').and.returnValue('mockToken')
    }

    const mockUserService = {
        loadUserFromApi: jasmine.createSpy('loadUserFromApi').and.returnValue(of({})),
        getUser: jasmine.createSpy('getUser').and.returnValue(null)
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
                    provide: AuthService,
                    useValue: mockAuthService
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

    describe('ngOnInit', () => {
        it('should login with Telegram user if in Telegram environment', async () => {
            spyOn(mockTelegramService, 'isTelegramEnv').and.returnValue(true);
            spyOn(mockTelegramService, 'getTelegramUser').and.returnValue({
                userId: 784002330,
                username: "alex_gervas",
                userfirstname: '',
                userlastname: ''
            });
            mockAuthService.loginWithTelegram.and.returnValue(of({ token: 'mockToken' }));
            await component.ngOnInit();
            expect(mockAuthService.loginWithTelegram).toHaveBeenCalledWith(784002330);
        });

        it('should not call loginWithTelegram if in Telegram environment but user is missing', async () => {
            spyOn(mockTelegramService, 'isTelegramEnv').and.returnValue(true);
            spyOn(mockTelegramService, 'getTelegramUser').and.returnValue(null as any);
            mockAuthService.loginWithTelegram.calls.reset();

            await component.ngOnInit();

            expect(mockAuthService.loginWithTelegram).not.toHaveBeenCalled();
        });

        it('should load user from API if not in Telegram environment and user is null', async () => {
            spyOn(mockTelegramService, 'isTelegramEnv').and.returnValue(false);

            (component as any).userService = mockUserService;

            mockUserService.getUser.and.returnValue(null);
            mockUserService.loadUserFromApi.and.returnValue(of({ id: 1, username: 'web_user' }));

            await component.ngOnInit();

            expect(mockUserService.loadUserFromApi).toHaveBeenCalled();
            expect(component.user).toEqual(jasmine.objectContaining({ username: 'web_user' }));
        });

        it('should handle loginWithTelegram error gracefully', async () => {
            spyOn(mockTelegramService, 'isTelegramEnv').and.returnValue(true);
            spyOn(mockTelegramService, 'getTelegramUser').and.returnValue({
                userId: 784002330,
                username: 'alex_gervas',
                userfirstname: '',
                userlastname: ''
            });
            mockAuthService.loginWithTelegram.and.returnValue(
                throwError(() => new Error('Telegram login failed'))
            );

            const consoleErrorSpy = spyOn(console, 'error');
            await component.ngOnInit();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Telegram login failed:',
                jasmine.any(Error)
            );
        });

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

    describe('checkCollisionWithCones', () => {
        let carPosition: CANNON.Vec3;

        beforeEach(() => {
            mockConeBody = {
                position: new CANNON.Vec3(0, 0, 0),
                applyImpulse: jasmine.createSpy('applyImpulse')
            };

            mockTrafficCones = {
                coneBodies: [mockConeBody],
                getCones: jasmine.createSpy('getCones').and.returnValue([{}]),
                getInitialConePositions: jasmine.createSpy('getInitialConePositions').and.returnValue([new CANNON.Vec3(0, 0, 0)])
            };

            mockConeStateService = {
                isConeFallen: jasmine.createSpy('isConeFallen').and.returnValue(false),
                setConeFallen: jasmine.createSpy('setConeFallen')
            };

            (component as any).trafficCones = mockTrafficCones;
            (component as any).coneStateService = mockConeStateService;
            (component as any).hitConeCount = 0;

            carPosition = new CANNON.Vec3(0, 0, 0);
        });

        it('should do nothing if the cone is too far away', () => {
            mockConeBody.position = new CANNON.Vec3(3, 0, 0);

            (component as any).checkCollisionWithCones(carPosition);

            expect((component as any).hitConeCount).toBe(0);
            expect(mockConeStateService.setConeFallen).not.toHaveBeenCalled();
            expect(mockConeBody.applyImpulse).not.toHaveBeenCalled();
        });

        it('should to increase the counter, mark the cone as fallen and apply an impulse if the cone is close and has moved sufficiently', () => {
            mockConeBody.position = new CANNON.Vec3(1, 0, 0);
            mockTrafficCones.getInitialConePositions.and.returnValue([new CANNON.Vec3(0, 0, 0)]);

            (component as any).checkCollisionWithCones(carPosition);

            expect((component as any).hitConeCount).toBe(1);
            expect(mockConeStateService.setConeFallen).toHaveBeenCalledWith(0);
            expect(mockConeBody.applyImpulse).toHaveBeenCalled();
        });

        it('should not change the state if the cone is close, but the shift is too small', () => {
            mockConeBody.position = new CANNON.Vec3(0.05, 0, 0);
            mockTrafficCones.getInitialConePositions.and.returnValue([new CANNON.Vec3(0, 0, 0)]);

            (component as any).checkCollisionWithCones(carPosition);

            expect((component as any).hitConeCount).toBe(0);
            expect(mockConeStateService.setConeFallen).not.toHaveBeenCalled();
            expect(mockConeBody.applyImpulse).not.toHaveBeenCalled();
        });

        it('should not apply momentum if the cone has already fallen', () => {
            mockConeStateService.isConeFallen.and.returnValue(true);
            mockConeBody.position = new CANNON.Vec3(1, 0, 0);

            (component as any).checkCollisionWithCones(carPosition);

            expect((component as any).hitConeCount).toBe(0);
            expect(mockConeStateService.setConeFallen).not.toHaveBeenCalled();
            expect(mockConeBody.applyImpulse).not.toHaveBeenCalled();
        });

        it('should handle several cones correctly', () => {
            const secondConeBody = {
                position: new CANNON.Vec3(1, 0, 0),
                applyImpulse: jasmine.createSpy('applyImpulse')
            };
            mockTrafficCones.coneBodies = [mockConeBody, secondConeBody];
            mockTrafficCones.getCones.and.returnValue([{}, {}]);
            mockTrafficCones.getInitialConePositions.and.returnValue([
                new CANNON.Vec3(0, 0, 0),
                new CANNON.Vec3(0, 0, 0)
            ]);
            mockConeStateService.isConeFallen.and.returnValues(false, false);
            secondConeBody.position = new CANNON.Vec3(1, 0, 0);
            mockConeBody.position = new CANNON.Vec3(3, 0, 0);
            (component as any).checkCollisionWithCones(carPosition);
            expect((component as any).hitConeCount).toBe(1);
            expect(secondConeBody.applyImpulse).toHaveBeenCalled();
        });

        it('should calculate the direction of the impulse from the machine to the cone', () => {
            mockConeBody.position = new CANNON.Vec3(1, 0, 0);
            mockTrafficCones.getInitialConePositions.and.returnValue([new CANNON.Vec3(0, 0, 0)]);
            (component as any).checkCollisionWithCones(new CANNON.Vec3(0, 0, 0));
            const impulseArg = mockConeBody.applyImpulse.calls.mostRecent().args[0];
            expect(impulseArg.x).toBeGreaterThan(0);
            expect(impulseArg.y).toBeCloseTo(0.5, 5);
        });

    });

    describe('checkGameOverConditions', () => {
        beforeEach(() => {
            spyOn(component as any, 'handleSnakeLevelGameOver');
            spyOn(component as any, 'handleParkingLevelGameOver');
            spyOn(component as any, 'handleSteepGradeLevelGameOver');
        });

        it('should call handleSnakeLevelGameOver if level - snake', () => {
            (component as any).currentLevel = 'snake';
            (component as any).checkGameOverConditions();
            expect((component as any).handleSnakeLevelGameOver).toHaveBeenCalled();
        });

        it('should call handleParkingLevelGameOver if level - parallel-parking', () => {
            (component as any).currentLevel = 'parallel-parking';
            (component as any).checkGameOverConditions();
            expect((component as any).handleParkingLevelGameOver).toHaveBeenCalled();
        });

        it('should call handleParkingLevelGameOver if level - garage', () => {
            (component as any).currentLevel = 'garage';
            (component as any).checkGameOverConditions();
            expect((component as any).handleParkingLevelGameOver).toHaveBeenCalled();
        });

        it('should call handleSteepGradeLevelGameOver if level - steep-grade', () => {
            (component as any).currentLevel = 'steep-grade';
            (component as any).checkGameOverConditions();
            expect((component as any).handleSteepGradeLevelGameOver).toHaveBeenCalled();
        });
    });

    describe('handleSnakeLevelGameOver', () => {
        let mockDialog: jasmine.Spy;
        let mockApi: any;

        beforeEach(() => {
            mockDialog = jasmine.createSpy('openDialog');
            mockApi = { completeLevel: jasmine.createSpy('completeLevel').and.returnValue({ subscribe: jasmine.createSpy() }) };

            (component as any).trafficCones = {
                getConeBoxes: () => [{ max: { z: 20 } }]
            };
            (component as any).carComponent = { car: { position: { z: 5 } } };
            (component as any).hitConeCount = 2;
            (component as any).dialogService = { openDialog: mockDialog };
            (component as any).api = mockApi;
            (component as any).user = { userId: 123 };
            (component as any).currentLevel = 'snake';
            (component as any).levelService = {
                loadLevels: jasmine.createSpy('loadLevels').and.returnValue(Promise.resolve()),
                isNextLevelAvailable: jasmine.createSpy('isNextLevelAvailable').and.returnValue(true)
            };
            (component as any).userService = {
                getUser: jasmine.createSpy('getUser').and.returnValue({ userId: 123 }),
                loadUserFromApi: jasmine.createSpy('loadUserFromApi')
            };
        });

        it('should end the game if the car has crossed the stop line', () => {
            (component as any).hitConeCount = 2;
            (component as any).handleSnakeLevelGameOver();
            expect(mockDialog).toHaveBeenCalledWith('Игра окончена', jasmine.stringMatching(/сбили 2 конусов/), false);
            expect((component as any).isGameOver).toBeTrue();
        });

        it('should not cause completeLevel if more than 0 cones are knocked down', () => {
            (component as any).handleSnakeLevelGameOver();
            expect(mockApi.completeLevel).not.toHaveBeenCalled();
        });

        it('should call completeLevel if 0 cones are knocked down', () => {
            (component as any).hitConeCount = 0;
            (component as any).handleSnakeLevelGameOver();
            expect(mockApi.completeLevel).toHaveBeenCalledWith(123, 'snake');
        });
    });

    describe('handleParkingLevelGameOver', () => {
        beforeEach(() => {
            (component as any).checkDialogShown = false;
            (component as any).exerciseStarted = false;
            (component as any).shouldShowCheckDialog = jasmine.createSpy('shouldShowCheckDialog').and.returnValue(true);
            (component as any).showCheckDialog = jasmine.createSpy('showCheckDialog');
        });

        it('should start the exercise while moving forward', () => {
            (component as any).isMovingForward = true;
            (component as any).isMovingBackward = false;
            (component as any).handleParkingLevelGameOver();
            expect((component as any).exerciseStarted).toBeTrue();
        });

        it('should start the exercise while moving backwards', () => {
            (component as any).isMovingForward = false;
            (component as any).isMovingBackward = true;
            (component as any).handleParkingLevelGameOver();
            expect((component as any).exerciseStarted).toBeTrue();
        });

        it('should call showCheckDialog if the machine has stopped, the exercise has started and checkDialogShown = false', () => {
            (component as any).isMovingForward = false;
            (component as any).isMovingBackward = false;
            (component as any).exerciseStarted = true;
            (component as any).handleParkingLevelGameOver();
            expect((component as any).showCheckDialog).toHaveBeenCalled();
        });
    });

    describe('handleSteepGradeLevelGameOver', () => {
        let mockDialog: jasmine.Spy;
        let mockApi: any;

        beforeEach(() => {
            mockDialog = jasmine.createSpy('openDialog');
            mockApi = { completeLevel: jasmine.createSpy('completeLevel').and.returnValue({ subscribe: jasmine.createSpy() }) };

            (component as any).dialogService = { openDialog: mockDialog };
            (component as any).api = mockApi;
            (component as any).user = { userId: 123 };
            (component as any).currentLevel = 'steep-grade';
            (component as any).levelService = {
                loadLevels: jasmine.createSpy('loadLevels').and.returnValue(Promise.resolve())
            };
            (component as any).userService = {
                getUser: jasmine.createSpy('getUser').and.returnValue({ userId: 123 }),
                loadUserFromApi: jasmine.createSpy('loadUserFromApi')
            };
        });

        it('should complete the game with success if the bridge is passed', () => {
            (component as any).currentLevel = 'steep-grade';
            (component as any).bridgeComponentInstance = { hasCrossedBridge: true };
            (component as any).handleSteepGradeLevelGameOver();
            expect(mockDialog).toHaveBeenCalledWith('Поздравляем!', jasmine.any(String), false);
            expect(mockApi.completeLevel).toHaveBeenCalledWith(123, 'steep-grade');
        });

        it('should end the game with an error if you left the bridge', () => {
            (component as any).bridgeComponentInstance = { outOfBounds: true };
            (component as any).handleSteepGradeLevelGameOver();
            expect(mockDialog).toHaveBeenCalledWith('Задание не выполнено', jasmine.stringMatching(/вышли за пределы/), false);
        });

        it('should end the game with an error if the car has passed the bridge', () => {
            (component as any).bridgeComponentInstance = { hasPassedByBridge: true };
            (component as any).handleSteepGradeLevelGameOver();
            expect(mockDialog).toHaveBeenCalledWith('Задание не выполнено', jasmine.stringMatching(/проехала мимо/), false);
        });
    });

    describe('shouldShowCheckDialog', () => {
        beforeEach(() => {
            (component as any).trafficCones = {
                checkCarInsideParkingPocket: jasmine.createSpy('checkCarInsideParkingPocket').and.returnValue({ preciseMatch: false, nearMatch: false })
            };
            (component as any).exerciseStarted = true;
            (component as any).checkDialogShown = false;
            (component as any).isCheckingConditions = false;
            (component as any).temporaryBlockDialog = false;
            (component as any).isResultDialogShown = false;
        });

        it('should return false if checkDialogShown = true', () => {
            (component as any).checkDialogShown = true;
            expect((component as any).shouldShowCheckDialog()).toBeFalse();
        });

        it('should return false if exercise if started', () => {
            (component as any).exerciseStarted = false;
            expect((component as any).shouldShowCheckDialog()).toBeFalse();
        });

        it('should return true if preciseMatch = true', () => {
            (component as any).trafficCones.checkCarInsideParkingPocket.and.returnValue({ preciseMatch: true, nearMatch: false });
            expect((component as any).shouldShowCheckDialog()).toBeTrue();
        });

        it('should return true if nearMatch = true', () => {
            (component as any).trafficCones.checkCarInsideParkingPocket.and.returnValue({ preciseMatch: false, nearMatch: true });
            expect((component as any).shouldShowCheckDialog()).toBeTrue();
        });

        it('should return false if both values are false', () => {
            expect((component as any).shouldShowCheckDialog()).toBeFalse();
        });
    });

    describe('showCheckDialog', () => {
        let afterClosedSubject: Subject<boolean>;

        beforeEach(() => {
            afterClosedSubject = new Subject<boolean>();
            (component as any).dialogService = {
                openDialogWithRef: jasmine.createSpy('openDialogWithRef').and.returnValue({
                    afterClosed: () => afterClosedSubject.asObservable()
                })
            };
            spyOn(window as any, 'setInterval').and.callFake((fn: Function) => {
                fn();
                return 123;
            });
            spyOn(window, 'clearInterval');
            (component as any).startParkingCheck = jasmine.createSpy('startParkingCheck');
        });

        it('should call startParkingCheck if the result is true', () => {
            (component as any).showCheckDialog();
            afterClosedSubject.next(true);
            expect((component as any).startParkingCheck).toHaveBeenCalled();
        });

        it('should temporarily block the dialog if the result is false', () => {
            (component as any).showCheckDialog();
            afterClosedSubject.next(false);
            expect((component as any).temporaryBlockDialog).toBeTrue();
        });
    });

    describe('startParkingCheck', () => {
        beforeEach(() => {
            jasmine.clock().install();
            (component as any).trafficCones = {
                checkCarInsideParkingPocket: jasmine.createSpy('checkCarInsideParkingPocket').and.returnValue({ preciseMatch: true, nearMatch: false })
            };
            (component as any).api = {
                completeLevel: jasmine.createSpy('completeLevel').and.returnValue(of({}))
            };
            (component as any).dialogService = { openDialog: jasmine.createSpy('openDialog') };
            (component as any).levelService = {
                loadLevels: jasmine.createSpy('loadLevels').and.returnValue(Promise.resolve()),
                isNextLevelAvailable: jasmine.createSpy('isNextLevelAvailable').and.returnValue(true)
            };
            (component as any).user = { userId: 123 };
            (component as any).currentLevel = 'parallel-parking';
            (component as any).hitConeCount = 0;
            (component as any).isCheckingConditions = false;
            (component as any).car = { rotation: { y: 0 } };
            (component as any).ensureUser$ = jasmine.createSpy('ensureUser$').and.returnValue(of({ userId: 123 }));
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('should leave immediately if the check is already underway', () => {
            (component as any).isCheckingConditions = true;
            (component as any).startParkingCheck();
            expect((component as any).isCheckingConditions).toBeTrue();
            expect((component as any).dialogService.openDialog).not.toHaveBeenCalled();
        });

        it('should show a successful dialog when parking correctly', fakeAsync(() => {
            (component as any).startParkingCheck();
            jasmine.clock().tick(2000);
            tick(200);

            expect((component as any).ensureUser$).toHaveBeenCalled();
            expect((component as any).api.completeLevel).toHaveBeenCalledWith(123, 'parallel-parking');
            expect((component as any).dialogService.openDialog).toHaveBeenCalledWith('Поздравляем!', 'Задание выполнено', false);
            expect((component as any).levelService.loadLevels).toHaveBeenCalledWith(123);
            expect((component as any).isNextLevel).toBeTrue();
        }));

        it('should show an error message if the car has hit a cone', () => {
            (component as any).hitConeCount = 1;
            (component as any).trafficCones.checkCarInsideParkingPocket.and.returnValue({ preciseMatch: true, nearMatch: false });
            (component as any).startParkingCheck();
            jasmine.clock().tick(2000);
            expect((component as any).dialogService.openDialog).toHaveBeenCalledWith(
                'Задание не выполнено',
                jasmine.stringMatching(/Машина задела 1 конус/),
                false
            );
            expect((component as any).api.completeLevel).not.toHaveBeenCalled();
        });

        it('should show a warning if car is not inside parking pocket', () => {
    (component as any).hitConeCount = 0;
            (component as any).trafficCones.checkCarInsideParkingPocket
                .and.returnValue({ preciseMatch: false, nearMatch: false });

            (component as any).startParkingCheck();
            jasmine.clock().tick(2000);

            expect((component as any).dialogService.openDialog).toHaveBeenCalledWith(
                'Задание не выполнено',
                jasmine.stringMatching(/Машина не находится в парковочном кармане/),
                false
            );
        });

        it('should show "near match" message if car is near pocket', () => {
            (component as any).hitConeCount = 0;
            (component as any).trafficCones.checkCarInsideParkingPocket
                .and.returnValue({ preciseMatch: false, nearMatch: true });

            (component as any).startParkingCheck();
            jasmine.clock().tick(2000);

            expect((component as any).dialogService.openDialog).toHaveBeenCalledWith(
                'Задание не выполнено',
                jasmine.stringMatching(/не точно в кармане/),
                false
            );
        });

        it('should include rotation error for non-parallel car', () => {
            (component as any).hitConeCount = 0;
            (component as any).car.rotation.y = 0.5;
            (component as any).trafficCones.checkCarInsideParkingPocket
                .and.returnValue({ preciseMatch: true, nearMatch: false });

            (component as any).startParkingCheck();
            jasmine.clock().tick(2000);

            expect((component as any).dialogService.openDialog).toHaveBeenCalledWith(
                'Задание не выполнено',
                jasmine.stringMatching(/Машина не параллельна конусам/),
                false
            );
        });
    });

    describe('createStopLine', () => {
        beforeEach(() => {
            (component as any).trafficCones = {
                getConeBoxes: jasmine.createSpy('getConeBoxes').and.returnValue([{ max: { z: 10 } }])
            };
            (component as any).stopLineComponent = {
                createStopLine: jasmine.createSpy('createStopLine').and.returnValue(Promise.resolve())
            };
        });

        it('should successfully create a stop line', async () => {
            await expectAsync((component as any).createStopLine()).toBeResolved();
        });

        it('should reject the promise if there are no cones', async () => {
            (component as any).trafficCones.getConeBoxes.and.returnValue([]);
            await expectAsync((component as any).createStopLine()).toBeRejectedWithError('No cones available to create stop line.');
        });
    });

    describe('Steering and Keyboard Controls', () => {
        let component: SimulatorComponent;
        let carComponentMock: any;

        beforeEach(() => {
            carComponentMock = {
                updateFrontWheels: jasmine.createSpy('updateFrontWheels')
            };

            component = new SimulatorComponent(
                {} as any, {} as any, {} as any, {} as any,
                {} as any, {} as any, {} as any, {} as any,
                {} as any, {} as any, {} as any, {} as any,
                {} as any, {} as any, {} as any, {} as any
            );
            (component as any).carComponent = carComponentMock;
            component.isGameOver = false;
            component.car = {} as any;
        });

        it('should switch the flags correctly when pressing ArrowLeft and ArrowRight sequentially', () => {
            component.handleKeyboardEvent({ key: 'ArrowLeft' } as KeyboardEvent);
            expect(component.isTurningLeft).toBeTrue();
            expect(component.isTurningRight).toBeFalse();
            expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(true, false);

            component.handleKeyboardEvent({ key: 'ArrowRight' } as KeyboardEvent);
            expect(component.isTurningLeft).toBeFalse();
            expect(component.isTurningRight).toBeTrue();
            expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, true);
        });

        describe('turnLeft / stopTurningLeft', () => {
            it('should enable left turn and call updateFrontWheels', () => {
                component.turnLeft();
                expect(component.isTurningLeft).toBeTrue();
                expect(component.isTurningRight).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(true, false);
            });

            it('should stop turning left and call updateFrontWheels', () => {
                component.isTurningLeft = true;
                component.stopTurningLeft();
                expect(component.isTurningLeft).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, false);
            });
        });

        describe('turnRight / stopTurningRight', () => {
            it('should enable right turn and call updateFrontWheels', () => {
                component.turnRight();
                expect(component.isTurningRight).toBeTrue();
                expect(component.isTurningLeft).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, true);
            });

            it('should stop turning right and call updateFrontWheels', () => {
                component.isTurningRight = true;
                component.stopTurningRight();
                expect(component.isTurningRight).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, false);
            });
        });

        describe('handleKeyboardEvent', () => {
            it('should start moving forward at ArrowUp', () => {
                component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
                expect(component.isMovingForward).toBeTrue();
            });

            it('should start moving backwards at ArrowDown', () => {
                component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
                expect(component.isMovingBackward).toBeTrue();
            });

            it('should turn left at ArrowLeft', () => {
                component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
                expect(component.isTurningLeft).toBeTrue();
                expect(component.isTurningRight).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(true, false);
            });

            it('should turn right at ArrowRight', () => {
                component.handleKeyboardEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
                expect(component.isTurningRight).toBeTrue();
                expect(component.isTurningLeft).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, true);
            });
        });

        describe('handleKeyUpEvent', () => {
            it('should stop moving forward when releasing the ArrowUp', () => {
                component.isMovingForward = true;
                component.handleKeyUpEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
                expect(component.isMovingForward).toBeFalse();
            });

            it('should stop moving backwards when releasing ArrowDown', () => {
                component.isMovingBackward = true;
                component.handleKeyUpEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
                expect(component.isMovingBackward).toBeFalse();
            });

            it('should reset both rotations when releasing ArrowLeft', () => {
                component.isTurningLeft = true;
                component.handleKeyUpEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
                expect(component.isTurningLeft).toBeFalse();
                expect(component.isTurningRight).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, false);
            });

            it('should reset both rotations when releasing ArrowRight', () => {
                component.isTurningRight = true;
                component.handleKeyUpEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
                expect(component.isTurningLeft).toBeFalse();
                expect(component.isTurningRight).toBeFalse();
                expect(carComponentMock.updateFrontWheels).toHaveBeenCalledWith(false, false);
            });
        });
    });

});

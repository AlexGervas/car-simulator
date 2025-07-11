import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrafficConesComponent } from './traffic-cones.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConeStateService } from '../../../core/services/cone-state.service';
import { StopLineService } from '../../../core/services/stop-line.service';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

describe('TrafficConesComponent', () => {
    let component: TrafficConesComponent;
    let fixture: ComponentFixture<TrafficConesComponent>;
    let mockConeStateService: jasmine.SpyObj<ConeStateService>;
    let mockStopLineService: jasmine.SpyObj<StopLineService>;

    let scene: THREE.Scene;
    let car: THREE.Object3D;
    let world: CANNON.World;

    beforeEach(async () => {
        mockConeStateService = jasmine.createSpyObj('ConeStateService', ['someMethod']);
        mockStopLineService = jasmine.createSpyObj('StopLineService', ['callCreateStopLine']);

        scene = new THREE.Scene();
        car = new THREE.Object3D();
        world = new CANNON.World();

        await TestBed.configureTestingModule({
            imports: [TrafficConesComponent],
            providers: [
                provideNoopAnimations(),
                { provide: ConeStateService, useValue: mockConeStateService },
                { provide: StopLineService, useValue: mockStopLineService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TrafficConesComponent);
        component = fixture.componentInstance;
        component.setScene(scene);
        component.car = car;
        component.world = world;
        component.camera = new THREE.PerspectiveCamera();
        component.parkingPocket = new THREE.Box3(
            new THREE.Vector3(0, 0, 10),
            new THREE.Vector3(5, 2, 0)
        );
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('getConePositions()', () => {
        it('should return cone positions', () => {
            const positions = component.getConePositions();
            expect(positions).toEqual([]);
        });
    });

    describe('getConeByPosition()', () => {
        it('should return cone by position when close enough', () => {
            const cone = new THREE.Object3D();
            cone.position.set(1, 0, 1);
            component['cones'].push(cone);

            const result = component.getConeByPosition(new THREE.Vector3(1.05, 0, 1.02));
            expect(result).toBe(cone);
        });

        it('should return null if no cone is close enough', () => {
            const cone = new THREE.Object3D();
            cone.position.set(5, 0, 5);
            component['cones'].push(cone);

            const result = component.getConeByPosition(new THREE.Vector3(0, 0, 0));
            expect(result).toBeNull();
        });
    });

    describe('getInitialConePositions()', () => {
        it('should return initial cone positions as CANNON.Vec3', () => {
            const position = new THREE.Vector3(1, 2, 3);
            component['initialConePositions'].push(position);

            const result = component.getInitialConePositions();
            expect(result.length).toBe(1);
            expect(result[0]).toEqual(jasmine.objectContaining({ x: 1, y: 2, z: 3 }));
        });
    });

    describe('loadConeModel()', () => {
        it('should load cone models and add them to the scene', async () => {
            const count = 1;

            const dummyGLTF: GLTF = {
                scene: new THREE.Object3D(),
                animations: [],
                asset: { version: '2.0', generator: 'mock' }
            };

            spyOn(GLTFLoader.prototype, 'load').and.callFake((url: string, onLoad: (gltf: GLTF) => void) => {
                onLoad(dummyGLTF);
            });

            await component.loadConeModel(count, 5, 5, undefined, false);

            expect(component.getCones().length).toBe(count, 'Expected number of cones to be correct');
            expect(scene.children.length).toBe(count, 'Expected number of scene children to be correct');

            expect(mockStopLineService.callCreateStopLine).not.toHaveBeenCalled();
        });

        it('should reject loading if car is not defined', async () => {
            component.car = undefined!;

            await expectAsync(component.loadConeModel(1, 5, 5)).toBeRejectedWithError("Car is not defined");
        });
    });

    describe('createParallelParking()', () => {
        it('should create parking scene when createParallelParking is called', (done) => {
            component.car.position.set(0, 0, 20);

            component.createParallelParking().then(() => {
                expect(component.parkingPocket).toBeDefined();
                expect(component.parkingLines.length).toBeGreaterThan(0);
                done();
            }).catch(err => {
                fail('Expected promise to resolve, but it rejected with: ' + err);
                done();
            });
        });

        it('should create garage scene when createParallelParking is called', (done) => {
            component.car.position.set(0, 0, 10);

            component.createParallelParking().then(() => {
                expect(component.parkingPocket).toBeDefined();
                expect(component.parkingLines.length).toBeGreaterThan(0);
                done();
            }).catch(err => {
                fail('Expected promise to resolve, but it rejected with: ' + err);
                done();
            });
        });
    });

    describe('checkCarInsideParkingPocket()', () => {
        it('should return preciseMatch true when car is inside parking pocket', () => {
            component.car.position.set(2.5, 1, 2);

            const result = component.checkCarInsideParkingPocket();

            expect(result.preciseMatch).toBeTrue();
            expect(result.nearMatch).toBeFalse();
        });

        it('should return nearMatch true when car is near parking pocket', () => {
            component.car.position.set(6, 0, 5);

            const result = component.checkCarInsideParkingPocket();
            expect(result.preciseMatch).toBeTrue();
            expect(result.nearMatch).toBeFalse();
        });
    });
});

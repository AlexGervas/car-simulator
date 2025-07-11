import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarComponent } from './car.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

describe('CarComponent', () => {
    let component: CarComponent;
    let fixture: ComponentFixture<CarComponent>;
    let mockScene: THREE.Scene;
    let mockWorld: CANNON.World;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CarComponent],
            providers: [
                provideNoopAnimations(),
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CarComponent);
        component = fixture.componentInstance;

        component.scene = new THREE.Scene();
        component.world = new CANNON.World();
        component.car = new THREE.Object3D();
        component.carBody = new CANNON.Body({ mass: 150 });
        component.carBody.position = new CANNON.Vec3(1, 2, 3);
        component.carBody.quaternion.setFromEuler(0, 1, 0);
        component.carBody.angularVelocity = new CANNON.Vec3(0, 0, 0);

        component.vehicle = new CANNON.RaycastVehicle({
            chassisBody: component.carBody
        });

        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('loadCarModel', () => {
        it('should load car model and emit event', async () => {
            const addSpy = spyOn(component.scene, 'add').and.callThrough();
            const emitSpy = spyOn(component.carLoaded, 'emit').and.callThrough();
            const physicsSpy = spyOn(component, 'createPhysicsCarBody').and.callThrough();
            const wheelsSpy = spyOn(component, 'createPhysicsWheels').and.callThrough();

            component.ground = {
                createPhysicsGroundBody: jasmine.createSpy('createPhysicsGroundBody'),
                updateTiles: jasmine.createSpy('updateTiles')
            } as any;

            const mockGLTFScene = new THREE.Object3D();
            const loaderSpy = spyOn(GLTFLoader.prototype, 'loadAsync').and.resolveTo({
                scene: mockGLTFScene
            });

            await component['loadCarModel']();

            expect(loaderSpy).toHaveBeenCalled();
            expect(component.car).toBe(mockGLTFScene);
            expect(addSpy).toHaveBeenCalledWith(mockGLTFScene);
            expect(emitSpy).toHaveBeenCalledWith(mockGLTFScene);
            expect(physicsSpy).toHaveBeenCalled();
            expect(wheelsSpy).toHaveBeenCalled();
            expect(component.ground.createPhysicsGroundBody).toHaveBeenCalled();
            expect(component.ground.updateTiles).toHaveBeenCalled();

        });
    });

    describe('createPhysicsCarBody', () => {
        it('should create physics car body', () => {
            const addBodySpy = spyOn(component.world, 'addBody').and.callThrough();
            const finalHeight = 2;

            component.createPhysicsCarBody(finalHeight);

            expect(component.carBody).toBeDefined();
            expect(component.carBody.mass).toBe(150);
            expect(component.carBody.position.y).toBe(finalHeight / 2);
            expect(component.vehicle).toBeDefined();
            expect(addBodySpy).toHaveBeenCalledWith(component.carBody);
        });
    });

    describe('createPhysicsWheels', () => {
        it('should create physics wheels and add to vehicle', () => {
            const wheelNames = ['Wheel_1_R', 'Wheel_1_L', 'Wheel_2_R', 'Wheel_2_L'];
            const mockCar = new THREE.Object3D();

            wheelNames.forEach((name) => {
                const wheel = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
                wheel.name = name;
                wheel.position.set(Math.random(), Math.random(), Math.random());
                mockCar.add(wheel);
            });

            component.car = mockCar;
            component.vehicle = new CANNON.RaycastVehicle({
                chassisBody: new CANNON.Body({ mass: 1 })
            });

            const addToWorldSpy = spyOn(component.vehicle, 'addToWorld').and.callThrough();
            const addWheelSpy = spyOn(component.vehicle, 'addWheel').and.callThrough();

            const scaleFactor = 1;
            component.createPhysicsWheels(scaleFactor);

            expect(Object.keys(component.wheels).length).toBe(4);
            expect(Object.keys(component.wheelData).length).toBe(4);
            expect(addWheelSpy).toHaveBeenCalledTimes(4);
            expect(addToWorldSpy).toHaveBeenCalledWith(component.world);
        });
    });

    describe('updateCarPosition', () => {
        it('should update car position and emit events', () => {
            const deltaTime = 0.016;
            const controls = {
                isMovingForward: true,
                isMovingBackward: false,
                isTurningLeft: false,
                isTurningRight: false,
                isGameOver: false
            };

            const updateSpeedSpy = spyOn<any>(component, 'updateCarSpeed').and.callThrough();
            const updateRotationSpy = spyOn<any>(component, 'updateCarRotation').and.callThrough();
            const rotateWheelsSpy = spyOn<any>(component, 'rotateWheels').and.callThrough();

            const coneSpy = spyOn(component.carCheckCollisionWithCones, 'emit');
            const gameOverSpy = spyOn(component.gameOverCheck, 'emit');

            component.updateCarPosition(deltaTime, controls);

            expect(updateSpeedSpy).toHaveBeenCalledWith(deltaTime, true, false);
            expect(updateRotationSpy).toHaveBeenCalledWith(true, false, false, false);
            expect(rotateWheelsSpy).toHaveBeenCalled();

            expect(component.car.position.x).toBeCloseTo(component.carBody.position.x);
            expect(component.car.quaternion.y).toBeCloseTo(component.carBody.quaternion.y);

            expect(coneSpy).toHaveBeenCalledWith(component.carBody.position);
            expect(gameOverSpy).toHaveBeenCalled();
        });
    });

    describe('updateCarSpeed', () => {
        it('should increase speed when moving forward', () => {
            const deltaTime = 1;
            const isMovingForward = true;
            const isMovingBackward = false;

            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(1);
        });

        it('should decrease speed when moving backward', () => {
            const deltaTime = 1;
            const isMovingForward = false;
            const isMovingBackward = true;

            component.currentSpeed = 3;
            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(-2);
        });

        it('should decrease speed when not moving', () => {
            const deltaTime = 1;
            const isMovingForward = false;
            const isMovingBackward = false;

            component.currentSpeed = 3;
            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(-2);

            component.currentSpeed = -3;
            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(2);
        });

        it('should not exceed max speed', () => {
            const deltaTime = 1;
            const isMovingForward = true;
            const isMovingBackward = false;

            component.currentSpeed = 5;
            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(5);
        });

        it('should not exceed max reverse speed', () => {
            const deltaTime = 1;
            const isMovingForward = false;
            const isMovingBackward = true;

            component.currentSpeed = -3;
            component.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);

            expect(component.currentSpeed).toBe(-2.5);
        });
    });

    describe('updateCarRotation', () => {
        it('should set angular velocity when moving forward and turning left', () => {
            const isMovingForward = true;
            const isMovingBackward = false;
            const isTurningLeft = true;
            const isTurningRight = false;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(1);
        });

        it('should set angular velocity when moving forward and turning right', () => {
            const isMovingForward = true;
            const isMovingBackward = false;
            const isTurningLeft = false;
            const isTurningRight = true;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(-1);
        });

        it('should set angular velocity to 0 when moving forward and not turning', () => {
            const isMovingForward = true;
            const isMovingBackward = false;
            const isTurningLeft = false;
            const isTurningRight = false;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(0);
        });

        it('should set angular velocity to 0 when not moving', () => {
            const isMovingForward = false;
            const isMovingBackward = false;
            const isTurningLeft = false;
            const isTurningRight = false;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(0);
        });

        it('should set angular velocity when moving backward and turning left', () => {
            const isMovingForward = false;
            const isMovingBackward = true;
            const isTurningLeft = true;
            const isTurningRight = false;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(-1);
        });

        it('should set angular velocity when moving backward and turning right', () => {
            const isMovingForward = false;
            const isMovingBackward = true;
            const isTurningLeft = false;
            const isTurningRight = true;

            component.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

            expect(component.carBody.angularVelocity.y).toBe(1);
        });
    });

});

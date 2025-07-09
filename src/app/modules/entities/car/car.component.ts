import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GroundComponent } from '../ground/ground.component';
import { BridgeComponent } from '../bridge/bridge.component';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';
import { SimulatorComponent } from '../../pages/simulator/simulator.component';

@Component({
  selector: 'app-car',
  standalone: true,
  imports: [],
  templateUrl: './car.component.html',
  styleUrl: './car.component.css'
})
export class CarComponent implements OnInit {
  @Input() scene!: THREE.Scene;
  @Input() world!: CANNON.World;
  @Input() ground!: GroundComponent;
  @Input() bridge!: BridgeComponent;
  @Input() currentLevel: 'parallel-parking' | 'snake' | 'garage' | 'steep-grade' | null = null;

  @Output() carLoaded = new EventEmitter<THREE.Object3D>();
  @Output() carCheckCollisionWithCones = new EventEmitter<CANNON.Vec3>();
  @Output() gameOverCheck = new EventEmitter<void>();

  public static GROUP_CAR = 1;

  public car!: THREE.Object3D;
  public carBody!: CANNON.Body;
  public vehicle!: CANNON.RaycastVehicle;
  public wheels: Record<string, THREE.Object3D> = {};
  public wheelData: Record<string, { radius: number; position: THREE.Vector3 }> = {};

  public currentSpeed: number = 0;
  private accelerationRate: number = 1;
  private decelerationRate: number = 5;
  private turnRate: number = 1;
  private maxSpeed: number = 5;
  private wheelKeys: string[] = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];

  public finalHeight: number = 0;
  public scaleFactor: number = 0;

  constructor() { }

  async ngOnInit() {
    try {
      await this.loadCarModel();
      console.log('Car model loaded successfully');
    } catch (error) {
      console.error('Error loading car model:', error);
    }
  }

  get position(): CANNON.Vec3 {
    return this.carBody.position;
  }

  private async loadCarModel(): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('models/cars/vw_polo_final.glb');

    this.car = gltf.scene;
    this.car.scale.set(1, 1, 1);
    this.car.position.set(0, 0, 0);
    this.car.rotation.y = Math.PI;

    const box = new THREE.Box3().setFromObject(this.car);
    const size = box.getSize(new THREE.Vector3());
    this.scaleFactor = 1 / Math.max(size.x, size.y, size.z);
    this.car.scale.multiplyScalar(this.scaleFactor * 5);
    this.finalHeight = size.y * this.scaleFactor * 5;

    this.createPhysicsCarBody(this.finalHeight);

    if (this.ground) {
      this.ground.createPhysicsGroundBody();
    } else {
      console.error('GroundComponent is not initialized yet in CarComponent');
    }

    this.createPhysicsWheels(this.scaleFactor);

    this.scene.add(this.car);

    if (this.ground) {
      this.ground.updateTiles();
    }

    this.carLoaded.emit(this.car);
  }

  public createPhysicsCarBody(finalHeight: number): void {
    const carShape = new CANNON.Box(new CANNON.Vec3(0.6, 0.2, 2));
    this.carBody = new CANNON.Body({
      mass: 150,
      position: new CANNON.Vec3(0, finalHeight / 2, 0),
      shape: carShape,
      collisionFilterGroup: CarComponent.GROUP_CAR,
      collisionFilterMask: GroundComponent.GROUP_GROUND | BridgeComponent.GROUP_BRIDGE | TrafficConesComponent.GROUP_CONE
    });
    this.carBody.quaternion.setFromEuler(0, Math.PI, 0);
    this.world.addBody(this.carBody);

    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.carBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2
    });
  }

  public createPhysicsWheels(scaleFactor: number): void {
    this.car.traverse((child) => {
      if (child.name === 'Wheel_1_R') {
        this.wheels['frontRight'] = child;
      } else if (child.name === "Wheel_1_L") {
        this.wheels['frontLeft'] = child;
      } else if (child.name === "Wheel_2_R") {
        this.wheels['backRight'] = child;
      } else if (child.name === "Wheel_2_L") {
        this.wheels['backLeft'] = child;
      }

      if (['Wheel_1_R', 'Wheel_1_L', 'Wheel_2_R', 'Wheel_2_L'].includes(child.name)) {
        const wheelBox = new THREE.Box3().setFromObject(child);
        const wheelSize = wheelBox.getSize(new THREE.Vector3());
        const radius = Math.max(wheelSize.x, wheelSize.y, wheelSize.z) / 2 * scaleFactor * 5;
        this.wheelData[child.name] = {
          radius,
          position: child.position.clone()
        };
      }
    });
    console.log("wheels: ", this.wheels)

    Object.keys(this.wheelData).forEach((wheelName) => {
      const wheel = this.wheelData[wheelName];

      this.vehicle.addWheel({
        chassisConnectionPointLocal: new CANNON.Vec3(wheel.position.x, wheel.position.y, wheel.position.z),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        directionLocal: new CANNON.Vec3(0, -1, 0),
        radius: wheel.radius,
        suspensionRestLength: 0.2,
        suspensionStiffness: 20,
        maxSuspensionForce: 50,
        dampingRelaxation: 1,
        dampingCompression: 20,
        frictionSlip: 20
      });
    });

    this.vehicle.addToWorld(this.world);
  }

  public updateCarPosition(
    deltaTime: number,
    controls: {
      isMovingForward: boolean,
      isMovingBackward: boolean,
      isTurningLeft: boolean,
      isTurningRight: boolean,
      isGameOver: boolean
    }
  ): void {
    const { isMovingForward, isMovingBackward, isTurningLeft, isTurningRight, isGameOver } = controls;
    if (!this.car || !this.carBody || !this.vehicle) {
      console.warn('Car or physics properties not initialized yet');
      return;
    }

    if (isGameOver) return;

    this.updateCarSpeed(deltaTime, isMovingForward, isMovingBackward);
    this.updateCarRotation(isMovingForward, isMovingBackward, isTurningLeft, isTurningRight);

    if (this.currentLevel === 'steep-grade' && this.bridge?.bridgeBody) {
      this.bridge.handleCarOnBridge(this.carBody.position, this.carBody);
    }

    this.car.position.copy(this.carBody.position);
    this.car.quaternion.copy(this.carBody.quaternion);

    this.rotateWheels();

    this.carCheckCollisionWithCones.emit(this.carBody.position);
    this.gameOverCheck.emit();
  }

  public updateCarSpeed(deltaTime: number, isMovingForward: boolean, isMovingBackward: boolean): void {
    const direction = new THREE.Vector3();
    this.car.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const maxReverseSpeed = this.maxSpeed / 2;

    if (isMovingForward) {
      this.currentSpeed += this.accelerationRate * deltaTime;
    } else if (isMovingBackward) {
      this.currentSpeed -= this.decelerationRate * deltaTime;
    } else {
      if (this.currentSpeed > 0) {
        this.currentSpeed -= this.decelerationRate * deltaTime;
      } else if (this.currentSpeed < 0) {
        this.currentSpeed += this.decelerationRate * deltaTime;
      }
    }

    this.currentSpeed = Math.max(-maxReverseSpeed, Math.min(this.currentSpeed, this.maxSpeed));

    const currentVelocity = this.carBody.velocity;
    this.carBody.velocity.set(direction.x * this.currentSpeed, currentVelocity.y, direction.z * this.currentSpeed);

  }

  public updateCarRotation(isMovingForward: boolean, isMovingBackward: boolean, isTurningLeft: boolean, isTurningRight: boolean): void {
    if (isMovingForward || isMovingBackward) {
      const turnDirection = isMovingForward ? 1 : -1;
      if (isTurningLeft) {
        this.carBody.angularVelocity.y = this.turnRate * turnDirection;
      } else if (isTurningRight) {
        this.carBody.angularVelocity.y = -this.turnRate * turnDirection;
      } else {
        this.carBody.angularVelocity.y = 0;
      }
    } else {
      this.carBody.angularVelocity.y = 0;
    }

    const euler = new CANNON.Vec3();
    this.carBody.quaternion.toEuler(euler);
    this.carBody.quaternion.setFromEuler(0, euler.y, 0);
  }

  private rotateWheels(): void {
    this.vehicle.wheelInfos.forEach((wheel, index) => {
      const key = this.wheelKeys[index];
      const wheelObject = this.wheels[key];

      if (wheelObject) {
        const wheelRadius = wheel.radius;
        const speedFactor = Math.abs(this.currentSpeed) / this.maxSpeed;
        const desiredDeltaRotation = (this.currentSpeed / wheelRadius) * (1 / 60);

        if (Math.abs(this.currentSpeed) < 0.1) {
          wheel.deltaRotation = Math.max(0, wheel.deltaRotation - (this.decelerationRate * speedFactor / wheelRadius));
        } else {
          const interpolationFactor = 0.00001;
          wheel.deltaRotation += (desiredDeltaRotation - wheel.deltaRotation) * interpolationFactor;
        }
        wheel.deltaRotation = Math.max(-2, Math.min(2, wheel.deltaRotation));

        const { position } = wheel.worldTransform;
        wheelObject.position.set(position.x, position.y, position.z);
        const rotationAngle = wheel.deltaRotation;
        wheelObject.rotateX(rotationAngle);
      }
    });
  }

  public updateFrontWheels(isTurningLeft: boolean, isTurningRight: boolean) {
    if (this.wheels) {
      const frontWheelAngle = isTurningLeft ? Math.PI / 6 : isTurningRight ? -Math.PI / 6 : 0;
      if (this.wheels['frontLeft']) {
        this.wheels['frontLeft'].rotation.set(0, 0, frontWheelAngle);
      }
      if (this.wheels['frontRight']) {
        this.wheels['frontRight'].rotation.set(0, 0, frontWheelAngle);
      }
    }
  }

  public resetCarPosition(): void {
    this.car.position.set(0, 0, 0);
    this.car.rotation.set(0, Math.PI, 0);
  }

}

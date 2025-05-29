import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit, AfterViewChecked } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrafficConesComponent } from '../../components/traffic-cones/traffic-cones.component';
import { DeviceService } from '../../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { ConeStateService } from '../../../core/services/cone-state.service';
import { StopLineService } from '../../../core/services/stop-line.service';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../../shared/dialog/dialog.component';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { BridgeComponent } from '../../components/bridge/bridge.component';
import { GroundComponent } from '../../components/ground/ground.component';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, LoaderComponent, TrafficConesComponent, BridgeComponent, GroundComponent],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css'
})
export class SimulatorComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('LoaderComponent') loader!: LoaderComponent;
  @ViewChild(TrafficConesComponent, { static: false }) trafficCones!: TrafficConesComponent;
  @ViewChild(BridgeComponent) bridge!: BridgeComponent;
  @ViewChild(GroundComponent) ground!: GroundComponent;

  public static GROUP_CAR = 1;

  public world!: CANNON.World;
  public camera!: THREE.PerspectiveCamera;
  public car!: THREE.Object3D;
  private carBody!: CANNON.Body;
  private vehicle!: CANNON.RaycastVehicle;
  public scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;

  private currentSpeed: number = 0;
  private accelerationRate: number = 1;
  private decelerationRate: number = 5;
  private turnRate: number = 1;
  private maxSpeed: number = 5;
  private wheelKeys: string[] = ['frontLeft', 'frontRight', 'backLeft', 'backRight'];

  private turnSpeed: number = 1;
  public hitConeCount: number = 0;
  public conesPassed: number = 0;
  private frontWheelAngle: number = 0;
  private finalHeight: number = 0;
  private scaleFactor: number = 0;

  public isMovingForward: boolean = false;
  public isMovingBackward: boolean = false;
  private isTurningLeft: boolean = false;
  private isTurningRight: boolean = false;
  public isMobileDevice: boolean = false;
  private isConeFallen: boolean = false;
  public isGameOver: boolean = false;
  private controlsEnabled: boolean = false;

  public exerciseStarted: boolean = false;
  public checkDialogShown: boolean = false;
  public stoppedOnce: boolean = false;
  public temporaryBlockDialog: boolean = false;
  public isResultDialogShown: boolean = false;

  private currentLevel: 'parallel-parking' | 'snake' | 'garage' | 'steep-grade' | null = null;
  private wheels: Record<string, THREE.Object3D> = {};
  private wheelData: Record<string, { radius: number; position: THREE.Vector3 }> = {};
  private clock!: THREE.Clock;

  private stopCheckTimeout: number | null = null;
  private isCheckingConditions: boolean = false;

  constructor(private el: ElementRef,
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private coneStateService: ConeStateService,
    private stopLineService: StopLineService,
    private modelsLoaderService: ModelsLoaderService,
    private dialog: MatDialog) { }

  async ngOnInit() {
    this.modelsLoaderService.show();
    this.isMobileDevice = this.deviceService.isMobile();
    this.clock = new THREE.Clock();
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.init();

    try {
      this.car = await this.loadCarModel();
      console.log("Car is loaded!", this.car);
    } catch (error) {
      console.error("Car loading error", error);
      this.modelsLoaderService.hide();
      return;
    }

    if (this.ground) {
      this.ground.loadGroundModel();
    } else {
      console.error('GroundComponent is not initialized yet');
    }

    this.route.queryParams.subscribe(params => {
      const level = params['level'] || 'snake';
      this.currentLevel = level;
      console.log("Level: ", this.currentLevel);

      const checkTrafficCones = setInterval(() => {
        if (this.trafficCones) {
          this.trafficCones.world = this.world;
          clearInterval(checkTrafficCones);
          this.initLevel(level);
        }
      }, 0)
    });

    this.startRenderingLoop();
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  ngAfterViewInit() {
    if (!this.scene) {
      console.error('Error: the scene is not initialized before being passed to TrafficCones');
      return;
    }

    if (this.trafficCones) {
      this.trafficCones.setScene(this.scene);
      this.trafficCones.camera = this.camera;
    } else {
      console.warn("TrafficConesComponent is not yet available in ngAfterViewInit");
    }

    this.stopLineService.setCreateStopLineCallback(this.createStopLine.bind(this));
  }

  ngAfterViewChecked() {
    if (this.trafficCones && this.car && !this.trafficCones.car) {
      setTimeout(() => {
        this.trafficCones.car = this.car;
      });
    }
  }

  private startRenderingLoop() {
    if (!this.car) {
      console.error("Error: Machine not yet loaded in startRenderingLoop");
      return;
    }

    this.animate();
  }

  private initLevel(level: string): Promise<void> {
    this.hitConeCount = 0;
    this.modelsLoaderService.show();
    this.stopLineService.setScene(this.scene);

    return this.clearLevelScene().then(() => {
      if (level === 'snake') {
        return this.initSnakeScene();
      } else if (level === 'parallel-parking') {
        return this.initParallelParkingScene();
      } else if(level === 'garage') {
        return this.initGarageScene();
      } else {
        return this.initSteepGradeScene();
      }
    }).then(() => {
      this.modelsLoaderService.hide();
      console.log(level, ' is loaded');
    }).catch(error => {
      console.error(`Scene ${level} loading error:`, error);
      this.modelsLoaderService.hide();
    });
  }

  private clearLevelScene(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.trafficCones) {
        console.warn("TrafficConesComponent is not yet available in clearLevelScene");
        return resolve();
      }
      this.trafficCones.resetCones();
      this.stopLineService.removeStopLine();
      resolve();
    })
  }

  private initSnakeScene(): Promise<void> {
    console.log('Initializing the Snake scene');
    return this.trafficCones.createSnake().then(() => {
      console.log('The snake scene is ready');
    }).catch(error => {
      console.error('Error when initializing Snake scene:', error);
    });
  }

  private initParallelParkingScene(): Promise<void> {
    this.exerciseStarted = false;
    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;
    
    if (!this.scene) {
      return Promise.reject('Scene is not initialized');
    }

    return this.trafficCones.createParallelParking().then(() => {
      console.log('ParallelParking scene is ready.');
    })
      .catch((error) => {
        console.error('Error initialization of the ParallelParking scene:', error);
      });
  }

  private initGarageScene(): Promise<void> {
    this.exerciseStarted = false;
    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;

    console.log('Initializing the Garage scene');
    return this.trafficCones.createGarage().then(() => {
      console.log('Garage scene is ready.');
    }).catch(error => {
      console.error('Error initialization of the Garage scene:', error);
    });
  }

  private initSteepGradeScene(): Promise<void> {
    return this.bridge.createBridge().then(() => {
      console.log("Bridge model and physics was added!");
    });
  }

  public startGame() {
    this.isGameOver = false;
    this.controlsEnabled = false;
  }

  public restartGame() {
    this.isGameOver = false;
    this.isMovingForward = false;
    this.isMovingBackward = false;
    this.hitConeCount = 0;
    this.coneStateService.resetConeState();
    this.trafficCones.resetCones();
    this.car.position.set(0, 0, 0);
    this.car.rotation.set(0, Math.PI, 0);

    if (this.carBody) {
      this.world.removeBody(this.carBody);
    }
    this.createPhysicsCarBody(this.finalHeight);
    this.currentSpeed = 0;
    this.vehicle.wheelInfos.forEach(wheel => {
      wheel.deltaRotation = 0;
    });
    this.createPhysicsWheels(this.scaleFactor);

    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;
    this.isResultDialogShown = false;
    this.temporaryBlockDialog = false;
    this.dialog.closeAll();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc0c0c0);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.el.nativeElement.querySelector('#webgl-canvas') });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);
  }

  private async loadCarModel(): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load('models/cars/vw_polo_final.glb', (gltf: GLTF) => {
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
        this.ground.createPhysicsGroundBody();
        this.createPhysicsWheels(this.scaleFactor);

        this.scene.add(this.car);
        this.ground.updateTiles();
        resolve(this.car);
      }, undefined, (error) => {
        console.error('Error loading car model:', error);
        reject(error);
      });
    });
  }

  private createPhysicsCarBody(finalHeight: number): void {
    const carShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.3, 2.5));
    this.carBody = new CANNON.Body({ 
      mass: 150, 
      position: new CANNON.Vec3(0, finalHeight / 2, 0), 
      shape: carShape,
      collisionFilterGroup: SimulatorComponent.GROUP_CAR,
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

  private createPhysicsWheels(scaleFactor: number): void {
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

  private animatePhysics(deltaTime: number): void {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, deltaTime, maxSubSteps);

    if (this.carBody) {
      this.car.position.set(this.carBody.position.x, this.carBody.position.y, this.carBody.position.z);
      this.car.quaternion.set(this.carBody.quaternion.x, this.carBody.quaternion.y, this.carBody.quaternion.z, this.carBody.quaternion.w);
    }

    this.trafficCones.coneBodies.forEach((body, index) => {
      const cone = this.trafficCones.getCones()[index];
      cone.position.set(body.position.x, body.position.y, body.position.z);
      cone.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    });
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    const deltaTime = this.clock.getDelta();
    this.animatePhysics(deltaTime);
    this.updateCarPosition(deltaTime);
    this.updateCameraPosition();

    // const cannonDebugger = CannonDebugger(this.scene, this.world, {
    //   color: 0xff0000,
    // });
    // cannonDebugger.update();

    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraPosition() {
    if (this.car) {
      const offset = new THREE.Vector3(0, 2, 5);
      this.camera.position.copy(this.car.position).add(offset);

      const direction = new THREE.Vector3();
      this.car.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      this.camera.lookAt(this.car.position.clone().sub(direction));
    }
  }

  private updateCarPosition(deltaTime: number) {
    if (this.car && !this.isGameOver) {
      const direction = new THREE.Vector3();
      this.car.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const maxReverseSpeed = this.maxSpeed / 4;

      if (this.isMovingForward) {
        this.currentSpeed += this.accelerationRate * deltaTime;
      } else if (this.isMovingBackward) {
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

      if (this.isMovingForward) {
        if (this.isTurningLeft) {
          this.carBody.angularVelocity.y = this.turnRate;
        } else if (this.isTurningRight) {
          this.carBody.angularVelocity.y = -this.turnRate;
        } else {
          this.carBody.angularVelocity.y = 0;
        }
      } else if (this.isMovingBackward) {
        if (this.isTurningLeft) {
          this.carBody.angularVelocity.y = -this.turnRate;
        } else if (this.isTurningRight) {
          this.carBody.angularVelocity.y = this.turnRate;
        } else {
          this.carBody.angularVelocity.y = 0;
        }
      } else {
        this.carBody.angularVelocity.y = 0;
      }

      const euler = new CANNON.Vec3();
      this.carBody.quaternion.toEuler(euler);
      this.carBody.quaternion.setFromEuler(0, euler.y, 0);

      if (this.bridge) {
        const isOnBridge = this.bridge.checkIfOnBridge(this.carBody.position);

        if (isOnBridge) {
          const bridgeHeight = this.bridge.getBridgeHeightAtPosition(this.carBody.position);
          const offsetY = 0.5;
          this.carBody.position.y = bridgeHeight + offsetY;

          const forwardPosition = this.carBody.position.clone();
          forwardPosition.z += 1;
          const forwardHeight = this.bridge.getBridgeHeightAtPosition(forwardPosition);

          const backwardPosition = this.carBody.position.clone();
          backwardPosition.z -= 1;
          const backwardHeight = this.bridge.getBridgeHeightAtPosition(backwardPosition);

          const tiltAngle = Math.atan2(forwardHeight - backwardHeight, 2);
          const tiltQuaternion = new CANNON.Quaternion();
          tiltQuaternion.setFromEuler(tiltAngle, 0, 0);

          const currentRotation = this.carBody.quaternion.clone();
          this.carBody.quaternion = currentRotation.mult(tiltQuaternion);
        }
      }

      this.car.position.copy(this.carBody.position);
      this.car.quaternion.copy(this.carBody.quaternion);

      this.rotateWheels();

      this.checkCollisionWithCones();
      this.checkGameOverConditions();
    }
  }

  private checkCollisionWithCones() {
    const collisionThreshold = 2;
    const positionShiftThreshold = 0.1;

    for (let i = 0; i < this.trafficCones.coneBodies.length; i++) {
      const coneBody = this.trafficCones.coneBodies[i];
      const cone = this.trafficCones.getCones()[i];

      const distance = this.carBody.position.distanceTo(coneBody.position);

      if (distance > collisionThreshold) {
        continue;
      }

      if (!this.coneStateService.isConeFallen(i)) {
        const initialPosition = this.trafficCones.getInitialConePositions()[i];
        const positionShift = coneBody.position.vsub(initialPosition).length();

        if (positionShift > positionShiftThreshold) {
          this.hitConeCount++;
          this.coneStateService.setConeFallen(i);

          const fallDirection = new CANNON.Vec3(
            coneBody.position.x - this.carBody.position.x,
            0.1,
            coneBody.position.z - this.carBody.position.z
          ).unit();

          const impulse = new CANNON.Vec3(fallDirection.x * 0.2, 0.5, fallDirection.z * 0.2);
          coneBody.applyImpulse(impulse, coneBody.position);
        }
      }
    }
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

        const { position, quaternion } = wheel.worldTransform;
        wheelObject.position.set(position.x, position.y, position.z);
        const rotationAngle = wheel.deltaRotation;
        wheelObject.rotateX(rotationAngle);
      }
    });
  }

  private updateFrontWheels() {
    if (this.wheels) {
      const frontWheelAngle = this.isTurningLeft ? Math.PI / 6 : this.isTurningRight ? -Math.PI / 6 : 0;
      if (this.wheels['frontLeft']) {
        this.wheels['frontLeft'].rotation.set(0, 0, frontWheelAngle);
      }
      if (this.wheels['frontRight']) {
        this.wheels['frontRight'].rotation.set(0, 0, frontWheelAngle);
      }
    }
  }

  private checkGameOverConditions() {
    if (this.currentLevel === 'snake') {
      const lastConeBox = this.trafficCones.getConeBoxes()[this.trafficCones.getConeBoxes().length - 1];
      if (lastConeBox) {
        const stopLineZ = Math.floor(lastConeBox.max.z - 8);

        if (this.car.position.z < stopLineZ) {
          this.dialog.open(DialogComponent, {
            width: '300px',
            position: { top: '10%' },
            data: {
              title: 'Игра окончена',
              message: 'Вы проехали стоп-линию и сбили ' + this.hitConeCount + ' конусов.',
              showButtons: false
            }
          })
          this.isGameOver = true;
          this.controlsEnabled = true;
        }
      }
    } else if (this.currentLevel === "parallel-parking" || this.currentLevel === "garage") {
      if (!this.isMovingForward && !this.isMovingBackward) {
        if (this.exerciseStarted && !this.checkDialogShown) {
          if (this.shouldShowCheckDialog()) {
            this.showCheckDialog();
          }
        }
      } else {
        this.exerciseStarted = true;
      }
    }
  }

  private shouldShowCheckDialog(): boolean {
    if (this.checkDialogShown || this.isCheckingConditions || this.temporaryBlockDialog || this.isResultDialogShown) {
      return false;
    }

    if (!this.exerciseStarted) {
      return false;
    }

    const { preciseMatch, nearMatch } = this.trafficCones.checkCarInsideParkingPocket();

    return preciseMatch || nearMatch;
  }

  private showCheckDialog(): void {
    this.checkDialogShown = true;

    const dialogRef = this.dialog.open(DialogComponent, {
      width: '300px',
      position: { top: '10%' },
      data: {
        title: 'Остановились',
        message: 'Можно проверять задание?',
        showButtons: true
      }
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      this.checkDialogShown = false;
      if (result) {
        this.startParkingCheck();
      } else {
        this.stoppedOnce = false;
        this.temporaryBlockDialog = true;

        const interval = setInterval(() => {
          if (this.isMovingForward || this.isMovingBackward) {
            this.temporaryBlockDialog = false;
            clearInterval(interval);
          }
        }, 100);
      }
    });
  }

  private startParkingCheck(): void {
    if (this.isCheckingConditions) {
      return;
    }

    this.isCheckingConditions = true;

    this.stopCheckTimeout = window.setTimeout(() => {
      let errorMessage = "";

      if (this.hitConeCount > 0) {
        errorMessage += `Машина задела ${this.hitConeCount} конус(ы). \n`;
      }

      if (this.currentLevel === 'parallel-parking') {
        const carRotationTolerance = 0.1;
        const carRotation = this.car.rotation.y % (2 * Math.PI);
        const isParallel = Math.abs(carRotation - Math.PI) < carRotationTolerance || Math.abs(carRotation) < carRotationTolerance;
        if (!isParallel) {
          errorMessage += "Машина не параллельна конусам.\n";
        }
      }

      const { preciseMatch, nearMatch } = this.trafficCones.checkCarInsideParkingPocket();
      if (!preciseMatch && nearMatch) {
        errorMessage += "Машина находится не точно в кармане, но допустимо.\n";
      } else if (!preciseMatch) {
        errorMessage += "Машина не находится в парковочном кармане.\n";
      }

      if (errorMessage) {
        this.isResultDialogShown = true;
        this.isGameOver = true;
        this.controlsEnabled = true;
        this.dialog.open(DialogComponent, {
          width: '300px',
          position: { top: '10%' },
          data: {
            title: 'Задание не выполнено',
            message: `${errorMessage} Попробуйте снова.`,
            showButtons: false
          }
        });
      } else {
        this.isResultDialogShown = true;
        this.dialog.open(DialogComponent, {
          width: '300px',
          position: { top: '10%' },
          data: {
            title: 'Поздравляем!',
            message: 'Задание выполнено',
            showButtons: false
          }
        })
      }
      this.isCheckingConditions = false;
    }, 2000);
  }

  private createStopLine(): Promise<void> {
    return new Promise((resolve, reject) => {
      const lastConeIndex = this.trafficCones.getConeBoxes().length - 1;
      const lastConeBox = this.trafficCones.getConeBoxes()[lastConeIndex];

      if (!lastConeBox) {
        reject(new Error('No cones available to create stop line.'));
        return;
      }

      console.log('Creating stop line behind the last cone at z:', lastConeBox.max.z);

      const loader = new GLTFLoader();
      const finishLinePath = 'models/road-elements/finish_line.glb';

      loader.load(finishLinePath, (gltf) => {
        const model = gltf.scene;
        model.position.set(0, lastConeBox.max.y - 0.2, lastConeBox.max.z - 5);
        this.scene.add(model);
        resolve();
      }, undefined, (error) => {
        console.error('The finish line model is not loaded:', error);
        reject(error);
      })

      if (lastConeBox) {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          -7, lastConeBox.max.y - 0.2, lastConeBox.max.z - 5,
          7, lastConeBox.max.y - 0.2, lastConeBox.max.z - 5
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
      }
    });

  }

  public turnLeft() {
    if (this.car) {
      this.car.rotation.y += this.turnSpeed;
      // this.frontWheelAngle += this.turnSpeed; // Увеличиваем угол поворота
      // this.updateFrontWheels(); // Обновляем положение передних колес
    }
  }

  public turnRight() {
    if (this.car) {
      this.car.rotation.y -= this.turnSpeed;
      // this.frontWheelAngle -= this.turnSpeed; // Уменьшаем угол поворота
      // this.updateFrontWheels(); // Обновляем положение передних колес
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isMobileDevice) return;

    if (this.car && !this.isGameOver) {
      if (event.key === 'ArrowUp') {
        this.isMovingForward = true;
      } else if (event.key === 'ArrowDown') {
        this.isMovingBackward = true;
      } else if (event.key === 'ArrowLeft') {
        this.isTurningLeft = true;
        this.isTurningRight = false;
        this.frontWheelAngle = Math.PI / 6;
        this.updateFrontWheels();
      } else if (event.key === 'ArrowRight') {
        this.isTurningRight = true;
        this.isTurningLeft = false;
        this.frontWheelAngle = -Math.PI / 6;
        this.updateFrontWheels();
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUpEvent(event: KeyboardEvent) {
    if (this.isMobileDevice) return;

    if (event.key === 'ArrowUp') {
      this.isMovingForward = false;
    } else if (event.key === 'ArrowDown') {
      this.isMovingBackward = false;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      this.isTurningLeft = false;
      this.isTurningRight = false;
      this.frontWheelAngle = 0;
      this.updateFrontWheels();
    }
  }

  // Управление с мобильного
  preventDefault(event: TouchEvent) {
    event.preventDefault();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobileDevice = this.deviceService.isMobile();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

}

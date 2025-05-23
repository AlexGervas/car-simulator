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

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, LoaderComponent, TrafficConesComponent],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css'
})
export class SimulatorComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('LoaderComponent') loader!: LoaderComponent;
  @ViewChild(TrafficConesComponent, { static: false }) trafficCones!: TrafficConesComponent;

  public camera!: THREE.PerspectiveCamera;
  public car!: THREE.Object3D;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private asphaltTexture!: THREE.Texture;

  private forwardSpeed: number = 0.04;
  private backwardSpeed: number = 0.02;
  private turnSpeed: number = 0.01;
  public hitConeCount: number = 0;
  public conesPassed: number = 0;
  private frontWheelAngle: number = 0;

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

  private currentLevel: 'parallel-parking' | 'snake' | 'garage' | null = null;
  private wheels: Record<string, THREE.Object3D> = {};

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
    this.init();

    try {
      this.car = await this.loadCarModel();
      console.log("Car is loaded!", this.car);
    } catch (error) {
      console.error("Car loading error", error);
      this.modelsLoaderService.hide();
      return;
    }

    this.route.queryParams.subscribe(params => {
      const level = params['level'] || 'snake';
      this.currentLevel = level;
      console.log("Level: ", this.currentLevel);

      const checkTrafficCones = setInterval(() => {
        if (this.trafficCones) {
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
      } else {
        return this.initGarageScene();
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

    this.checkDialogShown = false;
    this.stoppedOnce = false;
    this.isCheckingConditions = false;
    this.isResultDialogShown = false;
    this.temporaryBlockDialog = false;
    this.dialog.closeAll();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.createSceneBackground();

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

  private createSceneBackground() {
    this.scene.background = new THREE.Color(0xc0c0c0);

    const textureLoader = new THREE.TextureLoader();
    this.asphaltTexture = textureLoader.load('textures/asphalt.jpg', () => {
      this.updateTiles();
    })
    this.asphaltTexture.wrapS = THREE.RepeatWrapping;
    this.asphaltTexture.wrapT = THREE.RepeatWrapping;
    this.asphaltTexture.repeat.set(3, 3);


    // const texture = textureLoader.load('textures/snow.jpg', () => {
    //   this.scene.background = texture;
    // });

    // const grassTexture = textureLoader.load('textures/green-grass.jpg');
    // const skyTexture = textureLoader.load('textures/sky.jpg');

    // const grassGeometry = new THREE.PlaneGeometry(100, 100);
    // const grassMaterial = new THREE.MeshBasicMaterial({ map: grassTexture });
    // const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    // grass.rotation.x = -Math.PI / 2;
    // grass.position.y = 0;

    // this.scene.add(grass);

    // const skyGeometry = new THREE.PlaneGeometry(100, 100);
    // const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide });
    // const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    // sky.rotation.x = Math.PI / 2;
    // sky.position.y = 50;

    // this.scene.add(sky);
  }

  private loadCarModel(): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load('models/cars/vw_polo_final.glb', (gltf: GLTF) => {
        this.car = gltf.scene;
        this.car.scale.set(1, 1, 1);
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = Math.PI;

        const box = new THREE.Box3().setFromObject(this.car);
        const size = box.getSize(new THREE.Vector3());
        const scaleFactor = 1 / Math.max(size.x, size.y, size.z);
        this.car.scale.multiplyScalar(scaleFactor * 5);

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
        })
        console.log("wheels: ", this.wheels)

        this.scene.add(this.car);
        this.updateTiles();
        resolve(this.car);
      }, undefined, (error) => {
        console.error('Error loading car model:', error);
        reject(error);
      });
    });
  }

  private createTile(x: number, z: number) {
    const tileGeometry = new THREE.PlaneGeometry(14, 6);
    const tileMaterial = new THREE.MeshBasicMaterial({ map: this.asphaltTexture, side: THREE.DoubleSide });
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0, z);
    this.scene.add(tile);
  }

  private updateTiles() {
    if (!this.car) {
      return;
    }
    const carPositionZ = this.car.position.z;
    const visibleRange = 100;
    const tileSize = 6;

    // Delete old tiles
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry) {
        this.scene.remove(child);
      }
    });

    for (let z = carPositionZ - visibleRange; z < carPositionZ + visibleRange; z += tileSize) {
      this.createTile(0, z);
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.updateCarPosition();
    this.updateCameraPosition();
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

  private updateCarPosition() {
    if (this.car && !this.isGameOver) {
      const direction = new THREE.Vector3();
      this.car.getWorldDirection(direction);
      direction.y = 0;
      direction.normalize();

      const newPosition = this.car.position.clone();
      let distance = 0;

      if (this.isMovingForward) {
        const moveStep = this.forwardSpeed;
        newPosition.add(direction.clone().multiplyScalar(moveStep));
        distance = moveStep;
      } 
      if (this.isMovingBackward) {
        const moveStep = -this.backwardSpeed;
        newPosition.add(direction.clone().multiplyScalar(moveStep));
        distance = moveStep;
      }

      if (this.isMovingForward || this.isMovingBackward) {
        this.car.position.copy(newPosition);
        this.rotateWheels(distance);
      }

      if (this.isMovingForward && this.isTurningLeft) {
        this.car.rotation.y += this.turnSpeed;
      } else if (this.isMovingForward && this.isTurningRight) {
        this.car.rotation.y -= this.turnSpeed;
      }

      if (this.isMovingBackward && this.isTurningLeft) {
        this.car.rotation.y -= this.turnSpeed;
      } else if (this.isMovingBackward && this.isTurningRight) {
        this.car.rotation.y += this.turnSpeed;
      }

      const collisionMargin = -0.8;
      const carBox = new THREE.Box3().setFromObject(this.car).expandByScalar(collisionMargin);

      let collisionDetected = false;

      for (let i = 0; i < this.trafficCones.getConeBoxes().length; i++) {
        const coneBox = this.trafficCones.getConeBoxes()[i];

        if (carBox.intersectsBox(coneBox) && !this.coneStateService.isConeFallen(i)) {
          this.hitConeCount++;
          const cone = this.trafficCones.getCones()[i];

          if (cone) {
            const fallDirection = new THREE.Vector3().subVectors(cone.position, this.car.position).normalize();
            this.trafficCones.animateConeFall(cone, fallDirection);
            this.coneStateService.setConeFallen(i);
          } else {
            console.error('Cone not found at index:', i);
          }
        }
      }

      if (!collisionDetected) {
        this.car.position.copy(newPosition);
      }

      this.checkGameOverConditions();
    }
  }

  private rotateWheels(distance: number): void {
    const rotationAngle = distance / (2 * Math.PI * 0.5);
    if (this.wheels['backLeft']) {
      this.wheels['backLeft'].rotateX(-rotationAngle);
    }
    if (this.wheels['backRight']) {
      this.wheels['backRight'].rotateX(-rotationAngle);
    }
    
    if (this.wheels['frontLeft']) {
      this.wheels['frontLeft'].rotateX(-rotationAngle);
    }
    if (this.wheels['frontRight']) {
      this.wheels['frontRight'].rotateX(-rotationAngle);
    }
  }

  private updateFrontWheels() {
    if (this.wheels) {
      if (this.wheels['frontLeft']) {
        this.wheels['frontLeft'].rotation.x = 0;
        this.wheels['frontLeft'].rotation.y = 0;
        this.wheels['frontLeft'].rotation.z = this.frontWheelAngle;
      }
      if (this.wheels['frontRight']) {
        this.wheels['frontRight'].rotation.x = 0;
        this.wheels['frontRight'].rotation.y = 0;
        this.wheels['frontRight'].rotation.z = this.frontWheelAngle;
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

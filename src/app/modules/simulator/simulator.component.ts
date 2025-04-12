import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit, AfterViewChecked } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';
import { DeviceService } from '../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { ConeStateService } from '../../core/services/cone-state.service';
import { StopLineService } from '../../core/services/stop-line.service';
import { ModelsLoaderService } from '../../core/services/models-loader.service';
import { LoaderComponent } from '../loader/loader.component';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../shared/dialog/dialog.component';

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
  private turnSpeed: number = 0.1;
  public hitConeCount: number = 0;
  public conesPassed: number = 0;

  public isMovingForward: boolean = false;
  public isMovingBackward: boolean = false;
  public isMobileDevice: boolean = false;
  private isConeFallen: boolean = false;
  public isGameOver: boolean = false;
  private controlsEnabled: boolean = false;

  public exerciseStarted: boolean = false;
  public checkDialogShown: boolean = false;
  public stoppedOnce: boolean = false;
  public temporaryBlockDialog: boolean = false;
  public isResultDialogShown: boolean = false;

  private currentLevel: 'parallel-parking' | 'snake' | null = null;
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
      } else {
        return this.initParallelParkingScene();
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
      loader.load('models/cars/vw2.glb', (gltf: GLTF) => {
        this.car = gltf.scene;
        this.car.scale.set(1, 1, 1);
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = Math.PI;
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

      if (this.isMovingForward) {
        newPosition.add(direction.clone().multiplyScalar(this.forwardSpeed));
      }
      if (this.isMovingBackward) {
        newPosition.add(direction.clone().multiplyScalar(-this.backwardSpeed));
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
    } else if (this.currentLevel === "parallel-parking") {
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

      const carRotationTolerance = 0.1;
      const carRotation = this.car.rotation.y % (2 * Math.PI);
      const isParallel = Math.abs(carRotation - Math.PI) < carRotationTolerance || Math.abs(carRotation) < carRotationTolerance;
      if (!isParallel) {
        errorMessage += "Машина не параллельна конусам.\n";
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
    }
  }

  public turnRight() {
    if (this.car) {
      this.car.rotation.y -= this.turnSpeed;
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
        if (this.isMovingForward || this.isMovingBackward) {
          this.car.rotation.y += this.turnSpeed;
        }
      } else if (event.key === 'ArrowRight') {
        if (this.isMovingForward || this.isMovingBackward) {
          this.car.rotation.y -= this.turnSpeed;
        }
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

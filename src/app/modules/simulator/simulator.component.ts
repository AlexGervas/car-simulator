import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DeviceService } from '../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { ConeStateService } from '../../core/services/cone-state.service';
import { StopLineService } from '../../core/services/stop-line.service';
import { ModelsLoaderService } from '../../core/services/models-loader.service';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, LoaderComponent, TrafficConesComponent],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css'
})
export class SimulatorComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('LoaderComponent') loader!: LoaderComponent;
  @ViewChild('TrafficConesComponent', { static: true }) trafficCones!: TrafficConesComponent;

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

  constructor(private el: ElementRef,
    private deviceService: DeviceService,
    private coneStateService: ConeStateService,
    private stopLineService: StopLineService,
    private modelsLoaderService: ModelsLoaderService) { }

  ngOnInit() {
    this.modelsLoaderService.show();
    this.isMobileDevice = this.deviceService.isMobile();
    this.init();
    Promise.all([this.loadCarModel()]).then(() => {
      this.modelsLoaderService.hide();
      console.log("Машина загружена и лоадер скрыт")
    }).catch((error) => {
      console.log("Машина не загружена!!", error)
      this.modelsLoaderService.hide();
    });
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  ngAfterViewInit() {
    if (this.trafficCones) {
      this.trafficCones.setScene(this.scene);
      this.trafficCones.camera = this.camera;
      this.trafficCones.car = this.car;

      this.stopLineService.setCreateStopLineCallback(this.createStopLine.bind(this));

      this.animate();
    } else {
      console.error('TrafficCones is undefined');
    }
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
    this.animate();
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

  private loadCarModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load('models/cars/vw2.glb', (gltf: GLTF) => {
        this.car = gltf.scene;
        this.car.scale.set(1, 1, 1);
        this.car.position.set(0, 0, 0);
        this.car.rotation.y = Math.PI;
        this.scene.add(this.car);
        this.updateTiles();
        resolve();
      }, undefined, (error) => {
        console.error('Error loading car model:', error);
        reject(error);
      });
    });
  }

  private createTile(x: number, z: number) {
    const tileGeometry = new THREE.PlaneGeometry(10, 6);
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

      const collisionMargin = -0.6;
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
          collisionDetected = true;
          break;
        }
      }

      if (!collisionDetected) {
        this.car.position.copy(newPosition);
      }

      this.checkGameOverConditions();
    }
  }

  private checkGameOverConditions() {
    const lastConeBox = this.trafficCones.getConeBoxes()[this.trafficCones.getConeBoxes().length - 1];

    if (lastConeBox) {
      const stopLineZ = Math.floor(lastConeBox.max.z - 5);

      if (this.car.position.z < stopLineZ) {
        alert('Игра окончена! Вы проехали стоп-линию и сбили ' + this.hitConeCount + ' конусов.');
        this.isGameOver = true;
        this.controlsEnabled = true;
      }
    }

  }

  private createStopLine() {
    const lastConeIndex = this.trafficCones.getConeBoxes().length - 1;
    const lastConeBox = this.trafficCones.getConeBoxes()[lastConeIndex];

    if (lastConeBox) {
      console.log('Creating stop line behind the last cone at z:', lastConeBox.max.z);

      const loader = new GLTFLoader();
      const finishLinePath = 'models/road-elements/finish_line.glb';

      loader.load(finishLinePath, (gltf) => {
        const model = gltf.scene;
        model.position.set(0, lastConeBox.max.y - 1, lastConeBox.max.z - 5);
        this.scene.add(model);
      }, undefined, (error) => {
        console.error('The finish line model is not loaded:', error);
      })

      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -7, lastConeBox.max.y - 1, lastConeBox.max.z - 5,
        7, lastConeBox.max.y - 1, lastConeBox.max.z - 5
      ]);

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }
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

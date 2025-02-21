import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DeviceService } from '../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { ConeStateService } from '../../core/services/cone-state.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, TrafficConesComponent],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css'
})
export class SimulatorComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('TrafficConesComponent') trafficCones !: TrafficConesComponent;

  public camera!: THREE.PerspectiveCamera;
  public car!: THREE.Object3D; 
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  // private controls!: OrbitControls;
  private forwardSpeed: number = 0.04;
  private backwardSpeed: number = 0.02;
  private turnSpeed: number = 0.1;

  public isMovingForward: boolean = false;
  public isMovingBackward: boolean = false;
  public isMobileDevice: boolean = false;
  private isConeFallen: boolean = false;
  private isGameOver: boolean = false;
  private controlsEnabled: boolean = false; 

  constructor(private el: ElementRef, private deviceService: DeviceService, private coneStateService: ConeStateService) { }

  ngOnInit() {
    this.isMobileDevice = this.deviceService.isMobile();
    this.init();
    this.loadModel();
    window.addEventListener('resize', this.onWindowResize.bind(this), false);

  //   if (this.isMobileDevice) {
  //     this.controls.enabled = false;
  // }
  }

  ngAfterViewInit() {
    console.log('TrafficConesComponent:', this.trafficCones);
    if (this.trafficCones) {
      this.trafficCones.setScene(this.scene);
      this.trafficCones.camera = this.camera;
      this.trafficCones.car = this.car;
      this.animate();
    } else {
      console.error('TrafficCones is undefined');
    }
  }

  public startGame() {
    this.isGameOver = false;
    this.controlsEnabled = false;
  }

  private init() {
    this.scene = new THREE.Scene();
    this.createSceneBackground();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.el.nativeElement.querySelector('#webgl-canvas') });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    const light = new THREE.AmbientLight(0xffffff, 0.5); 
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    /*this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.rotateSpeed = 0.5;*/
  }

  private createSceneBackground() {
    this.scene.background = new THREE.Color(0xc0c0c0);

    // const textureLoader = new THREE.TextureLoader();
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

  private loadModel() {
    const loader = new GLTFLoader();
    loader.load('cars/vw2.glb', (gltf: GLTF) => {
      this.car = gltf.scene;
      this.car.scale.set(1, 1, 1);
      this.car.position.set(0, 0, 0);
      this.car.rotation.y = Math.PI; 
      this.scene.add(this.car);
    }, undefined, (error) => {
      console.error('Error loading GLTF model:', error);
    });
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    /*if (this.controlsEnabled) {
      this.controls.update();
    }*/
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

      for (let i = 0; i < this.trafficCones.getConeBoxes().length; i++) {
        const coneBox = this.trafficCones.getConeBoxes()[i];

        if (carBox.intersectsBox(coneBox) && !this.coneStateService.isConeFallen()) {
          console.log('Collision detected with cone at index:', i);

          alert('Вы врезались в ' + (i+1) + ' конус!');
          this.coneStateService.setConeFallen(true);
          this.isGameOver = true;
          this.controlsEnabled = true;

          const cone = this.trafficCones.getCones()[i];

          if (cone) {
            console.log('Cone found for falling:', cone);

            const fallDirection = new THREE.Vector3().subVectors(cone.position, this.car.position).normalize();
            this.trafficCones.animateConeFall(cone, fallDirection);
          } else {
            console.error('Cone not found at index:', i);
          }
          return;
        }
      }

      this.car.position.copy(newPosition);
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
  /*
  @HostListener('window:touchstart', ['$event'])
  handleTouchStart(event: TouchEvent) {
    if (this.isMobileDevice && this.car) {
      const touch = event.touches[0];
      if (touch.clientY < window.innerHeight / 2) {
        this.isMovingForward = true;
      } else {
        this.isMovingBackward = true;
      }
    }
  }

  @HostListener('window:touchend', ['$event'])
  handleTouchEnd(event: TouchEvent) {
    if (this.isMobileDevice) {
      this.isMovingForward = false;
      this.isMovingBackward = false;
    }
  }*/

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

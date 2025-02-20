import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [TrafficConesComponent],
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
  private forwardSpeed: number = 0.06;
  private backwardSpeed: number = 0.03;
  private turnSpeed: number = 0.15;

  private isMovingForward: boolean = false;
  private isMovingBackward: boolean = false;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.init();
    this.loadModel();
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
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

  private init() {
    this.scene = new THREE.Scene();
    this.createSceneBackground();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.el.nativeElement.querySelector('#webgl-canvas') });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    const light = new THREE.AmbientLight(0xffffff, 0.5); 
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);
  }

  private createSceneBackground() {
    // this.scene.background = new THREE.Color(0xc0c0c0);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('textures/asphalt.jpg', () => {
      this.scene.background = texture;
    });

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
      console.log('Model loaded successfully:', gltf);

      this.car = gltf.scene;
      this.car.scale.set(1, 1, 1);
      this.car.position.set(0, 0, 0);
      this.car.rotation.y = Math.PI; 
      this.scene.add(this.car);
    }, undefined, (error) => {
      console.error('Error loading GLTF model:', error);
    });
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.updateCarPosition();
    this.renderer.render(this.scene, this.camera);
  }

  private updateCarPosition() {
    if (this.car) {
      const direction = new THREE.Vector3();
      this.car.getWorldDirection(direction);

      if (this.isMovingForward) {
        this.car.position.add(direction.clone().multiplyScalar(this.forwardSpeed));
      }
      if (this.isMovingBackward) {
        this.car.position.add(direction.clone().multiplyScalar(-this.backwardSpeed));
      }

      if (this.isMovingForward) {
        const turnDirection = new THREE.Vector3();
        turnDirection.set(Math.sin(this.car.rotation.y), 0, Math.cos(this.car.rotation.y));
        this.car.position.add(turnDirection.multiplyScalar(this.forwardSpeed * 0.5));
      }

    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.car) {
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
    if (event.key === 'ArrowUp') {
      this.isMovingForward = false;
    } else if (event.key === 'ArrowDown') {
      this.isMovingBackward = false;
    }
  }

  
  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

}

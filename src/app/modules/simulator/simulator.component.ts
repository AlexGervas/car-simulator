import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.css'
})
export class SimulatorComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private car!: THREE.Object3D; 
  private forwardSpeed: number = 0.06;
  private backwardSpeed: number = 0.03;
  private turnSpeed: number = 0.15;

  private isMovingForward: boolean = false;
  private isMovingBackward: boolean = false;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.init();
    this.loadModel();
    // this.createTrafficCones();
    this.animate();

    window.addEventListener('resize', this.onWindowResize.bind(this), false);
  }

  private init() {
    this.scene = new THREE.Scene();
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
  }

  private createTrafficCones() {
    const coneGeometry = new THREE.CylinderGeometry(0, 0.5, 1, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });

    for (let i = 0; i < 10; i++) {
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.set(Math.random() * 10 - 5, 0.5, Math.random() * 10 - 5);
      this.scene.add(cone);
    }
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
        this.car.rotation.y += this.turnSpeed;
      } else if (event.key === 'ArrowRight') {
        this.car.rotation.y -= this.turnSpeed;
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

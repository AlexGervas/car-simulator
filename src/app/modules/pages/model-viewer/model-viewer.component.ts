import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [],
  templateUrl: './model-viewer.component.html',
  styleUrl: './model-viewer.component.css'
})
export class ModelViewerComponent implements OnInit {
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private model!: THREE.Object3D;
  private animationFrameId!: number;

  constructor(private el: ElementRef,) { }

  ngOnInit(): void {
    this.initScene();
    this.loadModel();
    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc0c0c0);

    const container = this.viewerContainer.nativeElement;
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(2, 3, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(0, 10, 0);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const directionalLightRight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLightRight.position.set(10, 5, 10);
    this.scene.add(directionalLightRight);
    const directionalLightLeft = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLightLeft.position.set(-10, 5, 10);
    this.scene.add(directionalLightLeft);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
    this.scene.add(ambientLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private loadModel(): void {
    const loader = new GLTFLoader();
    loader.load('models/cars/vw_polo_final.glb', (gltf: GLTF) => {
      this.model = gltf.scene;
      this.model.scale.set(1, 1, 1);
      this.model.position.set(0, 0, 0);

      const box = new THREE.Box3().setFromObject(this.model);
      const size = box.getSize(new THREE.Vector3());
      const scaleFactor = 1 / Math.max(size.x, size.y, size.z);
      this.model.scale.multiplyScalar(scaleFactor * 6);

      this.scene.add(this.model);
    }, undefined, (error) => {
      console.error('Error loading model:', error);
    });
  }

  private onWindowResize(): void {
    const container = this.viewerContainer.nativeElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

}

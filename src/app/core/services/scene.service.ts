import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { RendererFactoryService } from './renderer-factory.service';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;

  constructor(private rendererFactory: RendererFactoryService) {}

  public init(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xc0c0c0);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = this.rendererFactory.createRenderer(canvas);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const light = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);
  }

  public updateCamera(target: THREE.Object3D): void {
    const offset = new THREE.Vector3(0, 2, 5);
    this.camera.position.copy(target.position).add(offset);

    const direction = new THREE.Vector3();
    target.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    this.camera.lookAt(target.position.clone().sub(direction));
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

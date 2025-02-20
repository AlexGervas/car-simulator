import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';

@Component({
  selector: 'app-traffic-cones',
  standalone: true,
  imports: [],
  templateUrl: './traffic-cones.component.html',
  styleUrl: './traffic-cones.component.css'
})
export class TrafficConesComponent implements OnChanges {
  @Input() camera!: THREE.PerspectiveCamera;
  @Input() car!: THREE.Object3D; 

  private scene!: THREE.Scene;
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['car'] && this.car && this.camera) {
      this.createSnake();
    }
  }

  public setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  private loadConeModel(count: number, spacing: number) {
    const trafficConePath = 'traffic-cone/cone.glb';

    for (let i = 0; i < count; i++) {
      this.loader.load(trafficConePath, (gltf) => {
        const cone = gltf.scene;
        cone.position.set(0, 0, 0);
        this.scene.add(cone);

        const zOffset = (i % 2 === 0) ? 0 : spacing;
        const xPosition = this.car.position.x;
        const zPosition = this.car.position.z + (i * spacing) - (count * spacing / 2);

        cone.position.set(xPosition, 0.5, zPosition);
        cone.rotation.y = Math.PI; 
      }, undefined, (error) => {
        console.error('An error occurred while loading the model:', error);
      });
    }
  }

  public createSnake() {
    if (!this.camera) {
        console.error('Camera is not defined');
        return;
    }

    if (!this.car) {
        console.error('Car is not defined');
        return;
    }

    this.loadConeModel(3, 2);
  }



}

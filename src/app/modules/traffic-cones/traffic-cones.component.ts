import { Component, Input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ConeStateService } from '../../core/services/cone-state.service';
import { StopLineService } from '../../core/services/stop-line.service';

@Component({
  selector: 'app-traffic-cones',
  standalone: true,
  imports: [],
  templateUrl: './traffic-cones.component.html',
  styleUrl: './traffic-cones.component.css'
})
export class TrafficConesComponent {
  @Input() camera!: THREE.PerspectiveCamera;
  @Input() car!: THREE.Object3D;

  public cones: THREE.Object3D[] = [];
  public initialConePositions: THREE.Vector3[] = [];
  private scene!: THREE.Scene;
  private loader: GLTFLoader;
  private conePositions: THREE.Vector3[] = [];

  private coneBoxes: THREE.Box3[] = [];

  constructor(private coneStateService: ConeStateService, private stopLineService: StopLineService) {
    this.loader = new GLTFLoader();
  }

  public getConePositions(): THREE.Vector3[] {
    return this.conePositions;
  }

  public getConeByPosition(position: THREE.Vector3): THREE.Object3D | null {
    for (const cone of this.cones) {
      if (cone.position.distanceTo(position) < 0.1) {
        console.log('Cone found:', cone);
        return cone;
      }
    }
    return null;
  }

  public animateConeFall(cone: THREE.Object3D, fallDirection: THREE.Vector3) {
    cone.position.y = 0;
    cone.rotation.x = Math.PI / 2;
    const angle = Math.atan2(fallDirection.x, fallDirection.z);

    cone.rotation.y = angle;
    cone.position.add(fallDirection.multiplyScalar(1));
  }

  public setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  public loadConeModel(count: number, spacing: number, distanceFromCar: number, positions?: THREE.Vector3[], withStopLine: boolean = true): Promise<void> {
    const trafficConePath = 'models/road-elements/traffic-cone.glb';
    const promises: Promise<void>[] = [];

    if (!this.car) {
      return Promise.reject(new Error("Car is not defined"));
    }

    for (let i = 0; i < count; i++) {
      const promise = new Promise<void>((resolve, reject) => {
        this.loader.load(trafficConePath, (gltf) => {
          const cone = gltf.scene;
          this.scene.add(cone);
          this.cones.push(cone);

          if (!this.car) {
            reject(new Error("Car is not defined after loading cone"));
            return;
          }
          let conePosition: THREE.Vector3;
          if (positions && positions[i]) {
            conePosition = positions[i].clone();
          } else {
            const zPosition = this.car.position.z - distanceFromCar - (i * spacing);
            const xPosition = this.car.position.x;
            conePosition = new THREE.Vector3(xPosition, 0.7, zPosition);
          }

          cone.position.copy(conePosition);
          cone.rotation.y = Math.PI;

          this.initialConePositions.push(cone.position.clone());

          const coneBox = new THREE.Box3().setFromObject(cone);
          this.coneBoxes.push(coneBox);
          resolve();
        }, undefined, (error) => {
          reject(error);
        });
      });
      promises.push(promise);
    }

    return Promise.all(promises).then(() => {
      if (this.cones.length === 0) {
        throw new Error("Cones are not loaded!");
      }
      console.log('All cones loaded');
      if(withStopLine) { 
        this.stopLineService.callCreateStopLine();
      }
    }).catch((error) => {
      console.error('Error loading some cones:', error)
    });
  }

  public getConeBoxes(): THREE.Box3[] {
    return this.coneBoxes;
  }

  public getCones(): THREE.Object3D[] {
    return this.cones;
  }

  public createParallelParking(): Promise<void> {
    console.log('Start Parallel Parking');
    if (!this.car) {
      return Promise.reject("Car not defined");
    }

    const carX = this.car.position.x;
    const carZ = this.car.position.z;

    const offsetX = 2;
    const width = 3;
    const height = 4;

    const topZ = carZ - height;
    const bottomZ = carZ - height - 8;

    const centerZ = (topZ + bottomZ) / 2;

    const positions: THREE.Vector3[] = [
      new THREE.Vector3(carX + offsetX, 0.7, topZ),
      new THREE.Vector3(carX + offsetX + width, 0.7, topZ),

      new THREE.Vector3(carX + offsetX, 0.7, bottomZ),
      new THREE.Vector3(carX + offsetX + width, 0.7, bottomZ),

      new THREE.Vector3(carX + offsetX + width, 0.7, centerZ),
    ];

    return this.loadConeModel(positions.length, 0, 0, positions, false);
  }

  public createSnake(): Promise<void> {
    return this.loadConeModel(5, 15, 15, undefined, true).then(() => {
      if (!this.camera) {
        console.log('Camera is not defined');
        return;
      }
      if (!this.car) {
        console.log('Car is not defined');
        return;
      }
      return this.stopLineService.callCreateStopLine();
    });
  }

  public resetCones() {
    this.cones.forEach((cone, index) => {
      if (this.initialConePositions[index]) {
        cone.position.copy(this.initialConePositions[index]);
        cone.rotation.set(0, Math.PI, 0);
      }
    });
    this.coneStateService.resetConeState();
  }

}

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class TrafficConesComponent implements OnChanges {
  @Input() camera!: THREE.PerspectiveCamera;
  @Input() car!: THREE.Object3D;

  public cones: THREE.Object3D[] = [];
  private scene!: THREE.Scene;
  private loader: GLTFLoader;
  private conePositions: THREE.Vector3[] = [];
  private coneMixers: THREE.AnimationMixer[] = [];

  private coneBoxes: THREE.Box3[] = [];

  constructor(private coneStateService: ConeStateService, private stopLineService: StopLineService) {
    this.loader = new GLTFLoader();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['car'] && this.car && this.camera) {
      this.createSnake().then(() => {
        this.stopLineService.callCreateStopLine();
      }).catch(error => {
        console.error('Error creating snake:', error);
      });
    }
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
    this.coneStateService.resetConeState();
  }

  public setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  private loadConeModel(count: number, spacing: number, distanceFromCar: number): Promise<void> {
    const trafficConePath = 'traffic-cone/cone.glb';
    const promises = [];

    for (let i = 0; i < count; i++) {
      const promise = new Promise<void>((resolve, reject) => {
        this.loader.load(trafficConePath, (gltf) => {
          const cone = gltf.scene;
          this.scene.add(cone);
          this.cones.push(cone);

          const direction = new THREE.Vector3();
          this.car.getWorldDirection(direction);
          direction.y = 0;
          direction.normalize();

          const zPosition = this.car.position.z - distanceFromCar - (i * spacing);
          const xPosition = this.car.position.x - 3;

          cone.position.set(xPosition, 0.7, zPosition);
          cone.rotation.y = Math.PI;

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
      console.log('All cones loaded');
    });
  }

  public getConeBoxes(): THREE.Box3[] {
    return this.coneBoxes;
  }

  public getCones(): THREE.Object3D[] {
    return this.cones;
  }

  public createParallelParking() {
    this.loadConeModel(5, 2, 5);
  }

  public createSnake(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.camera) {
        reject('Camera is not defined');
        return;
      }
      if (!this.car) {
        reject('Car is not defined');
        return;
      }

      this.loadConeModel(5, 15, 15).then(() => {
        console.log('Cones loaded successfully');
        resolve();
      }).catch(error => {
        console.error('Error loading cones:', error);
        reject(error);
      });
    });
  }

  public resetCones() {
    this.cones.forEach(cone => {
      cone.position.set(cone.position.x, 0.7, cone.position.z);
      cone.rotation.set(0, Math.PI, 0);
    });
    this.coneStateService.resetConeState();
  }

}

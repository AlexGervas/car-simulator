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
  private parkingPocket: THREE.Box3 | null = null;

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
            conePosition = new THREE.Vector3(xPosition, 0.2, zPosition);
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
    const lineWidth = 0.1;

    const topZ = carZ - height;
    const bottomZ = carZ - height - 8;

    const centerZ = (topZ + bottomZ) / 2;

    const positions: THREE.Vector3[] = [
      new THREE.Vector3(carX + offsetX, 0.2, topZ),
      new THREE.Vector3(carX + offsetX + width, 0.2, topZ),

      new THREE.Vector3(carX + offsetX, 0.2, bottomZ),
      new THREE.Vector3(carX + offsetX + width, 0.2, bottomZ),

      new THREE.Vector3(carX + offsetX + width, 0.2, centerZ),
    ];

    this.parkingPocket = new THREE.Box3(
      new THREE.Vector3(positions[0].x, 0, positions[2].z),
      new THREE.Vector3(positions[1].x, 2, positions[0].z)
    );

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const topLineLength = positions[1].x - positions[0].x;
    const topLineGeometry = new THREE.PlaneGeometry(topLineLength, lineWidth);
    const topLine = new THREE.Mesh(topLineGeometry, lineMaterial);
    topLine.rotation.x = -Math.PI / 2;
    topLine.position.set((positions[0].x + positions[1].x) / 2, 0.01, positions[0].z);
    this.scene.add(topLine);
    
    const bottomLineLength = positions[3].x - positions[2].x;
    const bottomLineGeometry = new THREE.PlaneGeometry(bottomLineLength, lineWidth);
    const bottomLine = new THREE.Mesh(bottomLineGeometry, lineMaterial);
    bottomLine.rotation.x = -Math.PI / 2;
    bottomLine.position.set((positions[2].x + positions[3].x) / 2, 0.01, positions[2].z);
    this.scene.add(bottomLine);

    const rightLineLength = Math.abs(positions[1].z - positions[3].z);
    const rightLineGeometry = new THREE.PlaneGeometry(lineWidth, rightLineLength);
    const rightLine = new THREE.Mesh(rightLineGeometry, lineMaterial);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(positions[1].x,0.01, (positions[1].z + positions[3].z) / 2);
    this.scene.add(rightLine);

    const dashSize = 0.5;
    const gapSize = 0.5;
    const leftLineLength = Math.abs(positions[0].z - positions[2].z);
    const dashCount = Math.floor(leftLineLength / (dashSize + gapSize));
    const startZ = positions[0].z;

    for (let i = 0; i < dashCount; i++) {
      const dashGeometry = new THREE.PlaneGeometry(lineWidth, dashSize);
      const dash = new THREE.Mesh(dashGeometry, lineMaterial);
      dash.rotation.x = -Math.PI / 2; dash.position.set(positions[0].x, 0.01, startZ - i * (dashSize + gapSize) - dashSize / 2);
      this.scene.add(dash);
    }

    return this.loadConeModel(positions.length, 0, 0, positions, false);
  }

  public createSnake(): Promise<void> {
    return this.loadConeModel(1, 15, 15, undefined, true).then(() => {
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

  public hasCrossedEntryLine(): boolean {
    if (!this.car || this.cones.length < 2) return false;

    const leftCone1 = this.cones[0].position;
    const leftCone2 = this.cones[1].position;

    const lineVector = new THREE.Vector3().subVectors(leftCone2, leftCone1).normalize();
    const carVector = new THREE.Vector3().subVectors(this.car.position, leftCone1);

    const dotProduct = lineVector.dot(carVector);
    return dotProduct > 0;
  }

  public checkCarInsideParkingPocket(): { preciseMatch: boolean; nearMatch: boolean } {
    if (!this.car || !this.parkingPocket) return { preciseMatch: false, nearMatch: false };;

    const carBox = new THREE.Box3().setFromObject(this.car);

    const tolerance = 0.5;
    const { preciseBox, expandedBox } = this.createParkingZones(tolerance);

    const preciseMatch = preciseBox.containsBox(carBox);
    const nearMatch = expandedBox.intersectsBox(carBox);

    return { preciseMatch, nearMatch };
  }

  public createParkingZones(tolerance: number): { preciseBox: THREE.Box3; expandedBox: THREE.Box3 } {
    if (!this.parkingPocket) {
      throw new Error("Parking pocket is not defined.");
    }

    const preciseBox = this.parkingPocket.clone();
    const expandedBox = this.parkingPocket.clone().expandByScalar(tolerance);
    return { preciseBox, expandedBox };
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

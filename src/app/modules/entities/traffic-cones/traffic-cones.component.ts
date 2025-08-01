import { Component, Input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ConeStateService } from '../../../core/services/cone-state.service';
import { StopLineService } from '../../../core/services/stop-line.service';
import * as CANNON from 'cannon-es';
import { CarComponent } from '../car/car.component';
import { GroundComponent } from '../ground/ground.component';

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
  @Input() world!: CANNON.World;

  public static GROUP_CONE = 2;

  public cones: THREE.Object3D[] = [];
  public coneBodies: CANNON.Body[] = [];
  public initialConePositions: THREE.Vector3[] = [];
  private scene!: THREE.Scene;
  private loader: GLTFLoader;
  private conePositions: THREE.Vector3[] = [];
  public parkingPocket: THREE.Box3 | null = null;
  public parkingLines: THREE.Mesh[] = [];

  private coneBoxes: THREE.Box3[] = [];

  constructor(private coneStateService: ConeStateService, public stopLineService: StopLineService) {
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

  public getInitialConePositions(): CANNON.Vec3[] {
    return this.initialConePositions.map(
      position => new CANNON.Vec3(position.x, position.y, position.z)
    );
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
          cone.scale.set(1, 1, 1);
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
            conePosition = new THREE.Vector3(xPosition, 0, zPosition);
          }

          cone.position.set(conePosition.x, conePosition.y, conePosition.z);
          cone.rotation.y = Math.PI;

          this.initialConePositions.push(cone.position.clone());      

          const coneBox = new THREE.Box3().setFromObject(cone);
          const radius = (coneBox.max.x - coneBox.min.x) / 2;
          const height = coneBox.max.y - coneBox.min.y;
          this.createPhysicsConeModel(cone, radius, height);

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
      if (withStopLine) {
        this.stopLineService.callCreateStopLine();
      }
    }).catch((error) => {
      console.error('Error loading some cones:', error)
    });
  }

  private createPhysicsConeModel(cone: THREE.Object3D, radius: number, height: number): void {
    const coneShape = new CANNON.Cylinder(0.01, radius, height, 8);
    const coneBody = new CANNON.Body({
      mass: 15,
      position: new CANNON.Vec3(cone.position.x, cone.position.y + height / 2, cone.position.z),
      collisionFilterGroup: TrafficConesComponent.GROUP_CONE,
      collisionFilterMask: CarComponent.GROUP_CAR | GroundComponent.GROUP_GROUND,
      material: new CANNON.Material({ restitution: 0.2 })
    });
    coneBody.addShape(coneShape);
    this.world.addBody(coneBody);
    this.coneBodies.push(coneBody);
  }

  public getConeBoxes(): THREE.Box3[] {
    return this.coneBoxes;
  }

  public getCones(): THREE.Object3D[] {
    return this.cones;
  }

  private createParkingScene(offsetX: number, width: number, height: number, gap: number): Promise<void> {
    if (!this.car) {
      return Promise.reject("Car not defined");
    }

    const carX = this.car.position.x;
    const carZ = this.car.position.z;

    const lineWidth = 0.1;

    const topZ = carZ - height;
    const bottomZ = carZ - height - gap;

    const centerZ = (topZ + bottomZ) / 2;

    const positions: THREE.Vector3[] = [
      new THREE.Vector3(carX + offsetX, 0.1, topZ),
      new THREE.Vector3(carX + offsetX + width, 0.1, topZ),

      new THREE.Vector3(carX + offsetX, 0.1, bottomZ),
      new THREE.Vector3(carX + offsetX + width, 0.1, bottomZ),

      new THREE.Vector3(carX + offsetX + width, 0.1, centerZ),
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
    this.parkingLines.push(topLine);

    const bottomLineLength = positions[3].x - positions[2].x;
    const bottomLineGeometry = new THREE.PlaneGeometry(bottomLineLength, lineWidth);
    const bottomLine = new THREE.Mesh(bottomLineGeometry, lineMaterial);
    bottomLine.rotation.x = -Math.PI / 2;
    bottomLine.position.set((positions[2].x + positions[3].x) / 2, 0.01, positions[2].z);
    this.scene.add(bottomLine);
    this.parkingLines.push(bottomLine);

    const rightLineLength = Math.abs(positions[1].z - positions[3].z);
    const rightLineGeometry = new THREE.PlaneGeometry(lineWidth, rightLineLength);
    const rightLine = new THREE.Mesh(rightLineGeometry, lineMaterial);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(positions[1].x, 0.01, (positions[1].z + positions[3].z) / 2);
    this.scene.add(rightLine);
    this.parkingLines.push(rightLine);

    const dashSize = 0.5;
    const gapSize = 0.5;
    const leftLineLength = Math.abs(positions[0].z - positions[2].z);
    const dashCount = Math.floor(leftLineLength / (dashSize + gapSize));
    const startZ = positions[0].z;

    for (let i = 0; i < dashCount; i++) {
      const dashGeometry = new THREE.PlaneGeometry(lineWidth, dashSize);
      const dash = new THREE.Mesh(dashGeometry, lineMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(positions[0].x, 0.01, startZ - i * (dashSize + gapSize) - dashSize / 2);
      this.scene.add(dash);
      this.parkingLines.push(dash);
    }

    return this.loadConeModel(positions.length, 0, 0, positions, false);
  }

  public clearParkingLines(): void {
    if (this.parkingPocket) {
      this.parkingLines.forEach(line => this.scene.remove(line));
      this.parkingLines = [];
    }
  }

  public createParallelParking(): Promise<void> {
    return this.createParkingScene(3, 4, 10, 8);
  }

  public createGarage(): Promise<void> {
    return this.createParkingScene(5, 8, 4, 5);
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

  public checkCarInsideParkingPocket(): { preciseMatch: boolean; nearMatch: boolean } {
    if (!this.car || !this.parkingPocket) return { preciseMatch: false, nearMatch: false };

    const carBox = new THREE.Box3().setFromObject(this.car);

    const tolerance = 0.5;
    const { preciseBox, expandedBox } = this.createParkingZones(tolerance);
    const carCenter = carBox.getCenter(new THREE.Vector3());
    preciseBox.expandByScalar(0.5);

    const preciseMatch = preciseBox.containsBox(carBox);
    const nearMatch = expandedBox.intersectsBox(carBox) && expandedBox.containsPoint(carCenter);

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
    this.coneBodies.forEach(coneBody => {
      this.world.removeBody(coneBody);
    });
    this.coneBodies = [];

    this.cones.forEach((cone, index) => {
      if (this.initialConePositions[index]) {
        cone.position.copy(this.initialConePositions[index]);
        cone.rotation.set(0, Math.PI, 0);

        const coneBox = new THREE.Box3().setFromObject(cone);
        const radius = (coneBox.max.x - coneBox.min.x) / 2;
        const height = coneBox.max.y - coneBox.min.y;

        this.createPhysicsConeModel(cone, radius, height);
      }
    });
  }

  public removeCones() {
    this.coneBodies.forEach(coneBody => {
      this.world.removeBody(coneBody);
    });
    this.coneBodies = [];

    this.cones.forEach(cone => {
      cone.parent?.remove(cone);
    });
    this.cones = [];
    this.initialConePositions = [];
    this.coneBoxes = [];
  }

}

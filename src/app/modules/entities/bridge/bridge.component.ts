import { Component, Input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { CarComponent } from '../car/car.component';
import { GroundComponent } from '../../entities/ground/ground.component';

@Component({
  selector: 'app-bridge',
  standalone: true,
  imports: [],
  templateUrl: './bridge.component.html',
  styleUrl: './bridge.component.css'
})
export class BridgeComponent {
  @Input() scene!: THREE.Scene;
  @Input() world!: CANNON.World;
  @Input() ground!: GroundComponent;

  public static GROUP_BRIDGE = 8;

  public bridgeBody!: CANNON.Body;
  private bridgeShape!: CANNON.Trimesh;

  public hasCrossedBridge: boolean = false;
  public isOnBridge: boolean = false; 
  public outOfBounds: boolean = false;
  public hasEnteredBridge: boolean = false;
  public hasPassedByBridge: boolean = false;
  public lastVertexPosition: CANNON.Vec3 | null = null;
  public bridgeStartPositionZ: number | undefined;

  constructor() { }

  public createBridge(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      const bridgePath = 'models/road-elements/bridge.glb';

      loader.load(bridgePath, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.001, 0.001, 0.001);
        model.position.set(-4, 0, -70);
        this.bridgeStartPositionZ = model.position.z;
        model.rotateY(Math.PI / 2);
        this.scene.add(model);

        this.createPhysicsSteepGrade(model);
        resolve();
      }, undefined, (error) => {
        reject(error);
      });

    });
  }

  public getLastVertexPosition(geometry: THREE.BufferGeometry): CANNON.Vec3 | null {
    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) {
      console.error("No position attribute found in geometry.");
      return null;
    }

    let lastVertex: CANNON.Vec3 | null = null;
    let minZ = Infinity;

    const scale = new THREE.Vector3(0.01, 0.01, 0.01);

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i) * scale.x;
      const y = positionAttribute.getY(i) * scale.y;
      const z = positionAttribute.getZ(i) * scale.z;

      if (z < minZ) {
        minZ = z;
        lastVertex = new CANNON.Vec3(x, y, z);
      }
    }

    return lastVertex;
  }

  private findObjectByName(object: THREE.Object3D, name: string): THREE.Mesh | null {
    if ((object as THREE.Mesh).isMesh && object.name === name) {
      return object as THREE.Mesh;
    }
    for (const child of object.children) {
      const found = this.findObjectByName(child, name);
      if (found) return found;
    }
    return null;
  }

  private createPhysicsSteepGrade(model: THREE.Object3D): void {
    const roadVertices: number[] = [];
    const roadIndices: number[] = [];

    const roadMesh = this.findObjectByName(model, "Plane003");

    const geometry = roadMesh!.geometry as THREE.BufferGeometry;
    this.lastVertexPosition = this.getLastVertexPosition(geometry);

    const positionAttribute = geometry.getAttribute("position");
    const worldScale = new THREE.Vector3();
    model.getWorldScale(worldScale);

    const roadWorldPosition = new THREE.Vector3();
    roadMesh!.getWorldPosition(roadWorldPosition);

    if (positionAttribute) {
      const tempVector = new THREE.Vector3();
      for (let i = 0; i < positionAttribute.count; i++) {
        tempVector.set(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
        tempVector.x *= 0.65;

        tempVector.multiply(worldScale);
        tempVector.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
        roadVertices.push(tempVector.x, tempVector.y, tempVector.z);
      }
    }

    const indices = geometry.getIndex();
    if (indices) {
      roadIndices.push(...indices.array);
    }

    if (roadVertices.length === 0 || roadIndices.length === 0) {
      console.error("No valid geometry found for road physics!");
      return;
    }

    this.bridgeShape = new CANNON.Trimesh(roadVertices, roadIndices);
    const bridgeMaterial = new CANNON.Material("bridgeMaterial");

    this.bridgeBody = new CANNON.Body({
      mass: 0,
      material: bridgeMaterial,
      position: new CANNON.Vec3(roadWorldPosition.x, roadWorldPosition.y, roadWorldPosition.z),
      collisionFilterGroup: BridgeComponent.GROUP_BRIDGE,
      collisionFilterMask: CarComponent.GROUP_CAR | GroundComponent.GROUP_GROUND,
    });

    const worldQuaternion = new THREE.Quaternion();
    model.getWorldQuaternion(worldQuaternion);

    this.bridgeBody.quaternion.set(
      worldQuaternion.x,
      worldQuaternion.y,
      worldQuaternion.z,
      worldQuaternion.w
    );

    const rotationQuaternionX = new CANNON.Quaternion();
    rotationQuaternionX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    const rotationQuaternionY = new CANNON.Quaternion();
    rotationQuaternionY.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
    this.bridgeBody.quaternion = rotationQuaternionY.mult(rotationQuaternionX);

    this.bridgeBody.addShape(this.bridgeShape);
    this.world.addBody(this.bridgeBody);

    const wheelMaterial = new CANNON.Material("wheelMaterial");
    const bridgeWheelContactMaterial = new CANNON.ContactMaterial(bridgeMaterial, wheelMaterial, {
      friction: 0.6,
      restitution: 0,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
    });
    this.world.addContactMaterial(bridgeWheelContactMaterial);
  }

  public checkIfOnBridge(position: CANNON.Vec3): boolean {
    const rayStart = new CANNON.Vec3(position.x, position.y + 10, position.z);
    const rayEnd = new CANNON.Vec3(position.x, position.y - 10, position.z);

    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();

    if (this.bridgeBody) {
      ray.intersectBody(this.bridgeBody, result);
    }

    return result.hasHit;
  }

  public getBridgeHeightAtPosition(position: CANNON.Vec3): number {
    const rayStart = new CANNON.Vec3(position.x, position.y + 10, position.z);
    const rayEnd = new CANNON.Vec3(position.x, position.y - 10, position.z);

    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();

    if (this.bridgeBody) {
      ray.intersectBody(this.bridgeBody, result);
    }

    if (result.hasHit) {
      return result.hitPointWorld.y;
    }
    return position.y;
  }

  public handleCarOnBridge(carPosition: CANNON.Vec3, carBody: CANNON.Body): void {
    const retreat = 20;
    const isCurrentlyOnBridge = this.checkIfOnBridge(carPosition);
    const hasReachedEndOfBridge = this.bridgeStartPositionZ && carPosition.z <= (this.bridgeStartPositionZ + retreat) / 2;

    if (isCurrentlyOnBridge) {
      this.isOnBridge = true;
      this.movingAcrossTheBridge(carPosition, carBody);
    }

    if (!isCurrentlyOnBridge && this.isOnBridge) {
      if (this.lastVertexPosition && carPosition.z <= this.lastVertexPosition.z - retreat) {
        this.hasCrossedBridge = true;
        console.log("Вы успешно проехали мост.");
      } else if (this.lastVertexPosition && carPosition.z > this.lastVertexPosition.z - retreat) {
        this.outOfBounds = true;
        console.log("Покинули мост досрочно");
      }
      this.isOnBridge = false;
    }
    else if (!isCurrentlyOnBridge && !this.isOnBridge && hasReachedEndOfBridge) {
      this.hasPassedByBridge = true;
      console.log("Машина проехала мимо моста.");
    }
  }

  private movingAcrossTheBridge(carPosition: CANNON.Vec3, carBody: CANNON.Body): void {
    const bridgeHeight = this.getBridgeHeightAtPosition(carPosition);
    const offsetY = 0.5;
    carBody.position.y = bridgeHeight + offsetY;

    const forwardPosition = carPosition.clone();
    forwardPosition.z += 1;
    const forwardHeight = this.getBridgeHeightAtPosition(forwardPosition);

    const backwardPosition = carPosition.clone();
    backwardPosition.z -= 1;
    const backwardHeight = this.getBridgeHeightAtPosition(backwardPosition);

    const tiltAngle = Math.atan2(forwardHeight - backwardHeight, 2);
    const tiltQuaternion = new CANNON.Quaternion();
    tiltQuaternion.setFromEuler(tiltAngle, 0, 0);

    const currentRotation = carBody.quaternion.clone();
    carBody.quaternion = currentRotation.mult(tiltQuaternion);
  }

  private interpolateHeight(currentZ: number, lastBridgeZ: number, roadHeight: number, bridgeHeight: number): number {
    const distanceToRoad = Math.max(0, currentZ - lastBridgeZ);    
    const transitionFactor = Math.min(distanceToRoad / 1000, 1);

    return bridgeHeight * (1 - transitionFactor) + roadHeight * transitionFactor;
  }

}

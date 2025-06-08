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

  public static GROUP_BRIDGE = 8;

  public bridgeBody!: CANNON.Body;
  private bridgeShape!: CANNON.Trimesh;

  public hasCrossedBridge: boolean = false;
  public lastVertexPosition: CANNON.Vec3 | null = null;

  constructor() { }

  public createBridge(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      const bridgePath = 'models/road-elements/bridge.glb';

      loader.load(bridgePath, (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.001, 0.001, 0.001);
        model.position.set(-4, 0, -70);
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

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      if (z < minZ) {
        minZ = z;
        lastVertex = new CANNON.Vec3(x, y, z);
      }
    }

    return lastVertex;
  }

  private createPhysicsSteepGrade(model: THREE.Object3D): void {
    const roadVertices: number[] = [];
    const roadIndices: number[] = [];

    const findObjectByName = (object: THREE.Object3D, name: string): THREE.Mesh | null => {
      if ((object as THREE.Mesh).isMesh && object.name === name) {
        return object as THREE.Mesh;
      }

      for (const child of object.children) {
        const found = findObjectByName(child, name);
        if (found) return found;
      }

      return null;
    };

    const roadMesh = findObjectByName(model, "Plane003");

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

}

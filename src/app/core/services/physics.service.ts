import { Injectable } from '@angular/core';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class PhysicsService {
  public world: CANNON.World = new CANNON.World();

  constructor() {
    this.world.gravity.set(0, -9.82, 0);
  }

  public step(delta: number): void {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 3;
    this.world.step(fixedTimeStep, delta, maxSubSteps);
  }

  public syncBody(mesh: THREE.Object3D, body: CANNON.Body): void {
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    mesh.quaternion.set(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    );
  }

  public syncBodies(meshes: THREE.Object3D[], bodies: CANNON.Body[]): void {
    bodies.forEach((body, i) => {
      const mesh = meshes[i];
      if (mesh) {
        this.syncBody(mesh, body);
      }
    });
  }
}

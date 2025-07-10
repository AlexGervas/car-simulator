import { Component, Input } from '@angular/core';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CarComponent } from '../car/car.component';
import { BridgeComponent } from '../../entities/bridge/bridge.component';
import { TrafficConesComponent } from '../traffic-cones/traffic-cones.component';

@Component({
  selector: 'app-ground',
  standalone: true,
  imports: [],
  templateUrl: './ground.component.html',
  styleUrl: './ground.component.css'
})
export class GroundComponent {
  @Input() car!: THREE.Object3D;
  @Input() scene!: THREE.Scene;
  @Input() world!: CANNON.World;

  public static GROUP_GROUND = 4;

  public asphaltTexture!: THREE.Texture;

  constructor() { }

  public loadGroundModel() {
    const textureLoader = new THREE.TextureLoader();
    this.asphaltTexture = textureLoader.load('textures/asphalt.jpg', () => {
      this.updateTiles();
    })
    this.asphaltTexture.wrapS = THREE.RepeatWrapping;
    this.asphaltTexture.wrapT = THREE.RepeatWrapping;
    this.asphaltTexture.repeat.set(3, 3);
  }

  public createPhysicsGroundBody(): void {
    const groundMaterial = new CANNON.Material('groundMaterial');
    const groundBody = new CANNON.Body({
      mass: 0,
      material: groundMaterial,
      collisionFilterGroup: GroundComponent.GROUP_GROUND,
      collisionFilterMask: CarComponent.GROUP_CAR | BridgeComponent.GROUP_BRIDGE | TrafficConesComponent.GROUP_CONE
    });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    const wheelMaterial = new CANNON.Material('wheelMaterial');
    const contactMaterial = new CANNON.ContactMaterial(groundMaterial, wheelMaterial, {
      friction: 0.5,
      restitution: 0.1
    });
    this.world.addContactMaterial(contactMaterial);
  }

  private createTile(x: number, z: number): void {
    const tileGeometry = new THREE.PlaneGeometry(14, 6);
    const tileMaterial = new THREE.MeshBasicMaterial({ map: this.asphaltTexture, side: THREE.DoubleSide });
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);
    tile.rotation.x = -Math.PI / 2;
    tile.position.set(x, 0, z);
    this.scene.add(tile);
  }

  public updateTiles(): void {
    if (!this.car) {
      return;
    }
    const carPositionZ = this.car.position.z;
    const visibleRange = 200;
    const tileSize = 6;

    // Delete old tiles
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry && child.material === this.asphaltTexture) {
        this.scene.remove(child);
      }
    });

    for (let z = carPositionZ - visibleRange; z < carPositionZ + visibleRange; z += tileSize) {
      this.createTile(0, z);
    }
  }

}

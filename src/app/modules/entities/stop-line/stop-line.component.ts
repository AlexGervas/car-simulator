import { Component, Input } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-stop-line',
  standalone: true,
  imports: [],
  templateUrl: './stop-line.component.html',
  styleUrl: './stop-line.component.css',
})
export class StopLineComponent {
  @Input() scene!: THREE.Scene;

  public createStopLine(lastConeBox: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      const finishLinePath = 'models/road-elements/finish_line.glb';

      loader.load(
        finishLinePath,
        (gltf) => {
          const model = gltf.scene;
          model.name = 'FinishLine';
          model.position.set(0, lastConeBox.max.y - 0.2, lastConeBox.max.z - 5);
          this.scene.add(model);
          resolve();
        },
        undefined,
        (error) => {
          console.error('The finish line model is not loaded:', error);
          reject(error);
        },
      );

      if (lastConeBox) {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
          -7,
          lastConeBox.max.y - 0.2,
          lastConeBox.max.z - 5,
          7,
          lastConeBox.max.y - 0.2,
          lastConeBox.max.z - 5,
        ]);

        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(vertices, 3),
        );

        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const line = new THREE.Line(geometry, material);
        line.name = 'StopLine';
        this.scene.add(line);
      }
    });
  }
}

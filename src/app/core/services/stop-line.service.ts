import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
    providedIn: 'root',
})
export class StopLineService {
    private createStopLineCallback!: () => Promise<void>;
    private scene!: THREE.Scene;

    public setScene(scene: THREE.Scene) {
        this.scene = scene;
    }

    public setCreateStopLineCallback(callback: () => Promise<void>) {
        this.createStopLineCallback = callback;
    }

    public callCreateStopLine(): Promise<void> {
        if (this.createStopLineCallback) {
            return this.createStopLineCallback();
        } else {
            return Promise.reject('Create stop line callback is not set');
        }
    }

    public removeStopLine(): void {
        if (!this.scene) {
            console.error('Scene not initialized');
            return;
        }

        this.scene.children.forEach(obj => {
            if ((obj).name === 'StopLine') {
                this.scene.remove(obj);
            }
        });
    }
}

import { Injectable } from "@angular/core";
import * as THREE from 'three';

@Injectable({
    providedIn: 'root'
})
export class RendererFactoryService {
    public createRenderer(canvas?: HTMLCanvasElement): THREE.WebGLRenderer {
        return new THREE.WebGLRenderer({ canvas });
    }
}
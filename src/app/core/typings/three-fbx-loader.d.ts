declare module 'three/examples/jsm/loaders/FBXLoader' {
  import { Loader, LoadingManager } from 'three';
  import { Object3D } from 'three';

  export class FBXLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (object: Object3D) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void
    ): void;
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { Loader, AnimationClip } from 'three';
  import { Object3D } from 'three';

  export class GLTFLoader extends Loader {
    constructor();
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (error: ErrorEvent) => void
    ): void;
  }

  export interface GLTF {
    scene: Object3D;
    animations: AnimationClip[];
    asset: {
      version: string;
      generator: string;
    };
  }
}

declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, EventDispatcher, MOUSE, Vector3 } from 'three';

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement: HTMLElement);

    object: Camera;
    target: Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    zoomSpeed: number;
    enableRotate: boolean;
    rotateSpeed: number;
    enablePan: boolean;
    panSpeed: number;
    screenSpacePanning: boolean;
    mouseButtons: {
      LEFT: MOUSE;
      MIDDLE: MOUSE;
      RIGHT: MOUSE;
    };
    update(): void;
    dispose(): void;
  }
}

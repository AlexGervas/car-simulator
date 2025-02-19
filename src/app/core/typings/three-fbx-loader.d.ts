declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Loader } from 'three';
    import { Object3D } from 'three';
  
    export class FBXLoader extends Loader {
      constructor(manager?: any);
      load(url: string, onLoad: (object: Object3D) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): void;
    }
  }


declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { Loader } from 'three';
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
        animations: any[];
        asset: {
            version: string;
            generator: string;
        };
    }
}



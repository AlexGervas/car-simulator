import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { LoaderComponent } from '../../../shared/loader/loader.component';
import { CommonModule } from '@angular/common';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import { RendererFactoryService } from '../../../core/services/renderer-factory.service';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './model-viewer.component.html',
  styleUrl: './model-viewer.component.css',
})
export class ModelViewerComponent implements OnInit, OnDestroy {
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private model!: THREE.Object3D;
  private frontLeftDoor!: THREE.Object3D;
  private frontRightDoor!: THREE.Object3D;
  private backLeftDoor!: THREE.Object3D;
  private backRightDoor!: THREE.Object3D;
  private carTrunk!: THREE.Object3D;
  private carHood!: THREE.Object3D;

  private animationFrameId!: number;

  private isFrontLeftDoorOpen: boolean = false;
  private isFrontRightDoorOpen: boolean = false;
  private isBackLeftDoorOpen: boolean = false;
  private isBackRightDoorOpen: boolean = false;
  private isCarTrunkOpen: boolean = false;
  private isCarHoodOpen: boolean = false;

  private doorGroups: { [key: string]: THREE.Object3D[] } = {};

  constructor(
    private modelsLoaderService: ModelsLoaderService,
    private rendererFactory: RendererFactoryService,
  ) {}

  ngOnInit(): void {
    this.modelsLoaderService.show();
    this.initScene()
      .then(() => {
        return this.loadModel();
      })
      .then(() => {
        console.log('Model loaded successfully');
        this.animate();
      })
      .catch((error) => {
        console.error('Failed to load resources:', error);
      });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private initScene(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.scene = new THREE.Scene();
      // this.scene.background = new THREE.Color(0xc0c0c0);

      const container = this.viewerContainer.nativeElement;
      this.camera = new THREE.PerspectiveCamera(
        70,
        container.clientWidth / container.clientHeight,
        0.1,
        1000,
      );
      this.camera.position.set(2, 3, 5);
      this.camera.lookAt(0, 0, 0);

      const canvas = document.createElement('canvas');
      this.renderer = this.rendererFactory.createRenderer(canvas);
      container.appendChild(canvas);

      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(this.renderer.domElement);

      const rgbeLoader = new RGBELoader();
      // small_hangar_01_4k, rooftop_night_4k
      rgbeLoader.load(
        'hdri/small_hangar_01_4k.hdr',
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.scene.background = texture;
          this.scene.environment = texture;
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading HDRI:', error);
          reject(error);
        },
      );

      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        transparent: true,
        opacity: 0.6,
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2;
      this.scene.add(plane);

      const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(10, 10, 10);
      directionalLight.castShadow = true;
      this.scene.add(directionalLight);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;

      window.addEventListener('resize', this.onWindowResize.bind(this));
    });
  }

  private loadModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        'models/cars/vw_polo_final.glb',
        (gltf: GLTF) => {
          this.model = gltf.scene;
          this.model.scale.set(1, 1, 1);
          this.model.position.set(0, 0, 0);

          const box = new THREE.Box3().setFromObject(this.model);
          const size = box.getSize(new THREE.Vector3());
          const scaleFactor = 1 / Math.max(size.x, size.y, size.z);
          this.model.scale.multiplyScalar(scaleFactor * 8);

          this.frontLeftDoor = this.model.getObjectByName('polo17_door_FL')!;
          this.frontRightDoor = this.model.getObjectByName('polo17_door_FR')!;
          this.backLeftDoor = this.model.getObjectByName('polo17_door_RL')!;
          this.backRightDoor = this.model.getObjectByName('polo17_door_RR')!;

          this.carTrunk = this.model.getObjectByName('polo17_trunk')!;
          this.carHood = this.model.getObjectByName('polo17_hood')!;

          this.doorGroups = {
            polo17_door_FL: [
              this.model.getObjectByName('polo17_doorglass_FL001')!,
              this.model.getObjectByName('polo17_doorpanel_FL')!,
              this.model.getObjectByName('polo17_mirror_L')!,
            ],
            polo17_door_FR: [
              this.model.getObjectByName('polo17_doorglass_FL')!,
              this.model.getObjectByName('polo17_doorpanel_FR')!,
              this.model.getObjectByName('polo17_mirror_R')!,
            ],
            polo17_door_RL: [
              this.model.getObjectByName('polo17_doorglass_RR005')!,
              this.model.getObjectByName('polo17_doorpanel_RL')!,
            ],
            polo17_door_RR: [
              this.model.getObjectByName('polo17_doorglass_RR004')!,
              this.model.getObjectByName('polo17_doorpanel_RR')!,
            ],
          };

          this.scene.add(this.model);
          this.modelsLoaderService.hide();
          resolve();
        },
        undefined,
        (error) => {
          this.modelsLoaderService.hide();
          console.error('Error loading model:', error);
          reject(error);
        },
      );
    });
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    if (this.controls && this.renderer && this.scene && this.camera) {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  @HostListener('window:resize', [])
  private onWindowResize(): void {
    const container = this.viewerContainer.nativeElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  @HostListener('click', ['$event'])
  private onClick(event: MouseEvent): void {
    const rect = this.viewerContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.model.children,
      true,
    );
    console.log(111, intersects);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;

      let parent = clickedObject.parent;
      while (parent) {
        if (parent.name === this.frontLeftDoor.name) {
          this.isFrontLeftDoorOpen = this.toggleDoor(
            this.frontLeftDoor,
            this.isFrontLeftDoorOpen,
            -1,
          );
          return;
        } else if (parent.name === this.frontRightDoor.name) {
          this.isFrontRightDoorOpen = this.toggleDoor(
            this.frontRightDoor,
            this.isFrontRightDoorOpen,
            1,
          );
          return;
        } else if (parent.name == this.backLeftDoor.name) {
          this.isBackLeftDoorOpen = this.toggleDoor(
            this.backLeftDoor,
            this.isBackLeftDoorOpen,
            -1,
          );
          return;
        } else if (parent.name === this.backRightDoor.name) {
          this.isBackRightDoorOpen = this.toggleDoor(
            this.backRightDoor,
            this.isBackRightDoorOpen,
            1,
          );
          return;
        } else if (parent.name === this.carTrunk.name) {
          this.isCarTrunkOpen = this.toggleDoor(
            this.carTrunk,
            this.isCarTrunkOpen,
            1,
          );
          return;
        } else if (parent.name.includes(this.carHood.name)) {
          this.isCarHoodOpen = this.toggleDoor(
            this.carHood,
            this.isCarHoodOpen,
            -1,
          );
          return;
        }
        parent = parent.parent;
      }
    }
  }

  private toggleDoor(
    door: THREE.Object3D,
    isOpen: boolean,
    direction: number,
  ): boolean {
    const rotation = isOpen ? 0 : THREE.MathUtils.degToRad(45) * direction;

    if (door.name === 'polo17_trunk' || door.name === 'polo17_hood') {
      door.rotation.x = rotation;
    } else {
      door.rotation.z = rotation;
    }

    const relatedObjects = this.doorGroups[door.name] || [];
    for (const obj of relatedObjects) {
      obj.rotation.z = rotation;
    }

    return !isOpen;
  }
}

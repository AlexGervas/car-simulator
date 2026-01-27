import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StopLineComponent } from './stop-line.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

describe('StopLineComponent', () => {
  let component: StopLineComponent;
  let fixture: ComponentFixture<StopLineComponent>;
  let mockScene: THREE.Scene;
  let throwLoadError = false;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StopLineComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    spyOn(GLTFLoader.prototype, 'load').and.callFake(
      (path, onLoad, onProgress, onError) => {
        if (throwLoadError) {
          onError?.(new Error('Load error'));
        } else {
          const gltf: any = {
            scene: new THREE.Group(),
            animations: [],
            scenes: [],
            cameras: [],
            asset: {},
          };
          onLoad(gltf);
        }
      }
    );

    fixture = TestBed.createComponent(StopLineComponent);
    component = fixture.componentInstance;
    mockScene = new THREE.Scene();
    component.scene = mockScene;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('createStopLine()', () => {
    const lastConeBox = new THREE.Box3(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 1, 5)
    );

    it('should create a stop line with a model', async () => {
      throwLoadError = false;

      await component.createStopLine(lastConeBox);

      expect(mockScene.children.length).toBeGreaterThan(0);
      expect(mockScene.children[0].name).toBe('FinishLine');
      expect(mockScene.children[0].position.y).toBeCloseTo(0.8);
      expect(mockScene.children[0].position.z).toBeCloseTo(0);
    });

    it('should handle errors when loading the model', async () => {
      throwLoadError = true;

      await expectAsync(
        component.createStopLine(lastConeBox)
      ).toBeRejectedWithError('Load error');
    });
  });
});

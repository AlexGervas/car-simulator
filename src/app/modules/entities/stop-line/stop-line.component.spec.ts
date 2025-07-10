import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StopLineComponent } from './stop-line.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

describe('StopLineComponent', () => {
    let component: StopLineComponent;
    let fixture: ComponentFixture<StopLineComponent>;
    let mockScene: THREE.Scene;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StopLineComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StopLineComponent);
        component = fixture.componentInstance;
        mockScene = new THREE.Scene();
        component.scene = mockScene;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should create a stop line with a model', async () => {
        const lastConeBox = { max: { y: 1, z: 5 } };

        const loadSpy = spyOn(GLTFLoader.prototype, 'load').and.callFake((path, onLoad) => {
            const gltf: any = {
                scene: new THREE.Group(),
                animations: [],
                scenes: [],
                cameras: [],
                asset: {}
            };
            onLoad(gltf);
        });

        await component.createStopLine(lastConeBox);

        expect(mockScene.children[0].name).toBe("FinishLine");
        expect(mockScene.children[0].position.y).toBeCloseTo(0.8);
        expect(mockScene.children[0].position.z).toBeCloseTo(0);
    });

    it('should handle errors when loading the model', async () => {
        const lastConeBox = { max: { y: 1, z: 5 } };

        const loadSpy = spyOn(GLTFLoader.prototype, 'load').and.callFake((path, onLoad, onProgress, onError) => {
            if (onError) {
                onError(new Error('Load error'));
            }
        });

        await component.createStopLine(lastConeBox).catch((error) => {
            expect(error.message).toBe('Load error');
        });
    });

});

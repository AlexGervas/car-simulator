import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroundComponent } from './ground.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

describe('GroundComponent', () => {
    let component: GroundComponent;
    let fixture: ComponentFixture<GroundComponent>;
    let mockCar: THREE.Object3D;
    let mockScene: THREE.Scene;
    let mockWorld: CANNON.World;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GroundComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(GroundComponent);
        component = fixture.componentInstance;

        mockCar = new THREE.Object3D();
        mockScene = new THREE.Scene();
        mockWorld = new CANNON.World();

        component.car = mockCar;
        component.scene = mockScene;
        component.world = mockWorld;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should load ground model and set asphalt texture', (done) => {
        spyOn(THREE.TextureLoader.prototype, 'load').and.callFake((url, onLoad) => {
            const texture = new THREE.Texture();
            if (onLoad) {
                onLoad(texture);
            }
            return texture;
        });

        component.loadGroundModel();

        expect(component.asphaltTexture).toBeDefined();
        expect(component.asphaltTexture.wrapS).toBe(THREE.RepeatWrapping);
        expect(component.asphaltTexture.wrapT).toBe(THREE.RepeatWrapping);
        expect(component.asphaltTexture.repeat.x).toBe(3);
        expect(component.asphaltTexture.repeat.y).toBe(3);
        done();
    });

    it('should create physics ground body', () => {
        component.createPhysicsGroundBody();

        expect(mockWorld.bodies.length).toBe(1);
        const groundBody = mockWorld.bodies[0];
        expect(groundBody.mass).toBe(0);
        expect(groundBody.collisionFilterGroup).toBe(GroundComponent.GROUP_GROUND);
    });

    it('should update tiles based on car position', () => {
        mockCar.position.z = 0;
        component.loadGroundModel();
        component.updateTiles();

        expect(mockScene.children.length).toBeGreaterThan(0);
        const tile = mockScene.children[0];
        expect(tile.position.z).toBeLessThan(200);
    });

    it('should create a tile and add it to the scene', () => {
        const x = 10;
        const z = 20;

        component.loadGroundModel();

        (component as any).createTile(x, z);

        expect(mockScene.children.length).toBe(1);

        const tile = mockScene.children[0] as THREE.Mesh;
        expect(tile).toBeInstanceOf(THREE.Mesh);

        expect(tile.geometry).toBeInstanceOf(THREE.PlaneGeometry);
        expect(tile.material).toBeInstanceOf(THREE.MeshBasicMaterial);

        const material = Array.isArray(tile.material) ? tile.material[0] : tile.material;
        const basicMaterial = material as THREE.MeshBasicMaterial;
        expect(basicMaterial.map).toBeDefined();
        expect(basicMaterial.map).toBe(component.asphaltTexture);

        expect(tile.position.x).toBe(x);
        expect(tile.position.z).toBe(z);
        expect(tile.rotation.x).toBe(-Math.PI / 2);
    });

});

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BridgeComponent } from './bridge.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

describe('BridgeComponent', () => {
    let component: BridgeComponent;
    let fixture: ComponentFixture<BridgeComponent>;

    beforeEach(waitForAsync( () => {
        TestBed.configureTestingModule({
            imports: [BridgeComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BridgeComponent);
        component = fixture.componentInstance;
        component.scene = new THREE.Scene();
        component.world = new CANNON.World();
        fixture.detectChanges();
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    describe('createBridge', () => {
        it('should create the bridge', async () => {
            const scene = new THREE.Scene();
            const world = new CANNON.World();
            component.scene = scene;
            component.world = world;

            await component.createBridge();
            expect(component.bridgeBody).toBeDefined();
            expect(scene.children.length).toBeGreaterThan(0);
        });
    });

    describe('getBridgeHeightAtPosition', () => {
        beforeEach(() => {
            component.bridgeBody = new CANNON.Body();
            component.bridgeBody.position.set(0, 5, 0);
        });

        it('should return bridge Y-position if ray hits bridgeBody', () => {
            const carPosition = new CANNON.Vec3(0, 5, 0);
            const height = component.getBridgeHeightAtPosition(carPosition);
            expect(height).toBe(5);
        });

        it('should return original Y if no hit', () => {
            component.bridgeBody = undefined as any;
            const carPosition = new CANNON.Vec3(0, 5, 0);
            const height = component.getBridgeHeightAtPosition(carPosition);
            expect(height).toBe(5);
        });
    });

    describe('checkIfOnBridge', () => {
        beforeEach(() => {
            component.bridgeBody = new CANNON.Body({
                shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
                position: new CANNON.Vec3(0, 0, 0)
            });
        });

        it('should return true if ray intersects bridgeBody', () => {
            const position = new CANNON.Vec3(0, 0, 0);
            expect(component.checkIfOnBridge(position)).toBeTrue();
        });

        it('should return false if ray does not intersect bridgeBody', () => {
            const position = new CANNON.Vec3(1000, 1000, 1000);
            expect(component.checkIfOnBridge(position)).toBeFalse();
        });

        it('should return false if bridgeBody is undefined', () => {
            component.bridgeBody = undefined as any;
            const position = new CANNON.Vec3(0, 0, 0);
            expect(component.checkIfOnBridge(position)).toBeFalse();
        });
    });
});

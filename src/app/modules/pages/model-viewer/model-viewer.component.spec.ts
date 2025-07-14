import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelViewerComponent } from './model-viewer.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import * as THREE from 'three';
import { of } from 'rxjs';

class MockModelsLoaderService {
    isLoading$ = of(false);
    show() { }
    hide() { }
}

describe('ModelViewerComponent', () => {
    let component: ModelViewerComponent;
    let fixture: ComponentFixture<ModelViewerComponent>;
    let modelsLoaderService: jasmine.SpyObj<ModelsLoaderService>;

    beforeEach(async () => {
        const loaderServiceSpy = jasmine.createSpyObj('ModelsLoaderService', ['show', 'hide'], {
            isLoading$: of(false)
        });

        await TestBed.configureTestingModule({
            imports: [ModelViewerComponent],
            providers: [
                provideNoopAnimations(),
                { provide: ModelsLoaderService, useValue: loaderServiceSpy },
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ModelViewerComponent);
        component = fixture.componentInstance;
        modelsLoaderService = TestBed.inject(ModelsLoaderService) as jasmine.SpyObj<ModelsLoaderService>;
        fixture.detectChanges();
    });

    describe('initialization', () => {
        it('should create the component', () => {
            expect(component).toBeTruthy();
        });

        it('should call show() from ModelsLoaderService on ngOnInit', async () => {
            spyOn(component as any, 'initScene').and.returnValue(Promise.resolve());
            spyOn(component as any, 'loadModel').and.returnValue(Promise.resolve());
            spyOn(component as any, 'animate');

            component.ngOnInit();

            expect(modelsLoaderService.show).toHaveBeenCalled();
        });
    });

    describe('toggleDoor', () => {
        it('should open and close a door correctly (rotation.z)', () => {
            const door = new THREE.Object3D();
            door.name = 'polo17_door_FL';

            const child1 = new THREE.Object3D();
            const child2 = new THREE.Object3D();
            (component as any).doorGroups = {
                polo17_door_FL: [child1, child2]
            };

            let isOpen = false;
            isOpen = (component as any).toggleDoor(door, isOpen, -1);
            expect(door.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(-45));
            expect(child1.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(-45));
            expect(isOpen).toBeTrue();

            isOpen = (component as any).toggleDoor(door, isOpen, -1);
            expect(door.rotation.z).toBe(0);
            expect(child1.rotation.z).toBe(0);
            expect(isOpen).toBeFalse();
        });

        it('should handle toggleDoor when there are no related objects in doorGroups', () => {
            const door = new THREE.Object3D();
            door.name = 'non_existing_door';

            (component as any).doorGroups = {};

            const isOpen = false;
            const result = (component as any).toggleDoor(door, isOpen, 1);

            expect(door.rotation.z).toBeCloseTo(THREE.MathUtils.degToRad(45));
            expect(result).toBeTrue();
        });

    });

});

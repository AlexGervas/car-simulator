import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelViewerComponent } from './model-viewer.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ModelsLoaderService } from '../../../core/services/models-loader.service';
import { of } from 'rxjs';

class MockModelsLoaderService {
    isLoading$ = of(false);
    show() { }
    hide() { }
}

describe('ModelViewerComponent', () => {
    let component: ModelViewerComponent;
    let fixture: ComponentFixture<ModelViewerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ModelViewerComponent],
            providers: [provideNoopAnimations(),
            { provide: ModelsLoaderService, useClass: MockModelsLoaderService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ModelViewerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

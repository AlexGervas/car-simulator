import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderComponent } from './loader.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ModelsLoaderService } from '../../core/services/models-loader.service';

class MockModelsLoaderService {
    isLoading$ = of(false);
}

describe('LoaderComponent', () => {
    let component: LoaderComponent;
    let fixture: ComponentFixture<LoaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoaderComponent],
            providers: [
                provideNoopAnimations(),
                { provide: ModelsLoaderService, useClass: MockModelsLoaderService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarComponent } from './car.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('CarComponent', () => {
    let component: CarComponent;
    let fixture: ComponentFixture<CarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CarComponent],
            providers: [
                provideNoopAnimations(),
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

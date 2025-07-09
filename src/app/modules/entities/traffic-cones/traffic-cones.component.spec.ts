import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrafficConesComponent } from './traffic-cones.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('TrafficConesComponent', () => {
    let component: TrafficConesComponent;
    let fixture: ComponentFixture<TrafficConesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrafficConesComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TrafficConesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

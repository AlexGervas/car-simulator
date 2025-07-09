import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StopLineComponent } from './stop-line.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('StopLineComponent', () => {
    let component: StopLineComponent;
    let fixture: ComponentFixture<StopLineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [StopLineComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StopLineComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroundComponent } from './ground.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('GroundComponent', () => {
    let component: GroundComponent;
    let fixture: ComponentFixture<GroundComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GroundComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(GroundComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

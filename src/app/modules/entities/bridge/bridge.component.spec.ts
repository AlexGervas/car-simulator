import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BridgeComponent } from './bridge.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('BridgeComponent', () => {
    let component: BridgeComponent;
    let fixture: ComponentFixture<BridgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BridgeComponent],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BridgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});

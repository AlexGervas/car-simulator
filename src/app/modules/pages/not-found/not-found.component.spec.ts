import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotFoundComponent } from './not-found.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('NotFoundComponent', () => {
    let component: NotFoundComponent;
    let fixture: ComponentFixture<NotFoundComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NotFoundComponent],
            providers: [provideNoopAnimations()]
        }).compileComponents();

        fixture = TestBed.createComponent(NotFoundComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('initialization', () => {
        it('should create the component', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('template rendering', () => {
        it('should render the 404 image', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const img = compiled.querySelector('img');
            expect(img).toBeTruthy();
        });

        it('should have correct image src', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const img = compiled.querySelector('img');
            expect(img?.getAttribute('src')).toBe('404.png');
        });

        it('should have an alt attribute on the image', () => {
            const compiled = fixture.nativeElement as HTMLElement;
            const img = compiled.querySelector('img');
            expect(img?.hasAttribute('alt')).toBeTrue();
        });

    });
});

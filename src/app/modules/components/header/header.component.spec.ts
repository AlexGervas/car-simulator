import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { By } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let authService: AuthService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                HeaderComponent,
                RouterTestingModule,
                MatToolbarModule,
                MatSidenavModule,
                MatIconModule,
                MatButtonModule,
                HttpClientTestingModule
            ],
            providers: [
                provideNoopAnimations()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        authService = TestBed.inject(AuthService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should show menu button and sidenav when user is authenticated', () => {
        spyOn(component, 'isAuthenticated').and.returnValue(true);
        fixture.detectChanges();

        const button = fixture.debugElement.query(By.css('.burger-button')).nativeElement as HTMLButtonElement;
        const sidenav = fixture.debugElement.query(By.css('mat-sidenav')).nativeElement as HTMLElement;

        expect(button).toBeTruthy();
        expect(button.hidden).toBeFalse();
        expect(sidenav.hidden).toBeFalse();
    });

    it('should not show menu button and sidenav when user is not authenticated', () => {
        spyOn(component, 'isAuthenticated').and.returnValue(false);
        fixture.detectChanges();

        const button = fixture.debugElement.query(By.css('.burger-button'));
        const sidenav = fixture.debugElement.query(By.css('mat-sidenav'));

        expect(button).toBeNull();
        expect(sidenav).toBeTruthy();
        expect(sidenav.nativeElement.hidden).toBeTrue();
    });

    it('should call goToHome when logo is clicked', () => {
        spyOn(component, 'goToHome');
        const logo = fixture.debugElement.query(By.css('.menu-logo')).nativeElement;

        logo.click();
        expect(component.goToHome).toHaveBeenCalled();
    });
});

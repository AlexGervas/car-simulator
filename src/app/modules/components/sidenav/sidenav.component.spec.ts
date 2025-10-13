import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidenavComponent } from './sidenav.component';
import { NoopAnimationsModule, provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatListModule } from '@angular/material/list';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDrawerToggleResult, MatSidenav } from '@angular/material/sidenav';

describe('SidenavComponent', () => {
    let component: SidenavComponent;
    let fixture: ComponentFixture<SidenavComponent>;
    let routerSpy: jasmine.SpyObj<Router>;
    let authSpy: jasmine.SpyObj<AuthService>;
    let sidenavMock: jasmine.SpyObj<MatSidenav>;

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        authSpy = jasmine.createSpyObj('AuthService', ['logout']);
        sidenavMock = jasmine.createSpyObj('MatSidenav', ['close']);

        await TestBed.configureTestingModule({
            imports: [SidenavComponent, MatListModule, MatIconModule, MatDividerModule, HttpClientTestingModule, NoopAnimationsModule],
            providers: [
                provideNoopAnimations(),
                { provide: Router, useValue: routerSpy },
                { provide: AuthService, useValue: authSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SidenavComponent);
        component = fixture.componentInstance;
        component.sidenav = sidenavMock;

        sidenavMock.close.and.returnValue(Promise.resolve('close' as MatDrawerToggleResult));
        routerSpy.navigate.and.returnValue(Promise.resolve(true));

        fixture.detectChanges();
    });

    describe('Component creation', () => {
        it('should create the component', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Navigation actions', () => {
        it('should navigate to /home and close sidenav', async () => {
            await component.navigateToHome();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
            expect(sidenavMock.close).toHaveBeenCalled();
        });

        it('should navigate to /game and close sidenav', async () => {
            await component.navigateToLevelsPage();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/game']);
            expect(sidenavMock.close).toHaveBeenCalled();
        });
    });

    describe('Logout', () => {
        it('should close sidenav, logout, and navigate to /login', async () => {
            await component.logout();

            expect(sidenavMock.close).toHaveBeenCalled();
            expect(authSpy.logout).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
        });
    });

});

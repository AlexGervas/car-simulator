import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../../core/services/auth.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let dialogServiceSpy: jasmine.SpyObj<DialogService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    dialogServiceSpy = jasmine.createSpyObj('DialogService', ['openDialog']);

    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        RouterTestingModule.withRoutes([]),
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: DialogService, useValue: dialogServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should call authService.login when form is valid and submitted', () => {
    const email = 'test@example.com';
    const password = 'password123';
    component.loginForm.setValue({ email, password });

    authServiceSpy.login.and.returnValue(of({ token: 'fake-jwt-token' }));

    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith(email, password);
  });

  it('should navigate to /home on successful login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    component.loginForm.setValue({ email, password });

    authServiceSpy.login.and.returnValue(of({ token: 'fake-jwt-token' }));

    const routerSpy = spyOn(router, 'navigate');

    component.onSubmit();

    expect(routerSpy).toHaveBeenCalledWith(['/home']);
  });

  it('should call dialogService.openDialog on login error', () => {
    const email = 'wrong@example.com';
    const password = 'wrongpass';
    component.loginForm.setValue({ email, password });

    authServiceSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));

    component.onSubmit();

    expect(dialogServiceSpy.openDialog).toHaveBeenCalledWith(
      'Ошибка авторизации',
      'Неверный email или пароль',
      false
    );
  });

  it('should toggle password visibility when eye icon is clicked', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="password"]');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[mat-icon-button]');

    expect(component.hide).toBeTrue();
    expect(input.type).toBe('password');

    button.click();
    fixture.detectChanges();

    expect(component.hide).toBeFalse();
    expect(input.type).toBe('text');

    button.click();
    fixture.detectChanges();

    expect(component.hide).toBeTrue();
    expect(input.type).toBe('password');
  });


});

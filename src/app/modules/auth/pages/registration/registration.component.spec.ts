import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RegistrationComponent } from './registration.component';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from '../login/login.component';
import { ApiService } from '../../../../core/services/api.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';

describe('RegistrationComponent', () => {
  let component: RegistrationComponent;
  let fixture: ComponentFixture<RegistrationComponent>;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let dialogSpy: jasmine.SpyObj<DialogService>;
  let router: Router;

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', ['createUser']);
    dialogSpy = jasmine.createSpyObj('DialogService', ['openDialogWithRef']);

    await TestBed.configureTestingModule({
      imports: [
        RegistrationComponent,
        RouterTestingModule.withRoutes([
          { path: 'login', component: LoginComponent }
        ]),
        NoopAnimationsModule,
      ],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: DialogService, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.registrationForm.valid).toBeFalse();
  });

  describe('check required error message for name inouts', () => {
    it('should show required error for first name', () => {
      const control = component.registrationForm.get('userFirstName');
      control?.markAsTouched();
      control?.setValue('');
      fixture.detectChanges();
      expect(component.getErrorMessage('userFirstName')).toBe(component.errorMsg['required']);
    });

    it('should show required error for last name', () => {
      const control = component.registrationForm.get('userLastName');
      control?.markAsTouched();
      control?.setValue('');
      fixture.detectChanges();
      expect(component.getErrorMessage('userLastName')).toBe(component.errorMsg['required']);
    });
  });

  describe('check password validation', () => {
    it('should show required error when password is empty', () => {
      const control = component.registrationForm.get('password');
      control?.markAsTouched();
      control?.setValue('');
      fixture.detectChanges();
      expect(component.getErrorMessage('password')).toBe(component.errorMsg['required']);
    });

    it('should show minlength error when password is too short', () => {
      const control = component.registrationForm.get('password');
      control?.setValue('123');
      fixture.detectChanges();
      expect(control?.hasError('minlength')).toBeTrue();
      expect(component.getErrorMessage('password')).toBe(component.errorMsg['minlength']);
    });

    it('should detect password mismatch', () => {
      const passwordControl = component.registrationForm.get('password');
      const confirmControl = component.registrationForm.get('confirmPassword');

      passwordControl?.setValue('Valid123!');
      confirmControl?.setValue('Other123!');
      fixture.detectChanges();

      expect(component.getErrorMessage('confirmPassword')).toBe(component.errorMsg['mismatchpasswords']);

      confirmControl?.setValue('Valid123!');
      fixture.detectChanges();
      expect(component.getErrorMessage('confirmPassword')).toBeNull();
    });

    it('should validate password length correctly', () => {
      const passwordControl = component.registrationForm.get('password');
      const confirmControl = component.registrationForm.get('confirmPassword');

      passwordControl?.setValue('123');
      confirmControl?.setValue('123');
      fixture.detectChanges();

      expect(passwordControl?.hasError('minlength')).toBeTrue();

      passwordControl?.setValue('Valid123!');
      confirmControl?.setValue('Valid123!');
      fixture.detectChanges();

      expect(passwordControl?.hasError('minlength')).toBeFalse();
      expect(passwordControl?.valid).toBeTrue();
    });

  });

  describe('check email validation', () => {
    it('should show required error when email is empty', () => {
      const control = component.registrationForm.get('email');
      control?.markAsTouched();
      control?.setValue('');
      fixture.detectChanges();
      expect(component.getErrorMessage('email')).toBe(component.errorMsg['required']);
    });

    it('should show invalid error when email format is wrong', () => {
      const control = component.registrationForm.get('email');
      control?.setValue('wrongEmail');
      fixture.detectChanges();
      expect(component.getErrorMessage('email')).toBe(component.errorMsg['email']);
    });

    it('should accept valid email', () => {
      const control = component.registrationForm.get('email');
      control?.setValue('valid@mail.com');
      fixture.detectChanges();
      expect(component.getErrorMessage('email')).toBeNull();
    });

  });

  describe('onSubmit', () => {
    it('should call ApiService and navigate to /login on successful registration', fakeAsync(() => {
      const mockUser = {
        userId: 1,
        userfirstname: 'Иван',
        userlastname: 'Иванов',
        email: 'ivan@test.com',
        password_hash: '',
        isTelegram: false,
        username: ''
      };

      apiSpy.createUser.and.returnValue(of(mockUser));
      const dialogRefSpy = { afterClosed: () => of(true) };
      dialogSpy.openDialogWithRef.and.returnValue(dialogRefSpy as any);
      spyOn(router, 'navigate');

      component.registrationForm.setValue({
        userFirstName: 'Иван',
        userLastName: 'Иванов',
        email: 'ivan@test.com',
        password: 'Valid123!',
        confirmPassword: 'Valid123!'
      });

      component.onSubmit();
      tick();

      expect(apiSpy.createUser).toHaveBeenCalledWith(jasmine.objectContaining({
        userfirstname: 'Иван',
        userlastname: 'Иванов',
        email: 'ivan@test.com'
      }));
      expect(dialogSpy.openDialogWithRef).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));


  });

});

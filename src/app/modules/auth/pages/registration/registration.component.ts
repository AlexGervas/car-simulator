import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { ErrorMessages } from '../../../../core/models/error-messages';
import { ApiService } from '../../../../core/services/api.service';
import { User } from '../../../../core/models/user';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIcon, RouterModule],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css'
})
export class RegistrationComponent implements OnInit {

  public registrationForm!: FormGroup;
  public minLengthPass: number = 8;
  public hide: boolean = true;
  public hideConfirm: boolean = true;
  public errorMsg = ErrorMessages;

  constructor(private formBuilder: FormBuilder, private api: ApiService, private dialogService: DialogService, private router: Router) { }

  ngOnInit() {
    this.registrationForm = this.formBuilder.group({
      userFirstName: ['', [Validators.required]],
      userLastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(this.minLengthPass),
        Validators.pattern(/(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(){}":>?<~!"№;%:?*()]).{6,}/)
      ]],
      confirmPassword: ['', Validators.required]
    },
      { validators: this.checkPasswords.bind(this) }
    );
  }

  public onSubmit(): void {
    if (this.registrationForm.valid) {
      const user: User = {
        userfirstname: this.registrationForm.value.userFirstName,
        userlastname: this.registrationForm.value.userlastname,
        email: this.registrationForm.value.email,
        password_hash: this.registrationForm.value.password,
        userId: 0,
        isTelegram: false,
        username: ''
      };

      this.api.createUser(user).subscribe({
        next: () => {
          const dialogRef = this.dialogService.openDialogWithRef('Вы успешно зарегистрировались!', 'Перейдите на страницу входа, чтобы авторизоваться.', false);
          dialogRef.afterClosed().subscribe(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (err) => console.error(`Error create user from web:`, err)
      });
    }
  }

  public getErrorMessage(controlName: string): string | null {
    const control = this.registrationForm.get(controlName);

    if (control && control.errors) {
      const firstErrorKey = Object.keys(control.errors)[0];
      return this.errorMsg[firstErrorKey];
    }

    return null;
  }

  private checkPasswords(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      password.setErrors({ ...(password.errors || {}), mismatchpasswords: true });
      confirmPassword.setErrors({ ...(confirmPassword.errors || {}), mismatchpasswords: true });
    } else {
      if (password.hasError('mismatchpasswords')) {
        const errors = { ...(password.errors || {}) };
        delete errors['mismatchpasswords'];
        password.setErrors(Object.keys(errors).length ? errors : null);
      }
      if (confirmPassword.hasError('mismatchpasswords')) {
        const errors = { ...(confirmPassword.errors || {}) };
        delete errors['mismatchpasswords'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
    return null;
  }

}

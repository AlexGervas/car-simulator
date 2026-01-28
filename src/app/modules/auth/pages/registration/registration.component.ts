import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ErrorMessages } from '../../../../core/models/error-messages';
import { ApiService } from '../../../../core/services/api.service';
import { TelegramAuthEvent, User } from '../../../../core/models/types';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    RouterModule,
  ],
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css',
})
export class RegistrationComponent implements OnInit {
  public registrationForm!: FormGroup;
  public minLengthPass: number = 8;
  public hide: boolean = true;
  public hideConfirm: boolean = true;
  public errorMsg = ErrorMessages;

  private tgId?: string;
  private tgHash?: string;
  private tgAuthDate?: string;
  private tgUsername?: string;

  constructor(
    private formBuilder: FormBuilder,
    private api: ApiService,
    private dialogService: DialogService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initRegistrationForm();
    this.handleQueryParams();
    this.initTelegramLoginWidget();
  }

  private initRegistrationForm(): void {
    this.registrationForm = this.formBuilder.group(
      {
        userFirstName: ['', [Validators.required]],
        userLastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(this.minLengthPass),
            Validators.pattern(
              /(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*(){}":>?<~!"№;%:?*()]).{6,}/
            ),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.checkPasswords.bind(this) }
    );
  }

  private handleQueryParams(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['first_name']) {
        this.registrationForm.patchValue({
          userFirstName: params['first_name'],
        });
      }
      if (params['last_name']) {
        this.registrationForm.patchValue({ userLastName: params['last_name'] });
      }
      if (params['email']) {
        this.registrationForm.patchValue({ email: params['email'] });
      }
      if (params['telegram_id']) {
        this.tgId = String(params['telegram_id']);
      }
    });
  }

  private initTelegramLoginWidget(): void {
    if (window.location.hostname === 'localhost') {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'CarDrivingSimulatorBot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.async = true;

    document.getElementById('telegram-login-container')?.appendChild(script);

    window.addEventListener('telegramAuth', (event: Event) => {
      const telegramEvent = event as TelegramAuthEvent;
      const u = telegramEvent.detail;
      this.tgId = String(u.id);
      this.tgUsername = u.username || '';
      this.tgAuthDate = String(u.auth_date);
      this.tgHash = u.hash;

      this.registrationForm.patchValue({
        userFirstName:
          u.first_name || this.registrationForm.value.userFirstName,
        userLastName: u.last_name || this.registrationForm.value.userLastName,
      });
    });
  }

  public onSubmit(): void {
    if (this.registrationForm.valid) {
      const user: User = {
        isTelegram: !!this.tgId,
        userfirstname: this.registrationForm.value.userFirstName,
        userlastname: this.registrationForm.value.userLastName,
        email: this.registrationForm.value.email,
        password_plain: this.registrationForm.value.password,
        telegram_id: this.tgId || null,
        telegram_username: this.tgUsername || null,
        telegram_auth_date: this.tgAuthDate || null,
        telegram_hash: this.tgHash || null,
        userId: 0,
      };

      this.api.createUser(user).subscribe({
        next: () => {
          const dialogRef = this.dialogService.openDialogWithRef(
            'Вы успешно зарегистрировались!',
            'Перейдите на страницу входа, чтобы авторизоваться.',
            false
          );
          dialogRef.afterClosed().subscribe(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (err) => console.error(`Error create user from web:`, err),
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
      password.setErrors({
        ...(password.errors || {}),
        mismatchpasswords: true,
      });
      confirmPassword.setErrors({
        ...(confirmPassword.errors || {}),
        mismatchpasswords: true,
      });
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

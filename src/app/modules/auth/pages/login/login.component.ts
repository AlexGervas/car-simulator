import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  public loginForm!: FormGroup;
  public minLengthPass: number = 8;
  public errorMsg = 'Поле обязательно для заполнения';

  constructor(private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialogService: DialogService) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(this.minLengthPass)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      console.log('Login data:', this.loginForm.value);

      this.authService.login(email, password).subscribe({
        next: () => {
          this.router.navigate(['/menu']);
        },
        error: (err: any) => {
          console.error(err);
          this.dialogService.openDialog('Ошибка авторизации', 'Неверный email или пароль', false);
        }
      });

    }
  }

}

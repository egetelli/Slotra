import { Component, signal, inject } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Mod Kontrolü (Giriş mi? Kayıt mı?)
  isLoginMode = signal(true);
  showRegPassword = signal(false);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showShakeAnimation = signal(false);

  // --- GİRİŞ FORMU ---
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  // --- KAYIT FORMU ---
  registerForm = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['customer', [Validators.required]], // Varsayılan: Müşteri
  });

  // Giriş Getter'ları
  get emailCtrl() {
    return this.loginForm.controls.email;
  }
  get passCtrl() {
    return this.loginForm.controls.password;
  }

  // Kayıt Getter'ları
  get regNameCtrl() {
    return this.registerForm.controls.full_name;
  }
  get regEmailCtrl() {
    return this.registerForm.controls.email;
  }
  get regPassCtrl() {
    return this.registerForm.controls.password;
  }

  triggerErrorAnimation() {
    this.showShakeAnimation.set(true);
    setTimeout(() => this.showShakeAnimation.set(false), 500);
  }

  // Mod Değiştirme (Giriş <-> Kayıt)
  toggleMode() {
    this.isLoginMode.set(!this.isLoginMode());
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loginForm.reset();
    this.registerForm.reset({ role: 'customer' });
  }

  handleLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.triggerErrorAnimation();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.',
        );
        this.isLoading.set(false);
        this.triggerErrorAnimation();
      },
    });
  }

  handleRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.triggerErrorAnimation();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const userData = this.registerForm.getRawValue();

    // Service'te oluşturduğumuz register metodunu çağırıyoruz
    this.authService.register(userData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set(
          'Kaydınız başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.',
        );

        // 2 saniye sonra otomatik login ekranına atalım
        setTimeout(() => {
          this.isLoginMode.set(true);
          this.successMessage.set(null);
        }, 2500);
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Kayıt işlemi başarısız oldu.',
        );
        this.isLoading.set(false);
        this.triggerErrorAnimation();
      },
    });
  }

  toggleRegPassword() {
    this.showRegPassword.set(!this.showRegPassword());
  }
}

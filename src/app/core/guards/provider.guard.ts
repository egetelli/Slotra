import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // AuthService'inin olduğunu varsayıyorum

export const providerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // AuthService'den kullanıcının rolünü çekiyoruz (JWT içinden veya state'den)
  const userRole = authService.user()?.role;

  if (userRole === 'provider') {
    return true; // Geçebilirsin
  }

  // Eğer müşteri girmeye çalışırsa ana sayfaya veya "Yetkiniz yok" sayfasına at
  router.navigate(['/dashboard']);
  return false;
};

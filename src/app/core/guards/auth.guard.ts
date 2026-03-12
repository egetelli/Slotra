import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // RAM'de token var mı kontrol et (Signal üzerinden okunur)
  if (authService.isAuthenticated()) {
    return true;
  }

  // Yoksa Login sayfasına yönlendir
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token(); // Artık RAM'den geliyor!

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
  } else {
    // Token yoksa bile cookie'leri taşımak için
    req = req.clone({ withCredentials: true });
  }

  return next(req);
};

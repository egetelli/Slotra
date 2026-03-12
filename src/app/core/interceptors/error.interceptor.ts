import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Yenileme işleminin durumunu ve yeni token'ı takip etmek için
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Sadece 401 hatalarını ve login/refresh dışındaki istekleri yakala
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh')
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null); // Bekleyen istekleri durdur

          return authService.silentRefresh().pipe(
            switchMap((res) => {
              isRefreshing = false;
              if (res && res.accessToken) {
                refreshTokenSubject.next(res.accessToken); // Bekleyen isteklere yeşil ışık yak

                // Başarısız olan orijinal isteği yeni token ile klonla ve tekrar gönder
                return next(
                  req.clone({
                    setHeaders: { Authorization: `Bearer ${res.accessToken}` },
                  }),
                );
              }
              // Refresh başarısızsa (örn: Cookie de bitmişse) çıkış yap
              authService.logout().subscribe();
              return throwError(() => new Error('Oturum süresi doldu.'));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              authService.logout().subscribe();
              return throwError(() => refreshErr);
            }),
          );
        } else {
          // Eğer zaten bir yenileme işlemi devam ediyorsa, yeni token gelene kadar bekle
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              return next(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${token}` },
                }),
              );
            }),
          );
        }
      }

      // 401 dışındaki hataları doğrudan fırlat
      return throwError(() => error);
    }),
  );
};

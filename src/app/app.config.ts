import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AuthService } from './core/services/auth.service';
import { firstValueFrom } from 'rxjs';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export function initializeAuth(): () => Promise<any> {
  const authService = inject(AuthService);
  return () => firstValueFrom(authService.silentRefresh());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    // APP_INITIALIZER'ı sisteme dahil ediyoruz
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};

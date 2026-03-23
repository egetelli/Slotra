import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // 1. Ana Yönlendirme
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },

  // 2. Herkese Açık Rotalar (Public)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },

  // 3. 🛡️ KORUMALI ROTALAR GRUBU
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
      },
      // YENİ EKLENEN ROTA 👇
      {
        path: 'appointments',
        loadComponent: () =>
          import('./features/appointments/appointments.component').then(
            (m) => m.AppointmentsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
        canActivate: [roleGuard],
      },
    ],
  },

  // 4. Bulunamayan Sayfalar (404 Fallback)
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

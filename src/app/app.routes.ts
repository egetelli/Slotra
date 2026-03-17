import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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

  // 3. 🛡️ KORUMALI ROTALAR GRUBU (Guard Sadece Burada!)
  {
    path: '', // Boş path ile görünmez bir kapsayıcı oluşturuyoruz
    canActivate: [authGuard], // Zero-Storage Guard'ımız kapıda bekliyor!
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
      // İleride 'clients', 'settings' gibi sayfaları da buraya ekleyeceğiz.
      // Hepsi otomatik olarak authGuard tarafından korunacak!
    ],
  },

  // 4. Bulunamayan Sayfalar (404 Fallback)
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

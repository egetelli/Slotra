import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard], // Zero-Storage Guard'ımız devrede!
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    children: [
      // İleride buraya Takvim, Randevular vb. alt rotalar gelecek
      // { path: 'calendar', loadComponent: ... }
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  }, // Bilinmeyen URL'leri dashboard'a at
];

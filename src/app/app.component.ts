import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router'; // Router eklendi
import { CommonModule } from '@angular/common';

import { AuthService } from './core/services/auth.service';
import { UiService } from './core/services/ui.service';
import { AppointmentService } from './core/services/appointment.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Slotra';

  // Servisleri Inject ediyoruz
  authService = inject(AuthService);
  uiService = inject(UiService);
  appointmentService = inject(AppointmentService);
  router = inject(Router); // 🌟 Router servisi inject edildi!

  currentTime = signal(new Date());
  private timer: any;

  isSidebarOpen = signal(false);

  menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      roles: ['admin', 'provider', 'customer'],
    },
    {
      name: 'Appointments',
      path: '/appointments',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      roles: ['admin', 'provider', 'customer'],
    },
    {
      name: 'Calendar',
      path: '/calendar',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      roles: ['admin', 'provider', 'customer'],
    },
    {
      name: 'Clients',
      path: '/clients',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      roles: ['admin', 'provider'], // 🔒 Müşteriye kapalı
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: 'M3 3v18h18M7 13v5M12 9v9M17 5v13',
      roles: ['admin', 'provider'], // Genelde müşteriye gösterilmez
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      roles: ['admin', 'provider'], // 🔒 Müşteriye kapalı
    },
  ];

  greeting = computed(() => {
    const hour = this.currentTime().getHours();
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 18) return 'İyi Günler';
    if (hour >= 18 && hour < 23) return 'İyi Akşamlar';
    return 'İyi Geceler';
  });

  userInitials = computed(() => {
    const name = this.authService.user()?.full_name || 'Admin User';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  });

  ngOnInit(): void {
    this.authService.silentRefresh().subscribe();
    this.timer = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    // Sayfa değiştirildiğinde arka planda çalışmaya devam etmemesi için zamanlayıcıyı temizliyoruz
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  // 🌟 Düzeltilmiş Logout Metodu
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        // Çıkış başarılıysa login'e at ve sidebar'ı kapat
        this.router.navigate(['/login']);
        this.closeSidebar();
      },
      error: (err) => {
        // Hata verse bile (örn. token zaten geçersizse) kullanıcıyı içeride tutma, dışarı at.
        console.error('Çıkış yapılırken bir hata oluştu:', err);
        this.router.navigate(['/login']);
        this.closeSidebar();
      },
    });
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  onApproveClick(id: string) {
    this.uiService.openConfirm(
      'Randevuyu Onayla',
      'Emin misiniz?',
      'success',
      () => {
        this.appointmentService.approveAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast('Başarıyla onaylandı', 'success');
            this.uiService.closeConfirm();
          },
          error: (err) => {
            this.uiService.showToast(
              err.error?.message || 'Onaylama sırasında bir hata oluştu!',
              'error',
            );
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }

  onCancelClick(id: string) {
    this.uiService.openConfirm(
      'Randevuyu İptal Et',
      'Bu randevuyu iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      'danger',
      () => {
        this.appointmentService.cancelAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast(
              'Randevu başarıyla iptal edildi.',
              'success',
            );
            this.uiService.closeConfirm();
          },
          error: (err) => {
            this.uiService.showToast(
              err.error?.message || 'Yetki hatası!',
              'error',
            );
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }
}

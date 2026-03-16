import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'; // Form işlemleri eklendi
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProviderService } from '../../../core/services/provider.service';
import { ServiceService } from '../../../core/services/service.service';
import { Provider } from '../../../core/models/provider.model';
import { ServiceItem } from '../../../core/models/service-item.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule], // ReactiveFormsModule eklendi
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Servisleri Inject ediyoruz
  private providerService = inject(ProviderService);
  private serviceService = inject(ServiceService);

  // Verileri tutacağımız Signal'ler
  providers = signal<Provider[]>([]);
  services = signal<ServiceItem[]>([]);

  // Menü Yönetimi
  activeTab = signal('Dashboard');
  menuItems = [
    {
      name: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      name: 'Appointments',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      name: 'Calendar',
      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    },
    {
      name: 'Clients',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      name: 'Analytics',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      name: 'Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    },
  ];

  // Modal ve Form State
  showCreateModal = signal(false);
  isCreating = signal(false);

  // Randevu Oluşturma Formu (Backend payload'ı ile birebir uyumlu)
  appointmentForm = this.fb.group({
    providerId: ['', Validators.required],
    serviceId: ['', Validators.required],
    slotTime: ['', Validators.required],
  });

  ngOnInit() {
    // 1. Sayfa açıldığında mevcut randevuları yükle
    this.appointmentService.fetchUpcomingAppointments();

    // 2. Sadece uzmanları (Providers) yükle (Hizmetleri BAŞLANGIÇTA YÜKLEMİYORUZ)
    this.providerService.getProviders().subscribe({
      next: (data) => this.providers.set(data),
      error: (err) => console.error('Uzmanlar yüklenemedi', err),
    });

    // 3. Formdaki 'providerId' seçimini anlık dinle! (Cascading Büyüsü)
    this.appointmentForm
      .get('providerId')
      ?.valueChanges.subscribe((selectedProviderId) => {
        if (selectedProviderId) {
          // Yeni uzman seçildi! Önce alttaki hizmet seçimini temizle
          this.appointmentForm.get('serviceId')?.reset('');

          // Sadece bu uzmana ait hizmetleri getir ve services sinyaline bas
          this.serviceService
            .getServicesByProvider(selectedProviderId)
            .subscribe({
              next: (data) => this.services.set(data),
              error: (err) => console.error('Hizmetler yüklenemedi', err),
            });
        }
      });
  }

  loadProviders() {
    this.providerService.getProviders().subscribe({
      next: (data) => this.providers.set(data),
      error: (err) => console.error('Uzmanlar yüklenemedi', err),
    });
  }

  loadServices() {
    this.serviceService.getActiveServices().subscribe({
      next: (data) => this.services.set(data),
      error: (err) => console.error('Hizmetler yüklenemedi', err),
    });
  }

  userInitials() {
    const name = this.authService.user()?.full_name || 'U';
    return name.charAt(0).toUpperCase();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'booked':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
        return 'bg-rose-100 text-rose-700';
      case 'completed':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      booked: 'Onaylandı',
      pending: 'Bekliyor',
      cancelled: 'İptal',
      completed: 'Tamamlandı',
    };
    return statusMap[status] || status;
  }

  // YENİ: Modal Fonksiyonları
  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.appointmentForm.reset(); // Kapatınca formu temizle
  }

  // YENİ: Randevuyu Backend'e Gönderme
  submitNewAppointment() {
    if (this.appointmentForm.invalid) return;

    this.isCreating.set(true);

    const formValues = this.appointmentForm.getRawValue();

    // datetime-local input'undan gelen veriyi (örn: 2026-03-10T09:00)
    // ISO formatına (backend'in istediği Z formatına) çeviriyoruz.
    const payload = {
      providerId: formValues.providerId!,
      serviceId: formValues.serviceId!,
      slotTime: new Date(formValues.slotTime!).toISOString(),
    };

    // Gerçek API isteğini atıyoruz
    this.appointmentService.createAppointment(payload).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        // Sayfayı yenilemeye gerek kalmadan servis sinyali güncellediği için tablo anında dolacak!
      },
      error: (err) => {
        console.error('Randevu oluşturulamadı:', err);
        this.isCreating.set(false);
        alert(err.error?.message || 'Randevu oluşturulurken bir hata oluştu.');
      },
    });
  }

  // Randevu İptal İşlemi
  cancelAppointment(appointmentId: string) {
    // Yanlışlıkla tıklamaları önlemek için yerleşik tarayıcı onayı
    const isConfirmed = window.confirm(
      'Bu randevuyu iptal etmek istediğinize emin misiniz?',
    );

    if (isConfirmed) {
      this.appointmentService.cancelAppointment(appointmentId).subscribe({
        next: () => {
          // Servisteki 'tap' operatörü sinyali zaten güncelliyor.
          // Tablodaki durum anında "İptal" olarak değişecek!
          console.log('Randevu başarıyla iptal edildi.');
        },
        error: (err) => {
          console.error('İptal işlemi başarısız:', err);
          alert(
            err.error?.message || 'Randevu iptal edilirken bir hata oluştu.',
          );
        },
      });
    }
  }
}

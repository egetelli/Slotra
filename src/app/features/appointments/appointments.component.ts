import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Dropdown ngModel için eklendi
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
})
export class AppointmentsComponent implements OnInit {
  appointmentService = inject(AppointmentService);
  authService = inject(AuthService);
  adminService = inject(AdminService);
  uiService = inject(UiService);

  // Admin State
  providers = signal<any[]>([]);
  selectedProviderId = signal<string>('');
  appointments = signal<any[]>([]); // Sadece admin için çekilen randevular
  isLoading = signal(false);

  isAdmin = computed(() => this.authService.user()?.role === 'admin');

  // AKILLI SİNYALLER: Adminse yerel veriyi, değilse normal servisin verisini okur.
  displayedAppointments = computed(() => {
    return this.isAdmin()
      ? this.appointments()
      : this.appointmentService.appointments();
  });

  displayedLoading = computed(() => {
    return this.isAdmin()
      ? this.isLoading()
      : this.appointmentService.isLoading();
  });

  ngOnInit() {
    if (this.isAdmin()) {
      this.loadProviders();
      this.loadAppointments(); // Sayfa ilk açıldığında tüm randevuları getir
    } else {
      // Normal uzman veya müşteri girdiğinde kendi servisi verileri çeker
      // (appointmentService.getAppointments vs. gibi bir metodun varsa buraya yazabilirsin)
    }
  }

  loadProviders() {
    this.adminService.getUsers().subscribe((users) => {
      this.providers.set(users.filter((u) => u.role === 'provider'));
    });
  }

  onProviderChange(id: string) {
    this.selectedProviderId.set(id);
    this.loadAppointments(id);
  }

  loadAppointments(providerId?: string) {
    if (!this.isAdmin()) return; // Sadece admin bu servisi kullanabilir

    this.isLoading.set(true);
    this.adminService.getAppointments(providerId).subscribe({
      next: (data) => {
        this.appointments.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-600',
      booked: 'bg-emerald-100 text-emerald-600',
      cancelled: 'bg-rose-100 text-rose-600',
      completed: 'bg-slate-100 text-slate-600',
    };
    return classes[status] || 'bg-slate-100 text-slate-600';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      pending: 'Onay Bekliyor',
      booked: 'Onaylandı',
      cancelled: 'İptal',
      completed: 'Tamamlandı',
    };
    return texts[status] || status;
  }

  approveAppointment(id: string) {
    this.uiService.openConfirm(
      'Randevuyu Onayla',
      'Bu randevuyu onaylamak istediğinize emin misiniz? Müşteriye bildirim gönderilecektir.',
      'success',
      () => {
        this.appointmentService.approveAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast('Randevu başarıyla onaylandı!', 'success');
            if (this.isAdmin())
              this.loadAppointments(this.selectedProviderId()); // Admin tablosunu yenile
          },
          error: (err) =>
            this.uiService.showToast(err.error?.message || 'Hata!', 'error'),
        });
      },
    );
  }

  cancelAppointment(id: string) {
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
            if (this.isAdmin())
              this.loadAppointments(this.selectedProviderId()); // Admin tablosunu yenile
          },
          error: (err) =>
            this.uiService.showToast(err.error?.message || 'Hata!', 'error'),
        });
      },
    );
  }
}

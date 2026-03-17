import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments.component.html',
})
export class AppointmentsComponent {
  appointmentService = inject(AppointmentService);
  authService = inject(AuthService);
  uiService = inject(UiService);

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
            this.uiService.closeConfirm();
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
            this.uiService.closeConfirm();
          },
          error: (err) =>
            this.uiService.showToast(err.error?.message || 'Hata!', 'error'),
        });
      },
    );
  }
}

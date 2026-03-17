import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';
import { UiService } from './core/services/ui.service';
import { AppointmentService } from './core/services/appointment.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'Slotra';
  private authService = inject(AuthService);
  uiService = inject(UiService);
  appointmentService = inject(AppointmentService);

  ngOnInit(): void {
    this.authService.silentRefresh().subscribe();
  }

  onApproveClick(id: string) {
    this.uiService.openConfirm(
      'Randevuyu Onayla',
      'Emin misiniz?',
      'success',
      () => {
        this.appointmentService.approveAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast('Başarıyla onaylandı');
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
            this.uiService.closeConfirm(); // Başarıda kapat
          },
          error: (err) => {
            // 🌟 Hata mesajını Toastr'a fırlat
            this.uiService.showToast(
              err.error?.message || 'Yetki hatası!',
              'error',
            );
            this.uiService.closeConfirm(); // Hata gelse bile modalı kapat ki kullanıcı takılı kalmasın
          },
        });
      },
    );
  }
}

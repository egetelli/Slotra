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
      'Bu işlem geri alınamaz.',
      'danger',
      () => {
        this.appointmentService.cancelAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast('Randevu iptal edildi');
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }
}

import {
  Component,
  inject,
  computed,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr'; // 🇹🇷 Türkçe Dil Paketi
import { AppointmentService } from '../../core/services/appointment.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  uiService = inject(UiService);

  // 🌟 MEVCUT MODAL (AÇILIR PENCERE) YÖNETİMİ
  isModalOpen = signal<boolean>(false);
  isModalClosing = signal<boolean>(false);
  selectedAppointment = signal<any>(null);

  // ==========================================
  // 🌟 YENİ: TOAST VE CONFIRM MODAL STATE'LERİ
  // ==========================================
  toast = signal<{
    show: boolean;
    isClosing: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    isClosing: false,
    message: '',
    type: 'success',
  });

  confirmDialog = signal<{
    show: boolean;
    isClosing: boolean;
    title: string;
    message: string;
    action: () => void;
    type: 'danger' | 'success';
  }>({
    show: false,
    isClosing: false,
    title: '',
    message: '',
    action: () => {},
    type: 'success',
  });

  // Takvim Kutucuklarını Besleyen Sinyal
  calendarEvents = computed(() => {
    return this.appointmentService.appointments().map((apt) => ({
      id: apt.id,
      start: apt.slot_time,
      end: apt.end_time,
      backgroundColor: this.getColorByStatus(apt.status),
      borderColor: 'transparent',
      extendedProps: { ...apt },
    }));
  });

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: trLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '21:00:00',
    allDaySlot: false,
    editable: false,
    selectable: true,
    nowIndicator: true,
    slotEventOverlap: false,

    eventContent: (arg) => {
      const apt = arg.event.extendedProps as any;
      return {
        html: `
          <div class="custom-calendar-event">
            <div class="event-title">${apt.customer_name}</div>
            <div class="event-subtitle">${apt.service_name}</div>
          </div>
        `,
      };
    },
    expandRows: true,
    eventMinHeight: 36,
    eventDisplay: 'block',
    eventClick: this.handleEventClick.bind(this),
    height: '70vh',
  };

  ngOnInit() {
    const userRole = this.authService.user()?.role;

    if (userRole === 'provider') {
      this.appointmentService.fetchProviderAppointments();
    } else {
      this.appointmentService.fetchUpcomingAppointments();
    }
  }

  private getColorByStatus(status: string): string {
    switch (status) {
      case 'booked':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#64748b';
    }
  }

  handleEventClick(clickInfo: any) {
    const apt = clickInfo.event.extendedProps;
    this.uiService.openDetail(apt); // 🌟 Sadece bu!
  }

  closeModal() {
    this.isModalClosing.set(true);
    setTimeout(() => {
      this.isModalOpen.set(false);
      this.isModalClosing.set(false);
      this.selectedAppointment.set(null);

      // 🌟 TEMİZLİK: Body'e eklediğimiz elemanı kaldır
      const modalElement = document.querySelector('.modal-wrapper');
      if (modalElement) {
        modalElement.remove();
      }
    }, 300);
  }

  // ==========================================
  // 🌟 UX/UI: YARDIMCI METOTLAR (TOAST & CONFIRM)
  // ==========================================

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast.set({ show: true, isClosing: false, message, type });
    setTimeout(() => this.closeToast(), 3000);
  }

  closeToast() {
    this.toast.update((t) => ({ ...t, isClosing: true }));
    setTimeout(() => {
      this.toast.update((t) => ({ ...t, show: false, isClosing: false }));
    }, 300);
  }

  openConfirm(
    title: string,
    message: string,
    type: 'danger' | 'success',
    action: () => void,
  ) {
    // Önce alttaki detay modalını kapatalım ki üst üste binmesinler
    this.closeModal();
    this.confirmDialog.set({
      show: true,
      isClosing: false,
      title,
      message,
      type,
      action,
    });
  }

  closeConfirm() {
    this.confirmDialog.update((c) => ({ ...c, isClosing: true }));
    setTimeout(() => {
      this.confirmDialog.update((c) => ({
        ...c,
        show: false,
        isClosing: false,
      }));
    }, 300);
  }

  executeConfirm() {
    this.confirmDialog().action();
    this.closeConfirm();
  }

  // ==========================================
  // 🌟 GÜNCELLENMİŞ AKSİYONLAR
  // ==========================================

  approve(id: string) {
    this.openConfirm(
      'Randevuyu Onayla',
      'Bu randevuyu onaylamak istediğinize emin misiniz?',
      'success',
      () => {
        this.appointmentService.approveAppointment(id).subscribe({
          next: () => {
            this.showToast('Randevu başarıyla onaylandı!', 'success');
          },
          error: (err) => {
            this.showToast(
              err.error?.message || 'Onaylanırken bir hata oluştu.',
              'error',
            );
          },
        });
      },
    );
  }

  cancel(id: string) {
    this.openConfirm(
      'Randevuyu İptal Et',
      'Bu randevuyu iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      'danger',
      () => {
        this.appointmentService.cancelAppointment(id).subscribe({
          next: () => {
            this.showToast('Randevu başarıyla iptal edildi.', 'success');
          },
          error: (err) => {
            this.showToast(
              err.error?.message || 'İptal edilirken bir hata oluştu.',
              'error',
            );
          },
        });
      },
    );
  }
}

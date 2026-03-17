import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr'; // 🇹🇷 Türkçe Dil Paketi
import { AppointmentService } from '../../core/services/appointment.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  private appointmentService = inject(AppointmentService);

  // 🌟 MODAL (AÇILIR PENCERE) YÖNETİMİ İÇİN SİNYALLER
  isModalOpen = signal<boolean>(false);
  selectedAppointment = signal<any>(null);

  // Takvim Kutucuklarını Besleyen Sinyal
  calendarEvents = computed(() => {
    return this.appointmentService.appointments().map((apt) => ({
      id: apt.id,
      // title kısmını siliyoruz, çünkü aşağıda 'eventContent' ile kendi özel tasarımımızı basacağız!
      start: apt.slot_time,
      end: apt.end_time,
      backgroundColor: this.getColorByStatus(apt.status),
      borderColor: 'transparent', // Çizgileri kaldırıp daha soft bir görünüm veriyoruz
      extendedProps: { ...apt },
    }));
  });

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: trLocale, // 🇹🇷 Takvimi tamamen Türkçe yapar (Pzt, Sal, vs.)
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
    nowIndicator: true, // 🔴 Şu anki saati gösteren o meşhur kırmızı çizgiyi ekler!
    slotEventOverlap: false, // Randevuların üst üste binmesini engeller, yan yana dizer

    // 🎨 ÖZEL KUTUCUK TASARIMI (Event Content)
    eventContent: (arg) => {
      // "as any" diyerek TypeScript'i susturuyoruz ve istediğimiz gibi nokta kullanıyoruz
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

    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
  };

  ngOnInit() {
    this.appointmentService.fetchUpcomingAppointments();
  }

  // Modern Renk Paleti (Daha soft ve premium renkler)
  private getColorByStatus(status: string): string {
    switch (status) {
      case 'booked':
        return '#10b981'; // Zümrüt Yeşili
      case 'pending':
        return '#f59e0b'; // Kehribar Sarısı
      case 'cancelled':
        return '#ef4444'; // Kırmızı
      default:
        return '#64748b'; // Slate Gri
    }
  }

  // Tıklanınca iğrenç alert yerine kendi şık Modal'ımızı açıyoruz
  handleEventClick(clickInfo: any) {
    const apt = clickInfo.event.extendedProps;
    this.selectedAppointment.set(apt);
    this.isModalOpen.set(true);
  }

  // Modal'ı kapatma fonksiyonu
  closeModal() {
    this.isModalOpen.set(false);
    this.selectedAppointment.set(null);
  }

  // Randevuyu Onaylama Aksiyonu
  approve(id: string) {
    this.appointmentService.approveAppointment(id).subscribe({
      next: () => {
        this.closeModal(); // İşlem bitince pencereyi kapat
      },
      error: (err) => alert('Onaylanırken bir hata oluştu.'),
    });
  }

  // Randevuyu İptal Etme Aksiyonu
  cancel(id: string) {
    // Küçük bir emin misin sorusu sormak her zaman iyidir
    if (confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) {
      this.appointmentService.cancelAppointment(id).subscribe({
        next: () => {
          this.closeModal(); // İşlem bitince pencereyi kapat
        },
        error: (err) => alert('İptal edilirken bir hata oluştu.'),
      });
    }
  }
}

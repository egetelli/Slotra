import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './availability.component.html',
})
export class AvailabilityComponent implements OnInit {
  private appointmentService = inject(AppointmentService);

  isLoading = signal<boolean>(true);
  providersData = signal<any[]>([]);

  // Varsayılan olarak bugünü seç
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Çalışma saatlerini buradan ayarlayabilirsin (Örn: 09:00 - 18:00)
  workingHours = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  ngOnInit() {
    this.loadAvailability();
  }

  onDateChange(newDate: string) {
    this.selectedDate.set(newDate);
    this.loadAvailability();
  }

  loadAvailability() {
    this.isLoading.set(true);
    this.appointmentService
      .getCollectiveAvailability(this.selectedDate())
      .subscribe({
        next: (data) => {
          // Gelen veriyi arayüzün kolay okuyacağı formata çeviriyoruz
          const processedData = data.map((provider) => ({
            ...provider,
            slots: this.generateTimeSlots(provider.busy_slots),
          }));

          this.providersData.set(processedData);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Müsaitlik çekilemedi', err);
          this.isLoading.set(false);
        },
      });
  }

  // Bu sihirli fonksiyon, çalışma saatleri ile backend'den gelen "dolu" saatleri çarpıştırır
  private generateTimeSlots(busySlots: any[]) {
    const baseDate = this.selectedDate(); // Örn: '2026-04-06'

    return this.workingHours.map((timeStr) => {
      // Çipin temsil ettiği tam tarih/saat objesi (Örn: 2026-04-06T10:00:00)
      const slotDateTime = new Date(`${baseDate}T${timeStr}:00`);

      // Bu saat dilimi herhangi bir "busy" (mola/randevu) aralığına düşüyor mu?
      const isBusy = busySlots.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        // Eğer slot saati, dolu aralığın içindeyse VEYA tam başlangıcına eşitse
        return slotDateTime >= busyStart && slotDateTime < busyEnd;
      });

      return {
        time: timeStr,
        isAvailable: !isBusy,
        fullDateTime: slotDateTime,
      };
    });
  }

  bookSlot(providerId: string, providerName: string, slotTime: Date) {
    // Burada randevu alma modalını açacaksın!
    console.log(
      `Randevu Alınıyor: ${providerName} - ${slotTime.toLocaleString()}`,
    );
    // this.uiService.openBookingModal(providerId, slotTime);
  }
}

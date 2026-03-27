import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, finalize, map } from 'rxjs/operators'; // 'map' eklendi
import { of, Observable } from 'rxjs';
import { Appointment } from '../models/schedule.model';
import { Client } from '../models/client.model';

// Backend'in standart dönüş tipini (Wrapper) yakalamak için interface
export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/appointments';

  // State Management
  private _appointments = signal<Appointment[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  appointments = this._appointments.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();

  // 1. Kendi Randevularımı Getir (GET /api/appointments/my)
  fetchUpcomingAppointments(): void {
    this._isLoading.set(true);
    this._error.set(null);

    this.http
      .get<ApiResponse<Appointment[]>>(`${this.API_URL}/my`, {
        withCredentials: true,
      })
      .pipe(
        // Backend'den gelen { success, data } objesinin sadece 'data' kısmını süzüyoruz
        map((response) => response.data),
        tap((appointmentsData) => {
          this._appointments.set(appointmentsData);
        }),
        catchError((err) => {
          console.error('Randevu çekme hatası:', err);
          this._error.set('Randevular yüklenirken bir sorun oluştu.');
          return of([]);
        }),
        finalize(() => {
          this._isLoading.set(false);
        }),
      )
      .subscribe();
  }

  // 2. Uzman Randevularını Getir (GET /api/appointments/provider/schedule)
  fetchProviderAppointments(): void {
    this._isLoading.set(true);
    this.http
      .get<ApiResponse<Appointment[]>>(`${this.API_URL}/provider/schedule`, {
        withCredentials: true,
      })
      .pipe(
        map((res) => res.data),
        tap((data) => this._appointments.set(data)),
        finalize(() => this._isLoading.set(false)),
      )
      .subscribe();
  }

  // 3. Yeni Randevu Oluştur (POST /api/appointments)
  createAppointment(appointmentData: {
    providerId: string;
    serviceId: string;
    slotTime: string;
  }): Observable<Appointment> {
    return this.http
      .post<ApiResponse<Appointment>>(this.API_URL, appointmentData, {
        withCredentials: true,
      })
      .pipe(
        map((response) => response.data), // Sadece oluşturulan randevu objesini al
        tap((newAppointment) => {
          // Yeni randevuyu sinyalin en başına ekle (Arayüz anında güncellenir)
          this.addNewAppointmentLocally(newAppointment);
        }),
      );
  }

  // 4. Randevu İptal Et (PATCH /api/appointments/:id/cancel)
  cancelAppointment(appointmentId: string): Observable<Appointment> {
    return this.http
      .patch<ApiResponse<Appointment>>(
        `${this.API_URL}/${appointmentId}/cancel`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => response.data),
        tap((cancelledAppointment) => {
          // Sinyal içindeki eski randevuyu bul ve durumunu arayüzde 'cancelled' yap
          this._appointments.update((current) =>
            current.map((apt) =>
              apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt,
            ),
          );
        }),
      );
  }

  // 5. Randevu Onayla (PATCH /api/appointments/:id/approve)
  approveAppointment(appointmentId: string): Observable<Appointment> {
    return this.http
      .patch<
        ApiResponse<Appointment>
      >(`${this.API_URL}/${appointmentId}/approve`, {}, { withCredentials: true })
      .pipe(
        map((response) => response.data),
        tap((approvedApt) => {
          // Sinyal içindeki randevuyu bul ve durumunu 'booked' olarak güncelle
          // Bu sayede UI'daki badge anında yeşile döner ve onay butonu kaybolur
          this._appointments.update((current) =>
            current.map((apt) =>
              apt.id === appointmentId ? { ...apt, status: 'booked' } : apt,
            ),
          );
        }),
        catchError((err) => {
          console.error('Onaylama hatası:', err);
          throw err;
        }),
      );
  }

  updateAppointmentStatusLocally(appointmentId: string, status: string) {
    this._appointments.update((currentList) =>
      currentList.map((apt) =>
        apt.id === appointmentId
          ? {
              ...apt,
              // Burada TypeScript'e: "Korkma, bu string o 4 durumdan biridir" diyoruz.
              status: status as
                | 'booked'
                | 'pending'
                | 'cancelled'
                | 'completed',
            }
          : apt,
      ),
    );
  }

  addNewAppointmentLocally(newAppointment: any) {
    this._appointments.update((currentList) => {
      // Eğer bu randevu zaten listede varsa (F5 falan atıldıysa) çiftlememek için kontrol et
      const exists = currentList.find((apt) => apt.id === newAppointment.id);
      if (exists) return currentList;

      // Yoksa listenin en başına ekle
      return [newAppointment, ...currentList];
    });
  }

  getProviderClients() {
    // API URL'inin senin sistemine uygun olduğundan emin ol (örn: environment.apiUrl + '/api/appointments/clients')
    return this.http.get<{ success: boolean; data: Client[] }>(
      `${this.API_URL}/clients`,
    );
  }
}

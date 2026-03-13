import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, finalize, map } from 'rxjs/operators'; // 'map' eklendi
import { of, Observable } from 'rxjs';
import { Appointment } from '../models/schedule.model';

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

  // 2. Yeni Randevu Oluştur (POST /api/appointments)
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
          this._appointments.update((current) => [newAppointment, ...current]);
        }),
      );
  }

  // 3. Randevu İptal Et (PATCH /api/appointments/:id/cancel)
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
}

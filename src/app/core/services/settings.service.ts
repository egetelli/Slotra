import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

// Interface'leri burada tanımlayabilir veya ayrı modellere alabilirsin
export interface WorkDay {
  dayIndex: number;
  dayName: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export interface ServiceItem {
  id?: number;
  name: string;
  duration: number;
  base_price: number;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private http = inject(HttpClient);
  // Diğer servislerinle uyumlu olması için tam URL kullanıyoruz
  private apiUrl = 'http://localhost:3000/api/settings';

  // Tüm ayarları tek seferde çek
  getAllSettings(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/all`)
      .pipe(map((response) => response.data));
  }

  // Mesai saatlerini güncelle
  updateSchedule(schedule: WorkDay[]): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/schedule`, { schedule })
      .pipe(map((response) => response.data));
  }

  // Hizmetleri güncelle
  updateServices(services: ServiceItem[]): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/services`, { services })
      .pipe(map((response) => response.data));
  }

  deleteService(serviceId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/services/${serviceId}`);
  }

  // Profil bilgilerini güncelle
  updateProfile(profile: any): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/profile`, profile)
      .pipe(map((response) => response.data));
  }
}

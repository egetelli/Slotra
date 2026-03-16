import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ServiceItem } from '../models/service-item.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/services';

  getActiveServices(): Observable<ServiceItem[]> {
    return this.http
      .get<ApiResponse<ServiceItem[]>>(this.apiUrl)
      .pipe(map((response) => response.data));
  }

  // Sadece seçilen uzmanın hizmetlerini ve ona özel fiyatları getirir
  getServicesByProvider(providerId: string): Observable<ServiceItem[]> {
    return this.http
      .get<
        ApiResponse<ServiceItem[]>
      >(`http://localhost:3000/api/providers/${providerId}/services`)
      .pipe(map((response) => response.data));
  }
}

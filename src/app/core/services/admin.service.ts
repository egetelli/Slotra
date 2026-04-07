import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { AdminDashboardData } from '../models/admin-dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/admin';

  getDashboardSummary(): Observable<AdminDashboardData> {
    return this.http
      .get<ApiResponse<AdminDashboardData>>(`${this.apiUrl}/dashboard`)
      .pipe(map((response) => response.data));
  }

  // --- USER CRUD ---
  getUsers(): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]>>(`${this.apiUrl}/users`)
      .pipe(map((r) => r.data));
  }

  createUser(data: any) {
    return this.http.post(`${this.apiUrl}/users`, data);
  }

  updateUser(id: string, data: any) {
    return this.http.put(`${this.apiUrl}/users/${id}`, data);
  }

  deleteUser(id: string) {
    return this.http.delete(`${this.apiUrl}/users/${id}`);
  }

  // --- PROVIDER SERVICES CRUD ---
  getProviderServices(providerId: string): Observable<any[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.apiUrl}/providers/${providerId}/services`)
      .pipe(map((r) => r.data));
  }

  saveService(providerId: string, data: any, serviceId?: string) {
    if (serviceId) {
      return this.http.put(`${this.apiUrl}/services/${serviceId}`, data);
    }
    return this.http.post(
      `${this.apiUrl}/providers/${providerId}/services`,
      data,
    );
  }

  deleteService(serviceId: string) {
    return this.http.delete(`${this.apiUrl}/services/${serviceId}`);
  }

  // --- WORKING HOURS CRUD ---
  getWorkingHours(providerId: string): Observable<any[]> {
    return this.http
      .get<
        ApiResponse<any[]>
      >(`${this.apiUrl}/providers/${providerId}/working-hours`)
      .pipe(map((r) => r.data));
  }

  updateWorkingHours(providerId: string, data: any[]) {
    return this.http.put(
      `${this.apiUrl}/providers/${providerId}/working-hours`,
      data,
    );
  }
}

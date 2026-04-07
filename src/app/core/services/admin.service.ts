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
}

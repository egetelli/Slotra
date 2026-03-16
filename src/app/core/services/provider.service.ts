import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Provider } from '../models/provider.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/providers'; // Environment'a alabilirsin

  getProviders(): Observable<Provider[]> {
    return this.http
      .get<ApiResponse<Provider[]>>(this.apiUrl)
      .pipe(map((response) => response.data));
  }
}

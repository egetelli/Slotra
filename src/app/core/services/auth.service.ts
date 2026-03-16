import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, of, Observable } from 'rxjs';
import { AuthResponse, User } from '../models/auth.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/auth';

  // ZERO-STORAGE: Başlangıçta her şey null, localstorage yok
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);

  router = inject(Router);

  user = this._user.asReadonly();
  token = this._token.asReadonly();
  isAuthenticated = computed(() => !!this._token());

  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, userData, {
      withCredentials: true,
    });
  }

  login(credentials: any) {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          this._token.set(res.accessToken);
          this._user.set(res.data);
        }),
      );
  }

  //SILENT-REFRESH: F5 atıldığında veya token düştüğünde çalışacak
  silentRefresh(): Observable<AuthResponse | null> {
    return this.http
      .post<AuthResponse>(
        `${this.API_URL}/refresh`,
        {},
        {
          withCredentials: true,
        },
      )
      .pipe(
        tap((res) => {
          this._token.set(res.accessToken);
          if (res.data) {
            this._user.set(res.data);
          }
        }),
        catchError(() => {
          //Cookie yoksa veya süresi dolmuşsa (kullanıcı çıkış yapmışsa)
          this._token.set(null);
          this._user.set(null);
          return of(null); // Uygulamanın çökmesini engeller
        }),
      );
  }

  logout() {
    return this.http
      .post(`${this.API_URL}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.clearSession();
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      );
  }

  private clearSession() {
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}

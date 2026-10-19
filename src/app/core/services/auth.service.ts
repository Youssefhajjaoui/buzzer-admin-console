import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { ApiItem, AuthUser, LoginResult } from '../models/catalogue.model';
import { ApiConfigService } from './api-config.service';

const ACCESS_KEY = 'buzzer.accessToken';
const REFRESH_KEY = 'buzzer.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly api = inject(ApiConfigService);
  private refreshRequest: Observable<string> | null = null;

  readonly accessToken = signal<string | null>(this.read(ACCESS_KEY));
  readonly user = signal<AuthUser | null>(null);

  login(email: string, password: string): Observable<AuthUser> {
    return this.rawHttp
      .post<ApiItem<LoginResult>>(this.api.endpoint('/api/auth/login'), { email, password })
      .pipe(
        tap((response) => this.persist(response.data)),
        map((response) => response.data.user),
      );
  }

  loadMe(): Observable<AuthUser> {
    return this.http.get<ApiItem<AuthUser>>(this.api.endpoint('/api/auth/me')).pipe(
      map((response) => response.data),
      tap((user) => this.user.set(user)),
    );
  }

  refresh(): Observable<string> {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }

    const refreshToken = this.read(REFRESH_KEY);
    if (!refreshToken) {
      return throwError(() => new HttpErrorResponse({ status: 401 }));
    }

    this.refreshRequest = this.rawHttp
      .post<ApiItem<LoginResult>>(this.api.endpoint('/api/auth/refresh'), { refreshToken })
      .pipe(
        tap((response) => this.persist(response.data)),
        map((response) => response.data.accessToken),
        finalize(() => {
          this.refreshRequest = null;
        }),
        shareReplay(1),
      );

    return this.refreshRequest;
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  }

  private persist(result: LoginResult): void {
    sessionStorage.setItem(ACCESS_KEY, result.accessToken);
    sessionStorage.setItem(REFRESH_KEY, result.refreshToken);
    this.accessToken.set(result.accessToken);
    this.user.set(result.user);
  }

  private read(key: string): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(key);
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const body = error.error as {
    error?: { message?: string; details?: Record<string, string[]> };
  };
  const details = body?.error?.details;
  const detail = details ? Object.values(details).flat()[0] : undefined;
  return detail || body?.error?.message || fallback;
}

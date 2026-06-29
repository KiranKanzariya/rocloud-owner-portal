import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, RegisterGoogleRequest } from '../models/auth.models';

/** A workspace a Google identity can sign in to (returned by the apex resolve step). */
export interface GoogleWorkspace {
  subdomain: string;
  tenantName: string;
  handoffUrl: string;
}
import { TokenService } from './token.service';
import { PermissionService } from './permission.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = inject(TokenService);
  private readonly perms = inject(PermissionService);
  private readonly base = `${environment.apiUrl}/auth`;

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, body).pipe(tap((r) => this.handleTokens(r)));
  }

  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/google`, { idToken }).pipe(tap((r) => this.handleTokens(r)));
  }

  register(body: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, body).pipe(tap((r) => this.handleTokens(r)));
  }

  /** Passwordless tenant signup using a Google id-token (owner name/email come from Google). */
  registerWithGoogle(body: RegisterGoogleRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register-google`, body).pipe(tap((r) => this.handleTokens(r)));
  }

  /** Apex step: verify a Google id-token and list the workspaces it can enter (each with a handoff URL). */
  resolveGoogleWorkspaces(idToken: string): Observable<GoogleWorkspace[]> {
    return this.http
      .post<{ workspaces: GoogleWorkspace[] }>(`${this.base}/google-resolve`, { idToken })
      .pipe(map((r) => r.workspaces ?? []));
  }

  /** Subdomain step: exchange a one-time grant token for a real session on this tenant. */
  googleHandoff(grant: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/google-handoff`, { grant })
      .pipe(tap((r) => this.handleTokens(r)));
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, { token, newPassword });
  }

  /** "Forgot your workspace?" — server emails the caller their portal URL(s). */
  findWorkspace(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/find-workspace`, { email });
  }

  /** Live registration check: returns the slug we'd use and whether that subdomain is free. */
  checkSubdomain(value: string): Observable<{ subdomain: string; available: boolean }> {
    const params = new HttpParams().set('value', value);
    return this.http.get<{ subdomain: string; available: boolean }>(`${this.base}/subdomain-available`, { params });
  }

  /** Called by the error interceptor on a 401 (cookie-based; no body). */
  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/refresh`, {}).pipe(tap((r) => this.handleTokens(r)));
  }

  logout(): void {
    // Best-effort server-side revoke; clear local state regardless.
    this.http.post(`${this.base}/logout`, {}).pipe(catchError(() => of(null))).subscribe();
    this.clearSession();
  }

  /** APP_INITIALIZER: restore the session from the refresh cookie on a hard page load. */
  bootstrap(): Promise<void> {
    return firstValueFrom(
      this.refreshToken().pipe(
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
      ),
    ).then(() => undefined);
  }

  handleTokens(res: AuthResponse): void {
    this.token.set(res.accessToken);
    this.perms.loadFromToken(res.accessToken);
  }

  /**
   * Establishes a session directly from an access token (no refresh cookie) — used by the platform
   * "Open as owner" impersonation handoff. The session lives only in memory and ends on reload.
   */
  setSessionFromToken(accessToken: string): void {
    this.token.set(accessToken);
    this.perms.loadFromToken(accessToken);
  }

  clearSession(): void {
    this.token.clear();
    this.perms.clear();
  }
}

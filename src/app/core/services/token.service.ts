import { Injectable, computed, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface JwtClaims {
  sub: string;
  exp: number;
  [key: string]: unknown;
}

/**
 * Holds the access token in memory only — never localStorage/sessionStorage (guide §18, §10.3),
 * so it can't be read by XSS. The refresh token lives in an HttpOnly cookie the browser sends
 * automatically. On a full page reload the token is gone and AuthService.bootstrap() silently
 * refreshes from the cookie.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly _token = signal<string | null>(null);

  readonly isAuthenticated = computed(() => {
    const t = this._token();
    return t !== null && !this.isExpired();
  });

  set(token: string): void {
    this._token.set(token);
  }

  clear(): void {
    this._token.set(null);
  }

  getToken(): string | null {
    return this._token();
  }

  decode<T = JwtClaims>(): T | null {
    const t = this._token();
    if (!t) return null;
    try {
      return jwtDecode<T>(t);
    } catch {
      return null;
    }
  }

  isExpired(): boolean {
    const claims = this.decode<JwtClaims>();
    if (!claims?.exp) return true;
    // exp is seconds since epoch; treat the last 10s as expired to avoid edge races.
    return Date.now() >= claims.exp * 1000 - 10_000;
  }
}

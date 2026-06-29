import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ImpersonationService } from '../../../core/services/impersonation.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

/**
 * Platform "Open as owner" landing. Reads the access token from the URL fragment (#token=…) the admin
 * portal opened us with, establishes an in-memory session as the tenant's owner, flags impersonation,
 * scrubs the token from the address bar, and enters the app.
 */
@Component({
  selector: 'app-impersonate',
  standalone: true,
  imports: [TranslatePipe, LogoComponent, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-shell">
      <div class="w-full max-w-sm text-center">
        <div class="flex justify-center mb-6"><roc-logo size="lg" variant="default"></roc-logo></div>
        @if (error()) {
          <div class="card">
            <i class="ti ti-alert-triangle text-3xl text-amber"></i>
            <p class="text-body mt-2">{{ 'This impersonation link has expired or is invalid.' | translate }}</p>
            <a routerLink="/login" class="btn-primary w-full justify-center mt-4">{{ 'Back to sign in' | translate }}</a>
          </div>
        } @else {
          <div class="card py-12">
            <i class="ti ti-loader-2 animate-spin text-2xl text-teal"></i>
            <p class="text-body text-ink-mid mt-2">{{ 'Opening workspace…' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ImpersonateComponent {
  private readonly auth = inject(AuthService);
  private readonly impersonation = inject(ImpersonationService);
  private readonly router = inject(Router);

  protected readonly error = signal(false);

  constructor() {
    // Token rides in the fragment so it never hits a server log. Parse it, then scrub the URL.
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const token = new URLSearchParams(hash).get('token');
    history.replaceState(null, '', window.location.pathname);

    if (!token) {
      this.error.set(true);
      return;
    }

    try {
      const claims = jwtDecode<{ name?: string; exp?: number }>(token);
      if (!claims.exp || Date.now() >= claims.exp * 1000) {
        this.error.set(true);
        return;
      }
      this.auth.setSessionFromToken(token);
      this.impersonation.start(claims.name ?? '');
      this.router.navigate(['/dashboard']);
    } catch {
      this.error.set(true);
    }
  }
}

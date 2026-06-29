import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

/**
 * Subdomain landing for the Google handoff (guide §5). Reads the one-time grant from the URL, exchanges
 * it for a real session on this tenant (sets the refresh cookie + access token), then enters the app.
 */
@Component({
  selector: 'app-handoff',
  standalone: true,
  imports: [TranslatePipe, LogoComponent, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-shell">
      <div class="w-full max-w-sm text-center">
        <div class="flex justify-center mb-6"><roc-logo size="lg" variant="default"></roc-logo></div>
        @if (error()) {
          <div class="card">
            <i class="ti ti-alert-triangle text-3xl text-amber"></i>
            <p class="text-body mt-2">{{ 'This sign-in link has expired or is invalid.' | translate }}</p>
            <a routerLink="/login" class="btn-primary w-full justify-center mt-4">{{ 'Back to sign in' | translate }}</a>
          </div>
        } @else {
          <div class="card py-12">
            <i class="ti ti-loader-2 animate-spin text-2xl text-teal"></i>
            <p class="text-body text-ink-mid mt-2">{{ 'Signing you in…' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class HandoffComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly error = signal(false);

  constructor() {
    const grant = this.route.snapshot.queryParamMap.get('grant');
    if (!grant) {
      this.error.set(true);
      return;
    }
    this.auth.googleHandoff(grant).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.error.set(true),
    });
  }
}

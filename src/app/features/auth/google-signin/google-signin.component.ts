import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GoogleSigninButtonModule, SocialAuthService } from '@abacritt/angularx-social-login';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService, GoogleWorkspace } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogoComponent } from '../../../shared/components/logo/logo.component';

/**
 * Apex-domain Google sign-in (guide §5). This page lives on the single central app domain (the only
 * Google "Authorized origin"), so the GIS button works without registering every tenant subdomain.
 * After Google verifies the user we resolve their workspace(s) and hand off to the tenant subdomain.
 */
@Component({
  selector: 'app-google-signin',
  standalone: true,
  imports: [GoogleSigninButtonModule, TranslatePipe, LogoComponent, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-shell">
      <div class="w-full max-w-sm text-center">
        <div class="flex justify-center mb-6"><roc-logo size="lg" variant="default"></roc-logo></div>

        @if (loading()) {
          <div class="card py-12"><i class="ti ti-loader-2 animate-spin text-2xl text-teal"></i>
            <p class="text-body text-ink-mid mt-2">{{ 'Signing you in…' | translate }}</p>
          </div>
        } @else if (noWorkspace()) {
          <div class="card">
            <i class="ti ti-mood-empty text-3xl text-ink-mid"></i>
            <p class="text-body mt-2">{{ 'No workspace is linked to this Google account.' | translate }}</p>
            <a routerLink="/register" class="btn-primary w-full justify-center mt-4">{{ 'Start free trial' | translate }}</a>
            <a routerLink="/login" class="block text-caption text-navy-light hover:underline mt-3">{{ 'Back to sign in' | translate }}</a>
          </div>
        } @else if (workspaces(); as list) {
          <div class="card text-left">
            <h2 class="text-h3 mb-3 text-center">{{ 'Choose a workspace' | translate }}</h2>
            <div class="flex flex-col gap-2">
              @for (w of list; track w.subdomain) {
                <button type="button" class="flex items-center justify-between rounded-md border border-ink-light px-3 py-2.5 hover:border-navy-light hover:bg-shell" (click)="go(w)">
                  <span class="font-medium">{{ w.tenantName }}</span>
                  <span class="text-caption text-ink-mid font-mono">{{ w.subdomain }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
          <div class="card">
            <h2 class="text-h2 mb-1">{{ 'Sign in with Google' | translate }}</h2>
            <p class="text-body text-ink-mid mb-5">{{ 'Sign in to your ROCloud account.' | translate }}</p>
            <div class="flex justify-center">
              <asl-google-signin-button type="standard" size="large" text="signin_with" shape="rectangular" [width]="320"></asl-google-signin-button>
            </div>
            <a routerLink="/login" class="block text-caption text-navy-light hover:underline mt-5">{{ 'Back to sign in' | translate }}</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class GoogleSigninComponent {
  private readonly social = inject(SocialAuthService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly loading = signal(false);
  /** null until resolved; set to the list only when a picker is needed (>1 and no hint match). */
  protected readonly workspaces = signal<GoogleWorkspace[] | null>(null);
  protected readonly noWorkspace = signal(false);

  /** Optional subdomain the user came from (e.g. they clicked Google on acme.rocloud.app/login). */
  private readonly tenantHint = this.route.snapshot.queryParamMap.get('tenant');

  constructor() {
    this.social.authState.pipe(takeUntilDestroyed()).subscribe((user) => {
      if (user?.idToken && !this.loading()) this.resolve(user.idToken);
    });
  }

  private resolve(idToken: string): void {
    this.loading.set(true);
    this.auth.resolveGoogleWorkspaces(idToken).subscribe({
      next: (list) => {
        this.loading.set(false);
        if (!list.length) {
          this.noWorkspace.set(true);
          return;
        }
        const hinted = this.tenantHint ? list.find((w) => w.subdomain === this.tenantHint) : undefined;
        const target = hinted ?? (list.length === 1 ? list[0] : null);
        if (target) {
          this.go(target);
          return;
        }
        this.workspaces.set(list); // multiple workspaces, no hint — let the user pick
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.t.instant('Google sign-in failed.'));
      },
    });
  }

  go(w: GoogleWorkspace): void {
    this.loading.set(true);
    // Cross-(sub)domain top-level navigation to the tenant; the handoff page exchanges the grant.
    window.location.href = w.handoffUrl;
  }
}

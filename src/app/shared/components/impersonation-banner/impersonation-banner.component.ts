import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ImpersonationService } from '../../../core/services/impersonation.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * A persistent warning bar shown while platform staff are viewing a tenant's workspace via
 * "Open as owner". Makes the impersonation obvious and offers a one-click exit.
 */
@Component({
  selector: 'roc-impersonation-banner',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (impersonation.active()) {
      <div class="bg-amber-light text-[#633806] text-caption font-medium px-4 py-1.5 flex items-center justify-center gap-3 animate-slide-down">
        <span><i class="ti ti-user-share"></i>
          {{ 'You are viewing' | translate }} <b>{{ impersonation.ownerName() }}</b>{{ "'s workspace (impersonation)." | translate }}</span>
        <button class="underline hover:no-underline" (click)="exit()">{{ 'Exit' | translate }}</button>
      </div>
    }
  `,
})
export class ImpersonationBannerComponent {
  protected readonly impersonation = inject(ImpersonationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  exit(): void {
    this.auth.clearSession();
    this.impersonation.stop();
    // The tab was opened by the admin portal, so try to close it; fall back to the sign-in screen.
    window.close();
    this.router.navigate(['/login']);
  }
}

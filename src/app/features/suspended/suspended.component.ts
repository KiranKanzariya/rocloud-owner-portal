import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type BlockReason = 'suspended' | 'overdue' | 'cancelled';

const COPY: Record<BlockReason, { title: string; body: string }> = {
  suspended: {
    title: 'Workspace suspended',
    body: 'This workspace has been suspended and is temporarily unavailable.',
  },
  overdue: {
    title: 'Subscription overdue',
    body: 'This workspace’s subscription payment is overdue, so access is paused.',
  },
  cancelled: {
    title: 'Subscription ended',
    body: 'This workspace’s subscription has ended.',
  },
};

/**
 * Dead-end screen for a NON-OWNER on a blocked workspace (guide §25). The owner is sent to
 * /settings/subscription instead, because they can actually pay; staff cannot, so the honest thing is
 * one clear page naming who to ask — rather than leaving them in a shell where every widget fails and a
 * toast fires per request.
 *
 * Lives OUTSIDE the authenticated shell on purpose: the shell's own API calls would 401 too and
 * re-trigger the very toast storm this page exists to end.
 */
@Component({
  selector: 'app-suspended',
  standalone: true,
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <i class="ti ti-lock text-4xl text-ink-mid"></i>
      <h1 class="text-h1">{{ copy.title }}</h1>
      <p class="text-body text-ink-mid max-w-sm">{{ copy.body }}</p>
      <p class="text-body text-ink-mid max-w-sm">
        Please contact the account owner — only they can restore access.
      </p>
      <button type="button" class="btn-secondary mt-2" (click)="signOut()">Sign out</button>
    </div>
  `,
})
export class SuspendedComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Read once from the URL — the reason cannot change while this screen is open. */
  readonly copy = COPY[SuspendedComponent.reasonOf(inject(ActivatedRoute).snapshot.queryParamMap.get('reason'))];

  private static reasonOf(raw: string | null): BlockReason {
    return raw === 'overdue' || raw === 'cancelled' ? raw : 'suspended';
  }

  signOut(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}

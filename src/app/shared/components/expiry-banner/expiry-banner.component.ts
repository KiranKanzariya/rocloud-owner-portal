import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { PermissionService } from '../../../core/services/permission.service';
import { SubscriptionService, Subscription } from '../../../core/services/subscription.service';
import { expiryState } from '../../../core/subscription-status';

/** Below this many days the strip stops being dismissible — the last chance to act. */
const LOCKED_IN_FINAL_DAYS = 2;
const DISMISS_KEY = 'roc.expiryBannerDismissedOn';

/**
 * Shell-wide expiry countdown for a trial running out OR a paid subscription coming up for renewal
 * (guide §25). The subscription page has its own banners, but a water business owner lives on the
 * delivery board and the customer list — they have no reason to open Settings → Subscription, so
 * without this the lapse arrives as a surprise and the reminder emails are the only warning.
 *
 * OWNER ONLY: the CTA leads to an owner-only page, and staff can do nothing about it. That also keeps
 * `GET /api/subscription` (which carries [RequireOwner]) from being called by anyone who would get a 403.
 *
 * Dismissible down to the final two days, then it stays put. A dismissal lasts the calendar day only,
 * so the reminder returns tomorrow rather than being silenced for the rest of the window.
 *
 * The CTA navigates to the subscription page rather than paying inline: the Razorpay flow (initiate →
 * checkout → complete → re-issue JWT) lives there, and a second copy of it in a banner would be a
 * genuine liability. The page's own banner carries the real Pay now button.
 */
@Component({
  selector: 'roc-expiry-banner',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    @if (visible()) {
      <div
        class="bg-amber-light text-[#633806] text-caption font-medium px-4 py-1.5 flex items-center justify-center gap-3 animate-slide-down"
      >
        <span>
          <i class="ti ti-clock-exclamation"></i>
          @if (isTrial()) {
            @if (state().expired) {
              {{ 'Your free trial has ended.' | translate }}
            } @else if (days() === 0) {
              {{ 'Your free trial ends today.' | translate }}
            } @else if (days() === 1) {
              {{ 'Your free trial ends tomorrow.' | translate }}
            } @else {
              {{ 'Your free trial ends in {{days}} days.' | translate: { days: days() } }}
            }
          } @else {
            @if (state().expired) {
              {{ 'Your subscription has expired.' | translate }}
            } @else if (days() === 0) {
              {{ 'Your subscription expires today.' | translate }}
            } @else if (days() === 1) {
              {{ 'Your subscription expires tomorrow.' | translate }}
            } @else {
              {{ 'Your subscription expires in {{days}} days.' | translate: { days: days() } }}
            }
          }
        </span>
        <a routerLink="/settings/subscription" class="underline hover:no-underline">{{ ctaLabel() | translate }}</a>
        @if (dismissible()) {
          <button type="button" class="hover:opacity-70" [title]="'Dismiss' | translate" (click)="dismiss()">
            <i class="ti ti-x"></i>
          </button>
        }
      </div>
    }
  `,
})
export class ExpiryBannerComponent {
  private readonly perms = inject(PermissionService);
  private readonly service = inject(SubscriptionService);
  private readonly router = inject(Router);

  private readonly subscription = signal<Subscription | null>(null);
  private readonly hasOpenInvoice = signal(false);
  private readonly dismissedOn = signal(localStorage.getItem(DISMISS_KEY));
  /** The subscription page shows its own, richer banners — don't stack a second warning on top. */
  private readonly onSubscriptionPage = signal(this.isSubscriptionUrl(this.router.url));

  protected readonly state = computed(() => expiryState(this.subscription()));
  protected readonly isTrial = computed(() => this.state().kind === 'trial');
  protected readonly days = computed(() => Math.max(0, this.state().daysLeft ?? 0));
  protected readonly dismissible = computed(() => !this.state().expired && this.days() > LOCKED_IN_FINAL_DAYS);

  /** A trial owner is choosing a first plan; a lapsed subscriber usually has an invoice waiting. */
  protected readonly ctaLabel = computed(() => {
    if (this.isTrial()) return 'Choose a plan';
    return this.hasOpenInvoice() ? 'Pay now' : 'Renew';
  });

  protected readonly visible = computed(() => {
    const s = this.state();
    if (!s.endingSoon && !s.expired) return false;
    if (this.onSubscriptionPage()) return false;
    return !this.dismissible() || this.dismissedOn() !== ExpiryBannerComponent.today();
  });

  constructor() {
    // Staff never see this, and the endpoint is owner-only — don't spend the request.
    if (this.perms.isOwner()) {
      this.service.current().subscribe({
        next: (s) => {
          this.subscription.set(s);
          // Only worth a second request once we know a paid warning is actually going to show.
          const st = expiryState(s);
          if (st.kind === 'paid' && (st.endingSoon || st.expired)) this.loadOpenInvoice();
        },
        // A blocked/failed load just means no banner; the error interceptor already speaks up.
        error: () => undefined,
      });
    }

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => this.onSubscriptionPage.set(this.isSubscriptionUrl(e.urlAfterRedirects)));
  }

  private loadOpenInvoice(): void {
    this.service.invoices().subscribe({
      // Wrong label is better than no banner, so a failure here just leaves the generic "Renew".
      next: (list) => this.hasOpenInvoice.set(list.some((i) => i.status === 'Pending')),
      error: () => undefined,
    });
  }

  protected dismiss(): void {
    const today = ExpiryBannerComponent.today();
    localStorage.setItem(DISMISS_KEY, today);
    this.dismissedOn.set(today);
  }

  private isSubscriptionUrl(url: string): boolean {
    return url.startsWith('/settings/subscription');
  }

  /** Local calendar day, so a dismissal expires at the user's midnight rather than UTC's. */
  private static today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
}

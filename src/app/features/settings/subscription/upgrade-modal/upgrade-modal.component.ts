import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LEGAL } from '../../../../core/legal-links';
import { SubscriptionService, Plan } from '../../../../core/services/subscription.service';
import { RazorpayService } from '../../../../core/services/razorpay.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ModalDirective } from '../../../../shared/directives/modal.directive';

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [ModalDirective, DecimalPipe, TranslatePipe],
  templateUrl: './upgrade-modal.component.html',
})
export class UpgradeModalComponent {
  private readonly service = inject(SubscriptionService);
  private readonly razorpay = inject(RazorpayService);
  private readonly auth = inject(AuthService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly LEGAL = LEGAL;

  readonly open = input(false);
  readonly plans = input<Plan[]>([]);
  /**
   * Lock the tenant's current plan as "Current plan" (and block downgrades). True only for a LIVE PAID
   * subscription, where re-buying the same plan is a no-op. Defaults true to preserve behaviour for any
   * caller that doesn't pass it; the subscription page passes false while lapsed/trial/blocked so the
   * owner can pick their current plan to (re)subscribe instead of being forced to upgrade.
   */
  readonly lockCurrentPlan = input(true);
  /**
   * End of the paid period — the date a downgrade chosen now would take effect. Shown on cheaper
   * plans so the owner knows they are not losing the plan they already paid for.
   */
  readonly periodEndsAt = input<string | null>(null);
  /**
   * A downgrade already parked for period end, if any. Re-selecting the CURRENT plan is what cancels
   * it (CompleteUpgradeCommand case (a)), so this also unlocks that card.
   */
  readonly scheduledPlanType = input<string | null>(null);
  /** Emitted after the JWT has been refreshed with the new plan. */
  readonly upgraded = output<void>();
  readonly closed = output<void>();

  protected readonly billing = signal<'Monthly' | 'Yearly'>('Monthly');
  protected readonly busyPlan = signal<string | null>(null);

  protected readonly currentPlan = computed(() => this.perm.plan());

  // Tier order — keep in step with PLAN_ORDER in permission.service.ts and the API's PlanType enum.
  private readonly order = ['Starter', 'Basic', 'Pro', 'Enterprise'];
  protected rank(planType: string): number {
    return this.order.indexOf(planType);
  }

  isCurrent(p: Plan): boolean {
    return p.planType === this.currentPlan();
  }

  isDowngrade(p: Plan): boolean {
    return this.rank(p.planType) < this.rank(this.currentPlan());
  }

  /**
   * Reports is gated by TIER, not by a flag on the plan — see `plan: 'Pro'` on the /reports route
   * in app.routes.ts. The catalogue has no field for it, so the card had no way to show it and
   * simply didn't, leaving a paid-only feature invisible on the screen that sells the upgrade.
   * Keep this in step with that route (and with TIER_FEATURES in rocloud-site/assets/site.js).
   */
  hasReports(p: Plan): boolean {
    return this.rank(p.planType) >= this.rank('Pro');
  }

  price(p: Plan): number {
    return this.billing() === 'Yearly' ? p.yearlyPrice : p.monthlyPrice;
  }

  /** What a year on this plan saves against paying monthly. 0 when yearly isn't cheaper. */
  yearlySaving(p: Plan): number {
    if (!(p.yearlyPrice > 0) || !(p.monthlyPrice > 0)) return 0;
    return Math.max(0, p.monthlyPrice * 12 - p.yearlyPrice);
  }

  /**
   * Whole months of headline saving for the Yearly toggle, computed rather than written by hand.
   *
   * The label used to read a fixed "(2 months free)". That understated Basic (which actually saves
   * 2.9 months) and — worse — would have silently become an over-promise the moment anyone set a
   * yearly price worth less than two months. The toggle is one control above every plan, so it has
   * to state what is true of ALL of them: the floor, not the best case. Returns 0 when any plan
   * fails to beat monthly, which hides the label entirely.
   */
  freeMonths(): number {
    const plans = this.plans();
    if (!plans.length) return 0;
    const months = plans.map((p) =>
      p.monthlyPrice > 0 ? this.yearlySaving(p) / p.monthlyPrice : 0,
    );
    return Math.floor(Math.min(...months));
  }

  /** True for the plan a parked downgrade will land on at period end. */
  isScheduled(p: Plan): boolean {
    return !!this.scheduledPlanType() && p.planType === this.scheduledPlanType();
  }

  /**
   * The current plan is only a dead-end (unclickable) when it's a live paid plan; else it's re-choosable.
   *
   * A parked downgrade also unlocks it: re-selecting the current plan is the ONLY way to cancel one
   * (the API handles it as a free no-op), and the subscription page's banner tells owners to do
   * exactly that — so leaving it disabled would send them to an instruction they cannot follow.
   */
  isLockedCurrent(p: Plan): boolean {
    if (this.scheduledPlanType()) return false;
    return this.lockCurrentPlan() && this.isCurrent(p);
  }

  /** Re-selecting the current plan while a downgrade waits means "cancel it", not "buy again". */
  isCancellingDowngrade(p: Plan): boolean {
    return this.isCurrent(p) && !!this.scheduledPlanType();
  }

  /** The button label depends on which of the three moves this card represents. */
  ctaKey(p: Plan): string {
    if (this.isCancellingDowngrade(p)) return 'Keep {{name}}';
    return this.isDowngrade(p) ? 'Switch to {{name}}' : 'Choose {{name}}';
  }

  /** When a downgrade chosen now would take effect — the end of the period already paid for. */
  effectiveOn(): string {
    return this.formatDate(this.periodEndsAt());
  }

  async choose(p: Plan): Promise<void> {
    if (this.isLockedCurrent(p) || this.busyPlan()) return;
    // Read before the awaits: the parent reloads the subscription on `upgraded`, which clears
    // scheduledPlanType and would otherwise make the message pick the wrong branch.
    const cancellingDowngrade = this.isCancellingDowngrade(p);
    this.busyPlan.set(p.planType);
    try {
      const init = await firstValueFrom(this.service.initiate(p.planType, this.billing()));
      // A 100% discount / free months nets to ₹0 — skip Razorpay (it rejects zero-amount orders)
      // and complete the upgrade directly. Otherwise open Checkout and require a successful payment.
      if (!init.isFree) {
        const paid = await this.razorpay.pay(init, { name: this.perm.name() });
        if (!paid) {
          this.busyPlan.set(null);
          this.toast.error(this.t.instant('Payment was cancelled.'));
          return;
        }
      }
      await firstValueFrom(this.service.completeUpgrade(p.planType, this.billing(), init.orderId));
      // Re-issue the JWT so the new plan_type claim (and gated features) take effect.
      await firstValueFrom(this.auth.refreshToken());
      this.busyPlan.set(null);
      // A downgrade has NOT happened yet — it is parked until the paid period ends, so saying
      // "you're now on Basic" would be a lie while they still hold (and paid for) the dearer plan.
      // Cancelling a parked one comes back as Lateral (same plan, same price), which would otherwise
      // report "You're now on the Pro plan" to someone who never left it.
      this.toast.success(
        cancellingDowngrade
          ? this.t.instant('Your scheduled plan change has been cancelled.')
          : init.changeKind === 'Downgrade'
            ? this.t.instant('Your plan will change to {{name}} on {{date}}.', {
                name: p.name,
                date: this.formatDate(init.effectiveAt),
              })
            : this.t.instant("You're now on the {{name}} plan.", { name: p.name }),
      );
      this.upgraded.emit();
    } catch (err) {
      this.busyPlan.set(null);
      this.toast.apiError(err, this.t.instant('Could not complete the upgrade.'));
    }
  }

  /** The effective date for a scheduled downgrade, in the user's locale. Falls back to "period end". */
  private formatDate(iso: string | null | undefined): string {
    if (!iso) return this.t.instant('your renewal date');
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  close(): void {
    this.closed.emit();
  }
}

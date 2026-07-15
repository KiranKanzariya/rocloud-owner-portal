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

@Component({
  selector: 'app-upgrade-modal',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe],
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
  /** Emitted after the JWT has been refreshed with the new plan. */
  readonly upgraded = output<void>();
  readonly closed = output<void>();

  protected readonly billing = signal<'Monthly' | 'Yearly'>('Monthly');
  protected readonly busyPlan = signal<string | null>(null);

  protected readonly currentPlan = computed(() => this.perm.plan());

  private readonly order = ['Basic', 'Pro', 'Enterprise'];
  protected rank(planType: string): number {
    return this.order.indexOf(planType);
  }

  isCurrent(p: Plan): boolean {
    return p.planType === this.currentPlan();
  }

  isDowngrade(p: Plan): boolean {
    return this.rank(p.planType) < this.rank(this.currentPlan());
  }

  price(p: Plan): number {
    return this.billing() === 'Yearly' ? p.yearlyPrice : p.monthlyPrice;
  }

  async choose(p: Plan): Promise<void> {
    if (this.isCurrent(p) || this.busyPlan()) return;
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
      this.toast.success(this.t.instant("You're now on the {{name}} plan.", { name: p.name }));
      this.upgraded.emit();
    } catch (err) {
      this.busyPlan.set(null);
      this.toast.apiError(err, this.t.instant('Could not complete the upgrade.'));
    }
  }

  close(): void {
    this.closed.emit();
  }
}

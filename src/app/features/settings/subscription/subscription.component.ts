import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SubscriptionService, Subscription, Plan, Usage } from '../../../core/services/subscription.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { UpgradeModalComponent } from './upgrade-modal/upgrade-modal.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface UsageRow {
  label: string;
  used: number;
  max: number;
  pct: number;
  /** True when the plan grants this resource without a cap (max = 0 = unlimited). */
  unlimited: boolean;
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [DatePipe, DecimalPipe, UpgradeModalComponent, SkeletonComponent, TranslatePipe],
  templateUrl: './subscription.component.html',
})
export class SubscriptionComponent {
  private readonly service = inject(SubscriptionService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly loading = signal(true);
  protected readonly upgradeOpen = signal(false);
  protected readonly canManage = this.perm.can('Settings.Manage');

  protected readonly isEnterprise = computed(() => this.subscription()?.planType === 'Enterprise');

  protected readonly usageRows = computed<UsageRow[]>(() => {
    const u = this.subscription()?.usage;
    if (!u) return [];
    const row = (label: string, used: number, max: number): UsageRow => ({
      label,
      used,
      max,
      unlimited: max === 0, // 0 = unlimited (e.g. Enterprise)
      pct: max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0,
    });
    return [
      row('Customers', u.customers, u.maxCustomers),
      row('Team members', u.users, u.maxUsers),
      row('Delivery boys', u.deliveryBoys, u.maxDeliveryBoys),
    ];
  });

  constructor() {
    this.load();
    this.service.plans().subscribe((p) => this.plans.set(p));
  }

  load(): void {
    this.loading.set(true);
    this.service.current().subscribe({
      next: (s) => {
        this.subscription.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onUpgraded(): void {
    this.upgradeOpen.set(false);
    this.load();
  }

  cancel(): void {
    if (!confirm(this.t.instant('Cancel your subscription? You keep access until the end of the current period.'))) return;
    this.service.cancel().subscribe({
      next: () => {
        this.toast.success(this.t.instant('Subscription cancelled.'));
        this.load();
      },
      error: () => this.toast.error(this.t.instant('Could not cancel the subscription.')),
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Active': return 'status-delivered';
      case 'Trial': return 'status-active-info';
      case 'Overdue':
      case 'Suspended': return 'status-overdue';
      default: return 'status-pending';
    }
  }

  barClass(pct: number): string {
    if (pct >= 90) return 'bg-danger';
    if (pct >= 70) return 'bg-amber';
    return 'bg-teal';
  }
}

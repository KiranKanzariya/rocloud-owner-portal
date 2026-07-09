import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService, Subscription, Plan, Usage, SubscriptionInvoice } from '../../../core/services/subscription.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { RazorpayService } from '../../../core/services/razorpay.service';
import { AuthService } from '../../../core/services/auth.service';
import { UpgradeModalComponent } from './upgrade-modal/upgrade-modal.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { DataTableComponent, ColumnDef } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
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
  imports: [DatePipe, DecimalPipe, UpgradeModalComponent, SkeletonComponent, DataTableComponent, ColumnCellDirective, TranslatePipe],
  templateUrl: './subscription.component.html',
})
export class SubscriptionComponent {
  private readonly service = inject(SubscriptionService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly razorpay = inject(RazorpayService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly subscription = signal<Subscription | null>(null);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly invoices = signal<SubscriptionInvoice[]>([]);
  protected readonly loading = signal(true);
  protected readonly upgradeOpen = signal(false);
  protected readonly payingId = signal<string | null>(null);
  protected readonly renewing = signal(false);
  protected readonly canManage = this.perm.can('Settings.Manage');

  protected readonly isEnterprise = computed(() => this.subscription()?.planType === 'Enterprise');

  protected readonly invoiceColumns: ColumnDef[] = [
    { key: 'invoiceNumber', header: 'Invoice #' },
    { key: 'description', header: 'Description' },
    { key: 'dueDate', header: 'Due' },
    { key: 'amount', header: 'Amount', align: 'right' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '', align: 'right' },
  ];

  /** True when there's already an open invoice — the Billing history "Pay now" handles that case. */
  protected readonly hasPendingInvoice = computed(() => this.invoices().some((i) => i.status === 'Pending'));

  /**
   * Show "Renew now" (the fallback for a missed expiry job) when the owner can manage billing, there's
   * no open invoice to pay yet, and the paid subscription has already lapsed (end date passed). Not
   * shown before expiry — only once the subscription is actually expired (or Overdue/Suspended).
   */
  protected readonly canRenew = computed(() => {
    const s = this.subscription();
    if (!s || !this.canManage || this.hasPendingInvoice()) return false;
    if (s.status === 'Trial' || s.status === 'Cancelled' || !s.subscriptionEndsAt) return false;
    const lapsed = new Date(s.subscriptionEndsAt).getTime() <= Date.now();
    return lapsed || s.status === 'Overdue' || s.status === 'Suspended';
  });

  /** Date access ends after a cancellation (paid end, or trial end). */
  protected readonly accessUntil = computed(
    () => this.subscription()?.subscriptionEndsAt ?? this.subscription()?.trialEndsAt ?? null,
  );

  private readonly accessEnded = computed(() => {
    const d = this.accessUntil();
    return !d || new Date(d).getTime() < Date.now();
  });

  /** Cancelled but still inside the paid period → the owner can undo (Resume). */
  protected readonly pendingCancel = computed(
    () => this.subscription()?.status === 'Cancelled' && !this.accessEnded(),
  );

  /** Cancelled and the period has ended → the owner re-subscribes to reactivate the same workspace. */
  protected readonly cancelledEnded = computed(
    () => this.subscription()?.status === 'Cancelled' && this.accessEnded(),
  );

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
    this.loadInvoices();
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

  loadInvoices(): void {
    this.service.invoices().subscribe({
      next: (list) => this.invoices.set(list),
      error: () => this.invoices.set([]),
    });
  }

  onUpgraded(): void {
    this.upgradeOpen.set(false);
    this.load();
    this.loadInvoices();
  }

  /** Pay a Pending invoice: initiate → Razorpay (unless free/dev) → complete → refresh JWT → reload. */
  async payInvoice(inv: SubscriptionInvoice): Promise<void> {
    if (this.payingId()) return;
    this.payingId.set(inv.id);
    try {
      const init = await firstValueFrom(this.service.payInvoiceInitiate(inv.id));
      if (!init.isFree) {
        const paid = await this.razorpay.pay(init, { name: this.perm.name() });
        if (!paid) {
          this.payingId.set(null);
          this.toast.error(this.t.instant('Payment was cancelled.'));
          return;
        }
      }
      await firstValueFrom(this.service.payInvoiceComplete(inv.id, init.orderId));
      // Re-issue the JWT so the reactivated status / plan claims take effect.
      await firstValueFrom(this.auth.refreshToken());
      this.payingId.set(null);
      this.toast.success(this.t.instant('Payment successful.'));
      this.load();
      this.loadInvoices();
    } catch (err) {
      this.payingId.set(null);
      this.toast.apiError(err, this.t.instant('Could not complete the payment.'));
    }
  }

  /** Fallback renewal: create (or fetch) the Pending invoice on demand, then open the pay flow. */
  async renewNow(): Promise<void> {
    if (this.renewing() || this.payingId()) return;
    this.renewing.set(true);
    try {
      const inv = await firstValueFrom(this.service.renew());
      this.renewing.set(false);
      // Fully-discounted / free plan → already auto-renewed (₹0 Paid), nothing to pay.
      if (inv.status === 'Paid') {
        this.toast.success(this.t.instant('Subscription renewed.'));
        this.load();
        this.loadInvoices();
        return;
      }
      this.invoices.update((list) => [inv, ...list.filter((i) => i.id !== inv.id)]);
      await this.payInvoice(inv);
    } catch (err) {
      this.renewing.set(false);
      this.toast.apiError(err, this.t.instant('Could not start the renewal.'));
    }
  }

  openInvoice(inv: SubscriptionInvoice): void {
    this.router.navigate(['/settings/subscription/invoices', inv.id]);
  }

  downloadInvoice(inv: SubscriptionInvoice): void {
    this.service.downloadPdf(inv.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${inv.invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not download the PDF.')),
    });
  }

  invoiceStatusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-delivered';
      case 'Pending': return 'status-overdue';
      default: return 'status-pending';
    }
  }

  cancel(): void {
    if (!confirm(this.t.instant('Cancel your subscription? You keep access until the end of the current period.'))) return;
    this.service.cancel().subscribe({
      next: () => {
        this.toast.success(this.t.instant('Subscription cancelled. You keep access until the period ends.'));
        this.load();
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not cancel the subscription.')),
    });
  }

  resume(): void {
    this.service.resume().subscribe({
      next: () => {
        this.toast.success(this.t.instant('Subscription resumed.'));
        this.load();
      },
      error: (err) => this.toast.apiError(err, this.t.instant('Could not resume the subscription.')),
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

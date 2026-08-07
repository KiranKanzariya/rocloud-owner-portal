import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService, SubscriptionInvoice, SubscriptionBillTo } from '../../../../core/services/subscription.service';
import { RazorpayService } from '../../../../core/services/razorpay.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { NavigationService } from '../../../../core/services/navigation.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { PdfPreviewComponent } from '../../../../shared/components/pdf-preview/pdf-preview.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/** Detail view for a single ROCloud subscription invoice (guide §25), opened from Billing history. */
@Component({
  selector: 'app-subscription-invoice-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, SkeletonComponent, PdfPreviewComponent, TranslatePipe],
  templateUrl: './subscription-invoice-detail.component.html',
})
export class SubscriptionInvoiceDetailComponent {
  private readonly service = inject(SubscriptionService);
  private readonly razorpay = inject(RazorpayService);
  private readonly auth = inject(AuthService);
  private readonly perm = inject(PermissionService);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  protected readonly invoice = signal<SubscriptionInvoice | null>(null);
  protected readonly loading = signal(true);
  protected readonly paying = signal(false);
  protected readonly canManage = this.perm.isOwner();
  protected readonly businessName = this.perm.businessName;

  private readonly id = this.route.snapshot.paramMap.get('id')!;
  protected readonly pdfUrl = this.service.pdfUrl(this.id);

  /**
   * periodEnd is EXCLUSIVE — access stops at that instant. Printing it raw makes consecutive invoices
   * share a date ("01 Jul – 01 Aug" then "01 Aug – 01 Sep"), which reads as being billed twice for the
   * 1st. Show the last day actually covered, matching the PDF.
   */
  protected lastCoveredDay(periodStart: string, periodEnd: string): Date {
    const end = new Date(periodEnd);
    end.setDate(end.getDate() - 1);
    return end > new Date(periodStart) ? end : new Date(periodStart);
  }

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.service.invoice(this.id).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  back(): void {
    this.nav.back('/settings/subscription');
  }

  /** Copies a payment reference — the ids are long and are what support asks for. */
  copy(value: string | null | undefined): void {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => this.toast.success(this.t.instant('Copied.')));
  }

  /** Razorpay's raw method → a label worth reading. Unknown values pass through as-is. */
  private static readonly METHOD_LABELS: Record<string, string> = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Netbanking',
    wallet: 'Wallet',
  };

  protected methodLabel(method: string | null | undefined): string {
    if (!method) return 'Razorpay';
    return SubscriptionInvoiceDetailComponent.METHOD_LABELS[method.toLowerCase()] ?? method;
  }

  protected methodIcon(method: string | null | undefined): string {
    switch ((method ?? '').toLowerCase()) {
      case 'card': return 'ti-credit-card';
      case 'upi': return 'ti-qrcode';
      case 'netbanking': return 'ti-building-bank';
      case 'wallet': return 'ti-wallet';
      default: return 'ti-cash';
    }
  }

  /** "City, State — Pincode", skipping whatever the owner hasn't filled in. */
  protected cityLine(b: SubscriptionBillTo): string {
    const left = [b.city, b.state].filter(Boolean).join(', ');
    return [left, b.pincode].filter(Boolean).join(' — ');
  }

  /** Pay this Pending invoice: initiate → Razorpay (unless free/dev) → complete → refresh JWT → reload. */
  async pay(): Promise<void> {
    const inv = this.invoice();
    if (!inv || inv.status !== 'Pending' || this.paying()) return;
    this.paying.set(true);
    try {
      const init = await firstValueFrom(this.service.payInvoiceInitiate(inv.id));
      if (!init.isFree) {
        const paid = await this.razorpay.pay(init, { name: this.perm.name() });
        if (!paid) {
          this.paying.set(false);
          this.toast.error(this.t.instant('Payment was cancelled.'));
          return;
        }
      }
      await firstValueFrom(this.service.payInvoiceComplete(inv.id, init.orderId));
      await firstValueFrom(this.auth.refreshToken());
      this.paying.set(false);
      this.toast.success(this.t.instant('Payment successful.'));
      this.reload();
    } catch (err) {
      this.paying.set(false);
      this.toast.apiError(err, this.t.instant('Could not complete the payment.'));
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-delivered';
      case 'Pending': return 'status-overdue';
      // Withdrawn, not failed — grey, matching the billing list.
      case 'Cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { PaymentService, OutstandingDue } from '../../../core/services/payment.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { PaymentQrModalComponent } from '../payment-qr-modal/payment-qr-modal.component';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

/**
 * The money-in worklist: every customer who owes, settled in one tap each.
 *
 * <p>Why this screen exists: a UPI QR on the invoice takes the money but tells ROCloud nothing — the
 * payment lands in the owner's own UPI app and cannot be reconciled. Without a fast way to write those
 * down, invoices stay open and the reminder job duns people who have already paid. Recording used to
 * mean find customer → open modal → type amount → pick method → save, five steps per payment, which
 * nobody does a hundred times a day.</p>
 *
 * <p>So each row records the customer's FULL outstanding balance with one tap. The amount is not typed,
 * because the balance is already known and typing it is where mistakes come from. Anything unusual —
 * a part payment, a different date, a reference — still goes through the full modal on the customer
 * page; this screen is deliberately only the common case.</p>
 */
@Component({
  selector: 'app-money-in',
  standalone: true,
  imports: [DecimalPipe, RouterLink, FormsModule, TranslatePipe, PaymentQrModalComponent, MobilePipe],
  templateUrl: './money-in.component.html',
})
export class MoneyInComponent {
  private readonly payments = inject(PaymentService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly rows = signal<OutstandingDue[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly search = signal('');

  /** Cash is offered too — the same worklist serves a doorstep round, not only QR payments. */
  protected readonly method = signal<'UPI' | 'Cash'>('UPI');
  protected readonly canCollect = this.perm.can('Payments.Collect');

  /** Customer whose counter QR is on screen — the customer is standing there, scanning it. */
  protected readonly qrCustomerId = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.rows();
    if (!q) return all;
    return all.filter(
      (r) => r.customerName.toLowerCase().includes(q) || (r.customerMobile ?? '').includes(q),
    );
  });

  protected readonly total = computed(() =>
    this.visible().reduce((sum, r) => sum + r.outstandingAmount, 0),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    // 0, not the 7-day dunning default: someone paying today may owe on this morning's delivery.
    this.payments.outstanding(0).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Records the whole balance for one customer. The row is dropped from the list on success rather
   * than the list being refetched — the owner is working down a list they can see, and having it
   * reorder under their finger is how the wrong row gets tapped.
   */
  protected async record(row: OutstandingDue): Promise<void> {
    if (!this.canCollect || this.busyId()) return;
    this.busyId.set(row.customerId);
    try {
      await firstValueFrom(
        this.payments.collect({
          customerId: row.customerId,
          amount: row.outstandingAmount,
          paymentMethod: this.method(),
        }),
      );
      this.rows.update((rows) => rows.filter((r) => r.customerId !== row.customerId));
      this.toast.success(
        this.t.instant('Recorded ₹{{amount}} from {{name}}.', {
          amount: row.outstandingAmount.toLocaleString('en-IN'),
          name: row.customerName,
        }),
      );
    } catch (err) {
      this.toast.apiError(err, this.t.instant('Could not record the payment.'));
    } finally {
      this.busyId.set(null);
    }
  }
}

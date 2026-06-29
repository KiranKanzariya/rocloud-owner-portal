import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InvoiceService } from '../invoice.service';
import { InvoiceDetail } from '../invoice.models';
import { PdfPreviewComponent } from '../../../shared/components/pdf-preview/pdf-preview.component';
import { CanDirective } from '../../../shared/directives/can.directive';
import { NavigationService } from '../../../core/services/navigation.service';
import { PaymentService, PaymentListItem } from '../../../core/services/payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, PdfPreviewComponent, CanDirective, TranslatePipe],
  templateUrl: './invoice-detail.component.html',
})
export class InvoiceDetailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(InvoiceService);
  private readonly payments = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly nav = inject(NavigationService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  /** Returns to wherever the user came from (invoice list, a customer page, …); else the list. */
  back(): void {
    this.nav.back('/invoices');
  }

  protected readonly invoice = signal<InvoiceDetail | null>(null);
  protected readonly invoicePayments = signal<PaymentListItem[]>([]);
  protected readonly payOpen = signal(false);
  protected readonly sending = signal(false);
  protected readonly saving = signal(false);

  protected readonly paymentMethods = ['Cash', 'UPI', 'Card', 'Online', 'BankTransfer'];
  protected readonly pdfUrl = computed(() => this.service.pdfUrl(this.id));
  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly payForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['Cash', Validators.required],
    referenceNumber: [''],
    notes: [''],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.service.get(this.id).subscribe((inv) => {
      this.invoice.set(inv);
      this.payForm.controls.amount.setValue(inv.balance);
      this.payments
        .forCustomer(inv.customerId)
        .subscribe((all) => this.invoicePayments.set(all.filter((p) => p.invoiceId === inv.id)));
    });
  }

  send(): void {
    this.sending.set(true);
    this.service.send(this.id).subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(this.t.instant('Invoice sent to the customer.'));
      },
      error: () => {
        this.sending.set(false);
        this.toast.error(this.t.instant('Could not send the invoice.'));
      },
    });
  }

  recordPayment(): void {
    const inv = this.invoice();
    if (!inv || this.payForm.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.payForm.getRawValue();
    this.payments
      .collect({
        customerId: inv.customerId,
        invoiceId: inv.id,
        amount: v.amount,
        paymentMethod: v.paymentMethod,
        referenceNumber: v.referenceNumber || null,
        notes: v.notes || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.payOpen.set(false);
          this.toast.success(this.t.instant('Payment recorded.'));
          this.reload();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Could not record the payment.'));
        },
      });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-delivered';
      case 'Overdue': return 'status-overdue';
      default: return 'status-pending';
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  PaymentService,
  PaymentListItem,
  PaymentFilter,
  OutstandingDue,
} from '../../core/services/payment.service';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { CollectPaymentModalComponent } from './collect-payment-modal/collect-payment-modal.component';
import { TranslatePipe } from '@ngx-translate/core';

const METHODS = ['Cash', 'UPI', 'Card', 'Online', 'BankTransfer'];
const STATUSES = ['Completed', 'Pending', 'Failed', 'Refunded'];

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [DatePipe, DecimalPipe, DataTableComponent, ColumnCellDirective, CanDirective, CollectPaymentModalComponent, TranslatePipe],
  templateUrl: './payments.component.html',
})
export class PaymentsComponent {
  private readonly service = inject(PaymentService);

  protected readonly methods = METHODS;
  protected readonly statuses = STATUSES;

  protected readonly rows = signal<PaymentListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly modalOpen = signal(false);

  // Metrics are computed client-side from the date-window payments (guide §23 flagged
  // decision: no server summary endpoint), plus the outstanding endpoint.
  protected readonly windowPayments = signal<PaymentListItem[]>([]);
  protected readonly outstanding = signal<OutstandingDue[]>([]);

  protected readonly collected = computed(() =>
    this.windowPayments().reduce((sum, p) => sum + p.amount, 0),
  );
  protected readonly cash = computed(() =>
    this.windowPayments().filter((p) => p.paymentMethod === 'Cash').reduce((sum, p) => sum + p.amount, 0),
  );
  protected readonly upi = computed(() =>
    this.windowPayments().filter((p) => p.paymentMethod === 'UPI').reduce((sum, p) => sum + p.amount, 0),
  );
  protected readonly outstandingTotal = computed(() =>
    this.outstanding().reduce((sum, o) => sum + o.outstandingAmount, 0),
  );

  protected readonly columns: ColumnDef[] = [
    { key: 'paidAt', header: 'Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'invoiceNumber', header: 'Invoice' },
    { key: 'paymentMethod', header: 'Method' },
    { key: 'referenceNumber', header: 'Reference' },
    { key: 'amount', header: 'Amount', align: 'right' },
    { key: 'status', header: 'Status' },
  ];

  protected filter: PaymentFilter = { page: 1, pageSize: 25 };

  constructor() {
    this.load();
    this.loadMetrics();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.filter).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Pulls the date-window payments for the metric cards + outstanding dues. */
  loadMetrics(): void {
    this.service
      .list({ fromDate: this.filter.fromDate, toDate: this.filter.toDate, page: 1, pageSize: 500 })
      .subscribe((res) => this.windowPayments.set(res.items));
    this.service.outstanding().subscribe((o) => this.outstanding.set(o));
  }

  setDate(which: 'fromDate' | 'toDate', value: string): void {
    this.filter = { ...this.filter, [which]: value || undefined, page: 1 };
    this.load();
    this.loadMetrics();
  }

  setMethod(method: string): void {
    this.filter = { ...this.filter, paymentMethod: method || undefined, page: 1 };
    this.load();
  }

  setStatus(status: string): void {
    this.filter = { ...this.filter, status: status || undefined, page: 1 };
    this.load();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.load();
  }

  onSaved(): void {
    this.modalOpen.set(false);
    this.load();
    this.loadMetrics();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-delivered';
      case 'Pending': return 'status-pending';
      case 'Failed': return 'status-overdue';
      default: return 'status-active-info';
    }
  }
}

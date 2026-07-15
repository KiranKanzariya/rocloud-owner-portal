import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  PaymentService,
  PaymentListItem,
  PaymentFilter,
  PaymentSummary,
  OutstandingDue,
} from '../../core/services/payment.service';
import { CustomerService } from '../customers/customer.service';
import { CustomerListItem } from '../customers/customer.models';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { CollectPaymentModalComponent } from './collect-payment-modal/collect-payment-modal.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MobilePipe } from '../../shared/pipes/mobile.pipe';

const METHODS = ['Cash', 'UPI', 'Card', 'Online', 'BankTransfer'];
const STATUSES = ['Completed', 'Pending', 'Failed', 'Refunded'];

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, DataTableComponent, ColumnCellDirective, CanDirective, CollectPaymentModalComponent, TranslatePipe, MobilePipe],
  templateUrl: './payments.component.html',
})
export class PaymentsComponent {
  private readonly service = inject(PaymentService);
  private readonly customers = inject(CustomerService);

  protected readonly methods = METHODS;
  protected readonly statuses = STATUSES;

  protected readonly rows = signal<PaymentListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly modalOpen = signal(false);

  // The money tiles come from the API's SQL aggregate. They used to be a reduce over a fetched page,
  // which under-reported real collection as soon as the window held more than one page of payments.
  protected readonly summary = signal<PaymentSummary | null>(null);
  protected readonly outstanding = signal<OutstandingDue[]>([]);

  protected readonly collected = computed(() => this.summary()?.collected ?? 0);
  protected readonly cash = computed(() => this.summary()?.cash ?? 0);
  protected readonly upi = computed(() => this.summary()?.upi ?? 0);
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

  // Customer filter: a debounced search over the customers list, with a small results dropdown.
  protected readonly customerSearch = new FormControl('', { nonNullable: true });
  protected readonly customerResults = signal<CustomerListItem[]>([]);
  protected readonly selectedCustomer = signal<CustomerListItem | null>(null);

  constructor() {
    this.customerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        // Once a customer is picked the box shows their name; don't re-search until it's cleared.
        if (this.selectedCustomer() || !term.trim()) {
          this.customerResults.set([]);
          return;
        }
        this.customers.list({ search: term.trim(), page: 1, pageSize: 6 })
          .subscribe((r) => this.customerResults.set(r.items));
      });
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

  /** Metric cards: collection totals for the date window (server-summed) + outstanding dues. */
  loadMetrics(): void {
    this.service
      .summary(this.filter.fromDate, this.filter.toDate)
      .subscribe((s) => this.summary.set(s));
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

  selectCustomer(c: CustomerListItem): void {
    this.selectedCustomer.set(c);
    this.customerResults.set([]);
    this.customerSearch.setValue(c.name, { emitEvent: false });
    this.filter = { ...this.filter, customerId: c.id, page: 1 };
    this.load();
  }

  clearCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.filter = { ...this.filter, customerId: undefined, page: 1 };
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

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrderService } from '../order.service';
import { OrderFilter, OrderListItem } from '../order.models';
import { CustomerService } from '../../customers/customer.service';
import { CustomerListItem } from '../../customers/customer.models';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { CanDirective, CanPlanDirective } from '../../../shared/directives/can.directive';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

const STATUSES = ['Pending', 'Confirmed', 'InTransit', 'Delivered', 'Cancelled', 'Returned'];

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, DataTableComponent, ColumnCellDirective, CanDirective, CanPlanDirective, TranslatePipe, MobilePipe],
  templateUrl: './order-list.component.html',
})
export class OrderListComponent {
  private readonly service = inject(OrderService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);
  private readonly customers = inject(CustomerService);

  protected readonly statuses = STATUSES;
  /** Set when arriving from a customer ("View all orders") — shows a dismissible filter chip. */
  protected readonly customerFilterName = signal<string | null>(null);
  protected readonly rows = signal<OrderListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly bulkRunning = signal(false);

  protected readonly columns: ColumnDef[] = [
    { key: 'orderDate', header: 'Date', sortable: true },
    { key: 'customerName', header: 'Customer' },
    { key: 'itemCount', header: 'Items' },
    { key: 'deliveryMode', header: 'Mode' },
    { key: 'deliveryBoyName', header: 'Delivery boy' },
    { key: 'totalAmount', header: 'Amount', align: 'right' },
    { key: 'paymentStatus', header: 'Payment' },
    { key: 'status', header: 'Status' },
  ];

  protected filter: OrderFilter = { page: 1, pageSize: 25, sortBy: 'orderDate', sortDir: 'desc' };

  // Customer filter: a debounced search over the customers list. A pick drives the same chip the
  // "View all orders" deep-link uses, so there is one consistent customer filter.
  protected readonly customerSearch = new FormControl('', { nonNullable: true });
  protected readonly customerResults = signal<CustomerListItem[]>([]);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const customerId = qp.get('customerId');
    if (customerId) {
      this.filter = { ...this.filter, customerId };
      this.customerFilterName.set(qp.get('customerName') ?? this.t.instant('one customer'));
    }

    this.customerSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        // Once a customer is picked the chip shows their name; don't re-search until it's cleared.
        if (this.customerFilterName() || !term.trim()) {
          this.customerResults.set([]);
          return;
        }
        this.customers.list({ search: term.trim(), page: 1, pageSize: 6 })
          .subscribe((r) => this.customerResults.set(r.items));
      });
    this.load();
  }

  selectCustomer(c: CustomerListItem): void {
    this.customerFilterName.set(c.name);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.filter = { ...this.filter, customerId: c.id, page: 1 };
    this.load();
  }

  /** Clears the customer filter (from either the search or the "View all orders" deep-link). */
  clearCustomerFilter(): void {
    this.customerFilterName.set(null);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.filter = { ...this.filter, customerId: undefined, page: 1 };
    this.router.navigate([], { queryParams: {} });
    this.load();
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

  setStatus(status: string): void {
    this.filter = { ...this.filter, status: status || undefined, page: 1 };
    this.load();
  }

  setDate(which: 'fromDate' | 'toDate', value: string): void {
    this.filter = { ...this.filter, [which]: value || undefined, page: 1 };
    this.load();
  }

  onSort(s: SortState): void {
    // Reset to page 1 so a new sort starts at the top, not mid-list (matches the Users grid).
    this.filter = { ...this.filter, sortBy: s.sortBy, sortDir: s.sortDir, page: 1 };
    this.load();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.load();
  }

  open(o: OrderListItem): void {
    this.router.navigate(['/orders', o.id]);
  }

  bulkImport(): void {
    this.bulkRunning.set(true);
    this.service.bulkFromSubscriptions().subscribe({
      next: (r) => {
        this.bulkRunning.set(false);
        this.toast.success(this.t.instant('{{count}} order(s) created from subscriptions.', { count: r.ordersCreated }));
        this.load();
      },
      error: (err) => {
        this.bulkRunning.set(false);
        this.toast.apiError(err, this.t.instant('Bulk import failed.'));
      },
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Delivered': return 'status-delivered';
      case 'Pending':
      case 'Confirmed': return 'status-pending';
      case 'InTransit': return 'status-in-transit';
      default: return 'status-overdue';
    }
  }

  paymentClass(status: string): string {
    switch (status) {
      case 'Paid': return 'status-active';
      case 'Partial': return 'status-pending';
      case 'Unpaid': return 'status-overdue';
      case 'Invoiced': return 'text-caption text-ink-mid';
      default: return 'text-micro text-ink-mid';
    }
  }
}

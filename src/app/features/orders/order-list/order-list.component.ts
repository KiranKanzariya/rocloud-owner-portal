import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { isFiltered, readFilter, writeFilter } from '../../../core/services/list-filter';
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
import { AutocompleteDirective } from '../../../shared/directives/autocomplete.directive';

const STATUSES = ['Pending', 'Confirmed', 'InTransit', 'Delivered', 'Failed', 'Cancelled', 'Returned'];

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [AutocompleteDirective, DatePipe, DecimalPipe, ReactiveFormsModule, DataTableComponent, ColumnCellDirective, CanDirective, CanPlanDirective, TranslatePipe, MobilePipe],
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

  /** Baseline the URL is diffed against — only non-default values reach the address bar. */
  private static readonly DEFAULTS = {
    page: 1,
    pageSize: 25,
    sortBy: 'orderDate',
    sortDir: 'desc',
    status: undefined,
    fromDate: undefined,
    toDate: undefined,
    customerId: undefined,
  } as unknown as OrderFilter & Record<string, string | number | boolean | undefined>;

  /** Hydrated from the query string, so Back off an order restores the list you left. */
  protected filter = readFilter(inject(ActivatedRoute), OrderListComponent.DEFAULTS);

  protected readonly filterState = signal(0);
  protected readonly hasFilters = computed(() => {
    this.filterState();
    return isFiltered(this.filter, OrderListComponent.DEFAULTS);
  });

  /** Non-null when From is later than To — the pair silently returned nothing before. */
  protected readonly dateRangeInvalid = computed(() => {
    this.filterState();
    const { fromDate, toDate } = this.filter;
    return !!fromDate && !!toDate && fromDate > toDate;
  });

  // Customer filter: a debounced search over the customers list. A pick drives the same chip the
  // "View all orders" deep-link uses, so there is one consistent customer filter.
  protected readonly customerSearch = new FormControl('', { nonNullable: true });
  protected readonly customerResults = signal<CustomerListItem[]>([]);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    if (this.filter.customerId) {
      this.customerFilterName.set(qp.get('customerName') ?? this.t.instant('one customer'));
    }

    // switchMap cancels the in-flight lookup, so a slow early response can't land after
    // (and overwrite) the results for what you have actually typed.
    this.customerSearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          // Once a customer is picked the chip shows their name; don't re-search until cleared.
          if (this.customerFilterName() || !term.trim()) return of(null);
          return this.customers.list({ search: term.trim(), page: 1, pageSize: 6 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe((r) => this.customerResults.set(r?.items ?? []));

    this.load();
  }

  /** Single funnel for every filter change: merge, mirror to the URL, refresh the flags. */
  private apply(next: Partial<OrderFilter>, reload = true): void {
    // A page change keeps the requested page (already in `next`); any OTHER change resets to page 1.
    // The old form re-read this.filter.page here, overwriting the requested page — so paging stuck.
    this.filter = 'page' in next ? { ...this.filter, ...next } : { ...this.filter, ...next, page: 1 };
    writeFilter(this.router, this.route, this.filter, OrderListComponent.DEFAULTS, {
      customerName: this.customerFilterName() ?? null,
    });
    this.filterState.update((v) => v + 1);
    if (reload && !this.dateRangeInvalid()) this.load();
  }

  /** Resets every filter back to the unfiltered list. */
  clearFilters(): void {
    this.customerFilterName.set(null);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.apply({ status: undefined, fromDate: undefined, toDate: undefined, customerId: undefined });
  }

  selectCustomer(c: CustomerListItem): void {
    this.customerFilterName.set(c.name);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.apply({ customerId: c.id });
  }

  /** Clears the customer filter (from either the search or the "View all orders" deep-link). */
  clearCustomerFilter(): void {
    this.customerFilterName.set(null);
    this.customerResults.set([]);
    this.customerSearch.setValue('', { emitEvent: false });
    this.apply({ customerId: undefined });
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
    this.apply({ status: status || undefined });
  }

  setDate(which: 'fromDate' | 'toDate', value: string): void {
    this.apply({ [which]: value || undefined });
  }

  onSort(s: SortState): void {
    // Reset to page 1 so a new sort starts at the top, not mid-list (matches the Users grid).
    this.apply({ sortBy: s.sortBy, sortDir: s.sortDir });
  }

  onPage(page: number): void {
    this.apply({ page });
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

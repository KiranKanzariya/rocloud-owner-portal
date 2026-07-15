import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import {
  DeliveryProductTotal,
  DeliverySummaryRow,
  InventorySummary,
  OrderListItem,
  OutstandingDue,
  PaymentSummary,
} from '../../core/models/dashboard.models';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { PermissionService } from '../../core/services/permission.service';
import { guarded } from '../../core/http/guarded';
import { istToday } from '../../shared/util/ist-date.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, CountUpDirective, DataTableComponent, ColumnCellDirective, CanDirective],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  /** Recent-orders widget columns (top-10, no paging/sort). */
  protected readonly recentOrderColumns: ColumnDef[] = [
    { key: 'orderDate', header: 'Date' },
    { key: 'customerName', header: 'Customer' },
    { key: 'itemCount', header: 'Items' },
    { key: 'totalAmount', header: 'Amount', align: 'right' },
    { key: 'status', header: 'Status' },
  ];

  statusClass(status: string): string {
    switch (status) {
      case 'Delivered':
      case 'Paid':
        return 'status-delivered';
      case 'Pending':
      case 'Confirmed':
        return 'status-pending';
      case 'InTransit':
        return 'status-in-transit';
      case 'Cancelled':
      case 'Returned':
        return 'status-overdue';
      default:
        return 'status-active-info';
    }
  }

  private readonly http = inject(HttpClient);
  private readonly perms = inject(PermissionService);
  private readonly api = environment.apiUrl;
  private readonly today = istToday();

  /** Every widget is permission-gated, so a role like Technician would otherwise see a bare page. */
  protected readonly hasAnyWidget = computed(() =>
    this.perms.canAny('Deliveries.View', 'Payments.View', 'Orders.View', 'Inventory.View'),
  );

  // Raw data signals
  protected readonly routeProgress = signal<DeliverySummaryRow[]>([]);
  /** Today's deliveries broken down by product (jars per product). */
  protected readonly deliveryProductTotals = signal<DeliveryProductTotal[]>([]);
  /** Today's collection, summed by the API — not a reduce over a fetched page of payments. */
  protected readonly paymentSummary = signal<PaymentSummary | null>(null);
  protected readonly dues = signal<OutstandingDue[]>([]);
  protected readonly recentOrders = signal<OrderListItem[]>([]);
  protected readonly inventory = signal<InventorySummary[]>([]);

  // Derived metrics
  protected readonly todaysDeliveries = computed(() =>
    this.routeProgress().reduce((sum, r) => sum + r.total, 0),
  );
  protected readonly bottlesOut = computed(() =>
    this.inventory().reduce((sum, i) => sum + (i.issuedStock ?? 0), 0),
  );
  protected readonly collectionToday = computed(() => this.paymentSummary()?.collected ?? 0);
  protected readonly outstandingTotal = computed(() =>
    this.dues().reduce((sum, d) => sum + d.outstandingAmount, 0),
  );

  protected readonly paymentSplit = computed(() => {
    const s = this.paymentSummary();
    return { cash: s?.cash ?? 0, upi: s?.upi ?? 0, other: s?.other ?? 0 };
  });

  // The dashboard is the landing page for every role, so each widget's fetch is gated on the
  // permission its endpoint demands. Without this a Technician fires all five and is refused all
  // five, on every login. The permission must match the controller's [RequirePermission].
  constructor() {
    this.load('Deliveries.View', `/deliveries/summary?date=${this.today}`, this.routeProgress);
    this.load('Deliveries.View', `/deliveries/product-totals?date=${this.today}`, this.deliveryProductTotals);
    this.loadOne<PaymentSummary>(
      'Payments.View',
      `/payments/summary?fromDate=${this.today}&toDate=${this.today}`,
      this.paymentSummary,
    );
    this.load('Payments.View', `/payments/outstanding`, this.dues);
    this.loadPaged<OrderListItem>('Orders.View', `/orders?pageSize=10`, this.recentOrders);
    this.load('Inventory.View', `/inventory`, this.inventory);
  }

  /** GET an ApiResponse<T> (a single object, e.g. the collection summary) when the user may. */
  private loadOne<T>(permission: string, path: string, target: { set: (v: T) => void }): void {
    guarded<T | null>(
      this.perms,
      permission,
      () => this.unwrap<T>(this.http.get<ApiResponse<T>>(`${this.api}${path}`)),
      null,
    ).subscribe((v) => {
      if (v) target.set(v);
    });
  }

  /** GET an ApiResponse<T[]> when the user may; otherwise no request is made at all. */
  private load<T>(permission: string, path: string, target: { set: (v: T[]) => void }): void {
    guarded<T[] | null>(
      this.perms,
      permission,
      () => this.unwrap<T[]>(this.http.get<ApiResponse<T[]>>(`${this.api}${path}`)),
      null,
    ).subscribe((v) => {
      if (v) target.set(v);
    });
  }

  private loadPaged<T>(permission: string, path: string, target: { set: (v: T[]) => void }): void {
    guarded<PagedResult<T> | null>(
      this.perms,
      permission,
      () => this.unwrap<PagedResult<T>>(this.http.get<ApiResponse<PagedResult<T>>>(`${this.api}${path}`)),
      null,
    ).subscribe((v) => {
      if (v) target.set(v.items);
    });
  }

  /** One failing widget shouldn't blank the whole dashboard. Permission denials no longer reach here. */
  private unwrap<T>(req: Observable<ApiResponse<T>>): Observable<T | null> {
    return req.pipe(
      map((r) => r.data),
      catchError(() => of(null)),
    );
  }
}

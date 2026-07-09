import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { CountUpDirective } from '../../shared/directives/count-up.directive';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import {
  DeliverySummaryRow,
  InventorySummary,
  OrderListItem,
  OutstandingDue,
  PaymentListItem,
} from '../../core/models/dashboard.models';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { istToday } from '../../shared/util/ist-date.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, CountUpDirective, DataTableComponent, ColumnCellDirective],
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
  private readonly api = environment.apiUrl;
  private readonly today = istToday();

  // Raw data signals
  protected readonly routeProgress = signal<DeliverySummaryRow[]>([]);
  protected readonly payments = signal<PaymentListItem[]>([]);
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
  protected readonly completedPayments = computed(() =>
    this.payments().filter((p) => p.status === 'Completed'),
  );
  protected readonly collectionToday = computed(() =>
    this.completedPayments().reduce((sum, p) => sum + p.amount, 0),
  );
  protected readonly outstandingTotal = computed(() =>
    this.dues().reduce((sum, d) => sum + d.outstandingAmount, 0),
  );

  protected readonly paymentSplit = computed(() => {
    const by = (m: string) =>
      this.completedPayments()
        .filter((p) => p.paymentMethod === m)
        .reduce((s, p) => s + p.amount, 0);
    const cash = by('Cash');
    const upi = by('UPI');
    const other = this.collectionToday() - cash - upi;
    return { cash, upi, other };
  });

  constructor() {
    this.load(`/deliveries/summary?date=${this.today}`, this.routeProgress);
    this.loadPaged<PaymentListItem>(`/payments?fromDate=${this.today}&toDate=${this.today}&pageSize=500`, this.payments);
    this.load(`/payments/outstanding`, this.dues);
    this.loadPaged<OrderListItem>(`/orders?pageSize=10`, this.recentOrders);
    this.load(`/inventory`, this.inventory);
  }

  /** GET an ApiResponse<T[]>; on any error (incl. 403) leave the signal at its default. */
  private load<T>(path: string, target: { set: (v: T[]) => void }): void {
    this.unwrap<T[]>(this.http.get<ApiResponse<T[]>>(`${this.api}${path}`)).subscribe((v) => {
      if (v) target.set(v);
    });
  }

  private loadPaged<T>(path: string, target: { set: (v: T[]) => void }): void {
    this.unwrap<PagedResult<T>>(this.http.get<ApiResponse<PagedResult<T>>>(`${this.api}${path}`)).subscribe((v) => {
      if (v) target.set(v.items);
    });
  }

  private unwrap<T>(req: Observable<ApiResponse<T>>): Observable<T | null> {
    return req.pipe(
      map((r) => r.data),
      catchError(() => of(null)),
    );
  }
}

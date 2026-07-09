import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import {
  BulkCreateResult,
  CreateOrder,
  OrderDetail,
  OrderFilter,
  OrderListItem,
  ProductionPlanDay,
  UpcomingOrder,
} from './order.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/orders`;

  list(filter: OrderFilter): Observable<PagedResult<OrderListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.set('sortDir', filter.sortDir);
    return this.http.get<ApiResponse<PagedResult<OrderListItem>>>(this.base, { params }).pipe(map((r) => r.data!));
  }

  get(id: string): Observable<OrderDetail> {
    return this.http.get<ApiResponse<OrderDetail>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  create(body: CreateOrder): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  update(id: string, body: Omit<CreateOrder, 'customerId'>): Observable<unknown> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${id}`, body);
  }

  cancel(id: string): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/cancel`, {});
  }

  bulkFromSubscriptions(targetDate?: string): Observable<BulkCreateResult> {
    return this.http
      .post<ApiResponse<BulkCreateResult>>(`${this.base}/bulk-from-subscriptions`, { targetDate: targetDate ?? null })
      .pipe(map((r) => r.data!));
  }

  /** Future-dated bookings (event/program orders) not yet on the day's delivery board. */
  upcoming(days = 60): Observable<UpcomingOrder[]> {
    const params = new HttpParams().set('days', days);
    return this.http
      .get<ApiResponse<UpcomingOrder[]>>(`${this.base}/upcoming`, { params })
      .pipe(map((r) => r.data!));
  }

  /** Per-day, per-product demand from upcoming bookings so the plant can prepare stock. */
  productionPlan(from?: string, to?: string): Observable<ProductionPlanDay[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http
      .get<ApiResponse<ProductionPlanDay[]>>(`${this.base}/production-plan`, { params })
      .pipe(map((r) => r.data!));
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import {
  CreateCustomerSubscription,
  CustomerDetail,
  CustomerDiscountType,
  CustomerFilter,
  CustomerJarBalance,
  CustomerListItem,
  CustomerStats,
  CustomerUpsert,
  ImportResult,
  OpeningBalance,
  SetOpeningBalanceInput,
  UpdateCustomerSubscription,
} from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/customers`;

  list(filter: CustomerFilter): Observable<PagedResult<CustomerListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.search) params = params.set('search', filter.search);
    if (filter.deliveryMode) params = params.set('deliveryMode', filter.deliveryMode);
    if (filter.paymentPreference) params = params.set('paymentPreference', filter.paymentPreference);
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive);
    if (filter.areaId) params = params.set('areaId', filter.areaId);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.set('sortDir', filter.sortDir);

    return this.http
      .get<ApiResponse<PagedResult<CustomerListItem>>>(this.base, { params })
      .pipe(map((r) => r.data!));
  }

  get(id: string): Observable<CustomerDetail> {
    return this.http.get<ApiResponse<CustomerDetail>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  stats(id: string): Observable<CustomerStats> {
    return this.http.get<ApiResponse<CustomerStats>>(`${this.base}/${id}/stats`).pipe(map((r) => r.data!));
  }

  /** Net returnable jars the customer still holds, per product. */
  jarBalance(id: string): Observable<CustomerJarBalance[]> {
    return this.http
      .get<ApiResponse<CustomerJarBalance[]>>(`${this.base}/${id}/jar-balance`)
      .pipe(map((r) => r.data ?? []));
  }

  /** Adds a recurring delivery subscription that the nightly job turns into orders. */
  createSubscription(customerId: string, body: CreateCustomerSubscription): Observable<{ id: string }> {
    return this.http
      .post<ApiResponse<{ id: string }>>(`${this.base}/${customerId}/subscriptions`, body)
      .pipe(map((r) => r.data!));
  }

  /** Edits a subscription in place (quantity / frequency / rate). Product stays fixed. */
  updateSubscription(
    customerId: string, subId: string, body: UpdateCustomerSubscription): Observable<{ id: string }> {
    return this.http
      .put<ApiResponse<{ id: string }>>(`${this.base}/${customerId}/subscriptions/${subId}`, body)
      .pipe(map((r) => r.data!));
  }

  cancelSubscription(customerId: string, subId: string): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${customerId}/subscriptions/${subId}/cancel`, {});
  }

  create(body: CustomerUpsert): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  update(id: string, body: CustomerUpsert): Observable<{ id: string }> {
    return this.http.put<ApiResponse<{ id: string }>>(`${this.base}/${id}`, body).pipe(map((r) => r.data!));
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`);
  }

  /** Uploads the migration CSV. dryRun=true validates/previews; dryRun=false commits. */
  importCustomers(file: File, dryRun: boolean, cutoverDate: string): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const params = new HttpParams().set('dryRun', dryRun).set('cutoverDate', cutoverDate);
    return this.http
      .post<ApiResponse<ImportResult>>(`${this.base}/import`, form, { params })
      .pipe(map((r) => r.data!));
  }

  openingBalance(id: string): Observable<OpeningBalance> {
    return this.http
      .get<ApiResponse<OpeningBalance>>(`${this.base}/${id}/opening-balance`)
      .pipe(map((r) => r.data!));
  }

  setOpeningBalance(id: string, body: SetOpeningBalanceInput): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/opening-balance`, body);
  }

  clearOpeningBalance(id: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}/opening-balance`);
  }

  setDiscount(id: string, discountType: CustomerDiscountType, discountValue: number): Observable<unknown> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/${id}/discount`, { discountType, discountValue });
  }
}

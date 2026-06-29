import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/api-response';

export interface CollectPayment {
  customerId: string;
  invoiceId?: string | null;
  orderId?: string | null;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface PaymentListItem {
  id: string;
  customerId: string;
  customerName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  orderId: string | null;
  amount: number;
  paymentMethod: string;
  status: string;
  referenceNumber: string | null;
  collectedBy: string | null;
  paidAt: string;
}

export interface PaymentFilter {
  customerId?: string;
  paymentMethod?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

/** A customer with overdue unpaid invoices (matches API OutstandingDueDto). */
export interface OutstandingDue {
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  invoiceCount: number;
  outstandingAmount: number;
  oldestDueDate: string;
  daysOverdue: number;
}

/** Payments access (guide §10/§22/§23). Phase 23 expands this with the metrics/list UI. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/payments`;

  list(filter: PaymentFilter): Observable<PagedResult<PaymentListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http
      .get<ApiResponse<PagedResult<PaymentListItem>>>(this.base, { params })
      .pipe(map((r) => r.data!));
  }

  /** Customers with overdue unpaid invoices older than `overdueDays` (default 7). */
  outstanding(overdueDays = 7): Observable<OutstandingDue[]> {
    const params = new HttpParams().set('overdueDays', overdueDays);
    return this.http
      .get<ApiResponse<OutstandingDue[]>>(`${this.base}/outstanding`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  collect(body: CollectPayment): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  /** Payments for a customer (used to show an invoice's payment history). */
  forCustomer(customerId: string): Observable<PaymentListItem[]> {
    const params = new HttpParams().set('customerId', customerId).set('pageSize', 100);
    return this.http
      .get<ApiResponse<PagedResult<PaymentListItem>>>(this.base, { params })
      .pipe(map((r) => r.data?.items ?? []));
  }
}

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
  /** The day the money was received. Omit for today; may be backdated within the platform window. */
  paidOn?: string | null;
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
  /** Collector's note, plus any warning appended by reconcile / Razorpay confirm. See PAYMENT_NOTE. */
  notes: string | null;
}

/**
 * The API prefixes a note the owner must ACT on (currently: money captured against an already-settled
 * invoice, so a refund may be due) with a stable marker. Matching the prose instead would break the
 * moment the wording or language changed.
 */
export const PAYMENT_NOTE = {
  actionRequiredMarker: '[!]',
  /** True when this note is a warning rather than a plain remark. */
  isActionRequired: (notes: string | null | undefined): boolean =>
    !!notes && notes.includes(PAYMENT_NOTE.actionRequiredMarker),
  /** Note text without the marker — the marker is machine-readable, not something to show. */
  display: (notes: string | null | undefined): string =>
    (notes ?? '').split(PAYMENT_NOTE.actionRequiredMarker).join('').trim(),
} as const;

export interface PaymentFilter {
  customerId?: string;
  invoiceId?: string;
  paymentMethod?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

/** Collection totals for a window, summed by the API (never by reducing a fetched page). */
export interface PaymentSummary {
  collected: number;
  count: number;
  cash: number;
  upi: number;
  other: number;
}

/**
 * Scan-to-pay for a customer's current balance — the counter QR (matches API CustomerUpiQrDto).
 * `payload` is null when there is nothing to show; `configured` says whether that is because the
 * tenant hasn't set up scan-to-pay, or simply because nothing is owed.
 */
export interface CustomerUpiQr {
  customerId: string;
  customerName: string;
  balance: number;
  payload: string | null;
  vpa: string | null;
  configured: boolean;
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
    if (filter.invoiceId) params = params.set('invoiceId', filter.invoiceId);
    if (filter.paymentMethod) params = params.set('paymentMethod', filter.paymentMethod);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http
      .get<ApiResponse<PagedResult<PaymentListItem>>>(this.base, { params })
      .pipe(map((r) => r.data!));
  }

  /**
   * Customers who owe, aged past `overdueDays` (default 7 — the dunning view).
   * Pass **0** for everyone who owes as of today, which is what the money-in worklist wants: a
   * customer paying by UPI QR may owe on a delivery made this morning.
   */
  outstanding(overdueDays = 7): Observable<OutstandingDue[]> {
    const params = new HttpParams().set('overdueDays', overdueDays);
    return this.http
      .get<ApiResponse<OutstandingDue[]>>(`${this.base}/outstanding`, { params })
      .pipe(map((r) => r.data ?? []));
  }

  /**
   * The counter QR for a customer's current balance. Built server-side so the rules about what may be
   * asked for (opted in, has a VPA, owes something) live in one place — the invoice PDF uses the same
   * builder.
   */
  customerUpiQr(customerId: string): Observable<CustomerUpiQr> {
    return this.http
      .get<ApiResponse<CustomerUpiQr>>(`${this.base}/customers/${customerId}/upi-qr`)
      .pipe(map((r) => r.data!));
  }

  collect(body: CollectPayment): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  /**
   * Collection totals for a window. Summed by the API over every matching payment — the money tiles
   * must never be a reduction over one fetched page (the list endpoint caps pageSize at 100).
   */
  summary(fromDate?: string, toDate?: string): Observable<PaymentSummary> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http
      .get<ApiResponse<PaymentSummary>>(`${this.base}/summary`, { params })
      .pipe(map((r) => r.data!));
  }

  /**
   * Payments recorded against ONE invoice. Asking the server for the invoice's own payments — rather
   * than fetching the customer's first 100 and filtering here — is what stops an older invoice of a
   * busy customer showing zero receipts.
   */
  forInvoice(invoiceId: string): Observable<PaymentListItem[]> {
    const params = new HttpParams().set('invoiceId', invoiceId).set('pageSize', 100);
    return this.http
      .get<ApiResponse<PagedResult<PaymentListItem>>>(this.base, { params })
      .pipe(map((r) => r.data?.items ?? []));
  }

  /** Payments for a customer (their payment history). */
  forCustomer(customerId: string): Observable<PaymentListItem[]> {
    const params = new HttpParams().set('customerId', customerId).set('pageSize', 100);
    return this.http
      .get<ApiResponse<PagedResult<PaymentListItem>>>(this.base, { params })
      .pipe(map((r) => r.data?.items ?? []));
  }
}

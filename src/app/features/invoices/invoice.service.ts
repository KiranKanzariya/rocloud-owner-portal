import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import { GenerateInvoice, InvoiceDetail, InvoiceFilter, InvoiceListItem } from './invoice.models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/invoices`;

  list(filter: InvoiceFilter): Observable<PagedResult<InvoiceListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.periodFrom) params = params.set('periodFrom', filter.periodFrom);
    if (filter.periodTo) params = params.set('periodTo', filter.periodTo);
    return this.http.get<ApiResponse<PagedResult<InvoiceListItem>>>(this.base, { params }).pipe(map((r) => r.data!));
  }

  get(id: string): Observable<InvoiceDetail> {
    return this.http.get<ApiResponse<InvoiceDetail>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  generate(body: GenerateInvoice): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.base}/generate`, body).pipe(map((r) => r.data!));
  }

  /** Sends the invoice. `emailed` is false when the customer has no email on file (nothing went out). */
  send(id: string): Observable<{ emailed: boolean }> {
    return this.http
      .post<ApiResponse<{ id: string; emailed: boolean }>>(`${this.base}/${id}/send`, {})
      .pipe(map((r) => ({ emailed: r.data?.emailed ?? false })));
  }

  /** The PDF endpoint URL (fetched as a blob by roc-pdf-preview / download). */
  pdfUrl(id: string): string {
    return `${this.base}/${id}/pdf`;
  }
}

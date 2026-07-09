import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../../core/models/api-response';
import { AuditLog, AuditLogFilter } from './activity.models';

/** Reads the append-only audit log (who did what, when, and the outcome). Owner only. */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/audit-logs`;

  list(filter: AuditLogFilter): Observable<PagedResult<AuditLog>> {
    const params = this.filterParams(filter)
      .set('page', filter.page)
      .set('pageSize', filter.pageSize);
    return this.http.get<ApiResponse<PagedResult<AuditLog>>>(this.base, { params }).pipe(map((r) => r.data!));
  }

  /** Downloads the filtered trail as CSV (server caps the row count). */
  exportCsv(filter: AuditLogFilter): Observable<Blob> {
    return this.http.get(`${this.base}/export`, { params: this.filterParams(filter), responseType: 'blob' });
  }

  private filterParams(filter: AuditLogFilter): HttpParams {
    let params = new HttpParams();
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.module) params = params.set('module', filter.module);
    if (filter.action) params = params.set('action', filter.action);
    if (filter.result) params = params.set('result', filter.result);
    if (filter.search) params = params.set('search', filter.search);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return params;
  }
}

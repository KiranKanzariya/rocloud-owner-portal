import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../../core/models/api-response';
import { AuditLog, AuditLogFilter } from './activity.models';

/** Reads the append-only audit log (who did what, when, and the outcome). Requires Settings.Manage. */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/audit-logs`;

  list(filter: AuditLogFilter): Observable<PagedResult<AuditLog>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.module) params = params.set('module', filter.module);
    if (filter.action) params = params.set('action', filter.action);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http.get<ApiResponse<PagedResult<AuditLog>>>(this.base, { params }).pipe(map((r) => r.data!));
  }
}

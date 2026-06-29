import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import {
  CreateServiceRequest,
  ServiceRequestDetail,
  ServiceRequestFilter,
  ServiceRequestListItem,
} from './service-request.models';

/** Service requests / AMC jobs (guide §23). */
@Injectable({ providedIn: 'root' })
export class ServiceRequestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/service-requests`;

  list(filter: ServiceRequestFilter): Observable<PagedResult<ServiceRequestListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.priority) params = params.set('priority', filter.priority);
    if (filter.serviceType) params = params.set('serviceType', filter.serviceType);
    if (filter.assignedTechId) params = params.set('assignedTechId', filter.assignedTechId);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    return this.http
      .get<ApiResponse<PagedResult<ServiceRequestListItem>>>(this.base, { params })
      .pipe(map((r) => r.data!));
  }

  get(id: string): Observable<ServiceRequestDetail> {
    return this.http
      .get<ApiResponse<ServiceRequestDetail>>(`${this.base}/${id}`)
      .pipe(map((r) => r.data!));
  }

  create(body: CreateServiceRequest): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  assign(id: string, technicianId: string): Observable<{ id: string }> {
    return this.http
      .put<ApiResponse<{ id: string }>>(`${this.base}/${id}/assign`, { technicianId })
      .pipe(map((r) => r.data!));
  }

  updateStatus(id: string, status: string, resolutionNotes?: string | null): Observable<{ id: string }> {
    return this.http
      .patch<ApiResponse<{ id: string }>>(`${this.base}/${id}/status`, { status, resolutionNotes })
      .pipe(map((r) => r.data!));
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../../core/models/api-response';
import { AddMovement, InventoryMovement, InventorySummary, MovementFilter } from './inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/inventory`;

  list(): Observable<InventorySummary[]> {
    return this.http.get<ApiResponse<InventorySummary[]>>(this.base).pipe(map((r) => r.data ?? []));
  }

  movements(filter: MovementFilter): Observable<PagedResult<InventoryMovement>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.productId) params = params.set('productId', filter.productId);
    if (filter.customerId) params = params.set('customerId', filter.customerId);
    if (filter.movementType) params = params.set('movementType', filter.movementType);
    if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
    if (filter.toDate) params = params.set('toDate', filter.toDate);
    return this.http
      .get<ApiResponse<PagedResult<InventoryMovement>>>(`${this.base}/movements`, { params })
      .pipe(map((r) => r.data!));
  }

  addMovement(body: AddMovement): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.base}/movements`, body).pipe(map((r) => r.data!));
  }

  reconcile(): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/reconcile`, {});
  }
}

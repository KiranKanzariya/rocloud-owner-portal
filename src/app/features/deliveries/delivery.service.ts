import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api-response';
import { DeliveryBoard, DeliveryDetail, DeliveryListItem, UpdateDeliveryStatus } from './delivery.models';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/deliveries`;

  board(date: string): Observable<DeliveryBoard> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<DeliveryBoard>>(`${this.base}/board`, { params }).pipe(map((r) => r.data!));
  }

  /** The current delivery boy's own stops for a day (server-enforced to deliveries assigned to them). */
  myRoute(date: string): Observable<DeliveryListItem[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<DeliveryListItem[]>>(`${this.base}/my-route`, { params }).pipe(map((r) => r.data!));
  }

  /** What was recorded at a completed stop (read-only summary). */
  detail(id: string): Observable<DeliveryDetail> {
    return this.http.get<ApiResponse<DeliveryDetail>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  updateStatus(id: string, dto: UpdateDeliveryStatus): Observable<unknown> {
    return this.http.patch<ApiResponse<unknown>>(`${this.base}/${id}/status`, dto);
  }

  uploadProof(id: string, file: File): Observable<{ id: string; proofImageUrl: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<{ id: string; proofImageUrl: string }>>(`${this.base}/${id}/proof`, form)
      .pipe(map((r) => r.data!));
  }
}

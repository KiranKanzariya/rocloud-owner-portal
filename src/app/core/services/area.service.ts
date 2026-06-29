import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface Area {
  id: string;
  name: string;
  city: string | null;
  pincode: string | null;
  isActive: boolean;
  customerCount: number;
}

export interface AreaUpsert {
  name: string;
  city?: string | null;
  pincode?: string | null;
  isActive?: boolean;
}

/** Delivery areas / zones (guide §24). Reads need Settings.View; writes need Settings.Manage. */
@Injectable({ providedIn: 'root' })
export class AreaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/areas`;

  list(includeInactive = false): Observable<Area[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<ApiResponse<Area[]>>(this.base, { params }).pipe(map((r) => r.data ?? []));
  }

  create(body: AreaUpsert): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  update(id: string, body: AreaUpsert): Observable<{ id: string }> {
    return this.http.put<ApiResponse<{ id: string }>>(`${this.base}/${id}`, body).pipe(map((r) => r.data!));
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Product } from '../models/product';

export interface ProductUpsert {
  name: string;
  bottleSize: string;
  defaultRate: number;
  unit?: string | null;
  isActive: boolean;
}

/** Shared product catalogue access (used by Orders, Inventory, and Settings → Products). */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  /** Active products; returns [] on error (e.g. a role without Inventory.View). */
  list(): Observable<Product[]> {
    return this.http.get<ApiResponse<Product[]>>(this.base).pipe(
      map((r) => r.data ?? []),
      catchError(() => of([])),
    );
  }

  /** Full catalogue incl. inactive (Settings → Products). Requires Inventory.View. */
  listAll(includeInactive = true): Observable<Product[]> {
    const params = new HttpParams().set('includeInactive', includeInactive);
    return this.http.get<ApiResponse<Product[]>>(this.base, { params }).pipe(map((r) => r.data ?? []));
  }

  create(body: ProductUpsert): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  update(id: string, body: ProductUpsert): Observable<{ id: string }> {
    return this.http.put<ApiResponse<{ id: string }>>(`${this.base}/${id}`, body).pipe(map((r) => r.data!));
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { Product } from '../models/product';
import { guarded } from '../http/guarded';
import { PermissionService } from './permission.service';

export interface ProductUpsert {
  name: string;
  bottleSize: string;
  defaultRate: number;
  unit?: string | null;
  hsn?: string | null;
  isActive: boolean;
}

/** Shared product catalogue access (used by Orders, Inventory, and Settings → Products). */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly perms = inject(PermissionService);
  private readonly base = `${environment.apiUrl}/products`;

  /** Active products. Order lines need the catalogue, so Orders.View reads it too. */
  list(): Observable<Product[]> {
    return guarded(
      this.perms,
      ['Inventory.View', 'Orders.View'],
      () => this.http.get<ApiResponse<Product[]>>(this.base).pipe(map((r) => r.data ?? [])),
      [],
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

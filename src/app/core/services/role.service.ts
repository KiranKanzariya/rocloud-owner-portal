import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  isCustom: boolean;
  permissions: string[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
}

/**
 * Roles + permissions (guide §24). NOTE: the RolesController returns RAW payloads (not the
 * {success,data} ApiResponse envelope) for GET/POST — so these methods do NOT unwrap `.data`.
 * All endpoints require Roles.Manage; creating a custom role also requires the Enterprise plan.
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/roles`;

  list(): Observable<Role[]> {
    return this.http.get<Role[]>(this.base);
  }

  permissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.base}/permissions`);
  }

  create(name: string, permissions: string[]): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.base, { name, permissions });
  }

  updatePermissions(id: string, permissions: string[]): Observable<unknown> {
    return this.http.put(`${this.base}/${id}/permissions`, { permissions });
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { guarded } from '../http/guarded';
import { PermissionService } from './permission.service';

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

/** Reads accept Roles.Manage as well, matching the API while pre-Roles.View tokens roll over. */
const READ_ROLES = ['Roles.View', 'Roles.Manage'];

/**
 * Roles + permissions (guide §24). NOTE: the RolesController returns RAW payloads (not the
 * {success,data} ApiResponse envelope) for GET/POST — so these methods do NOT unwrap `.data`.
 * Reads require Roles.View; writes require Roles.Manage, and creating a custom role also
 * requires the Enterprise plan.
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly perms = inject(PermissionService);
  private readonly base = `${environment.apiUrl}/roles`;

  list(): Observable<Role[]> {
    return guarded(this.perms, READ_ROLES, () => this.http.get<Role[]>(this.base), []);
  }

  permissions(): Observable<Permission[]> {
    return guarded(this.perms, READ_ROLES, () => this.http.get<Permission[]>(`${this.base}/permissions`), []);
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

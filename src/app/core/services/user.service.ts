import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, PagedResult } from '../models/api-response';

export interface UserListItem {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  roleId: string | null;
  roleName: string | null;
  authProvider: string;
  isActive: boolean;
  lastLoginAt: string | null;
  areas: { areaId: string; areaName: string }[];
}

export interface UserFilter {
  roleId?: string;
  /** Filter by role NAME (e.g. 'Technician') — role ids are per-tenant, names are not. */
  roleName?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CreateUser {
  name: string;
  email: string;
  mobile?: string | null;
  roleId: string;
  preferredLanguage?: string | null;
  areaIds?: string[] | null;
}

export interface UpdateUser {
  name: string;
  mobile?: string | null;
  roleId: string;
  isActive: boolean;
  areaIds?: string[] | null;
}

export interface InviteUser {
  name: string;
  email: string;
  mobile?: string | null;
  roleId: string;
  areaIds?: string[] | null;
}

/** Team members (guide §24). Phase 23 uses this for the service-request technician dropdown. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  list(filter: UserFilter): Observable<PagedResult<UserListItem>> {
    let params = new HttpParams().set('page', filter.page).set('pageSize', filter.pageSize);
    if (filter.roleId) params = params.set('roleId', filter.roleId);
    if (filter.roleName) params = params.set('roleName', filter.roleName);
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive);
    if (filter.search) params = params.set('search', filter.search);
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDir) params = params.set('sortDir', filter.sortDir);
    return this.http
      .get<ApiResponse<PagedResult<UserListItem>>>(this.base, { params })
      .pipe(map((r) => r.data!));
  }

  /**
   * Active users in the Technician role, filtered by the API. Fetching the first 100 active users and
   * narrowing here returned an EMPTY dropdown for any workspace whose first 100 users happened to
   * contain no technician. Degrades to [] if the caller lacks Users.View.
   */
  technicians(): Observable<UserListItem[]> {
    return this.list({ isActive: true, roleName: 'Technician', page: 1, pageSize: 100 }).pipe(
      map((r) => r.items),
      catchError(() => of([])),
    );
  }

  create(body: CreateUser): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(this.base, body).pipe(map((r) => r.data!));
  }

  update(id: string, body: UpdateUser): Observable<{ id: string }> {
    return this.http.put<ApiResponse<{ id: string }>>(`${this.base}/${id}`, body).pipe(map((r) => r.data!));
  }

  deactivate(id: string): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/deactivate`, {});
  }

  resetPassword(id: string): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/${id}/reset-password`, {});
  }

  invite(body: InviteUser): Observable<{ id: string }> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.base}/invite`, body).pipe(map((r) => r.data!));
  }
}

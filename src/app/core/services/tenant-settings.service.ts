import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';
import { guarded } from '../http/guarded';
import { PermissionService } from './permission.service';

export interface TenantSettings {
  id: string;
  name: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string;
  gstNumber: string | null;
  gstEnabled: boolean;
  gstPercent: number;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultLanguage: string;
  planType: string;
  status: string;
}

export interface UpdateTenantSettings {
  name: string;
  gstNumber?: string | null;
  gstEnabled: boolean;
  gstPercent: number;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  defaultLanguage: string;
}

/** The GST configuration printed on invoices — readable without BusinessProfile.View. */
export interface BillingSettings {
  gstEnabled: boolean;
  gstPercent: number;
  gstNumber: string | null;
}

/** Tenant business profile / settings (guide §24). Requires BusinessProfile.View/Manage. */
@Injectable({ providedIn: 'root' })
export class TenantSettingsService {
  private readonly http = inject(HttpClient);
  private readonly perms = inject(PermissionService);
  private readonly base = `${environment.apiUrl}/settings`;

  get(): Observable<TenantSettings> {
    return this.http.get<ApiResponse<TenantSettings>>(this.base).pipe(map((r) => r.data!));
  }

  /** Just the GST config, for the invoice screens. Invoices.View is enough — see SettingsController. */
  billing(): Observable<BillingSettings | null> {
    return guarded<BillingSettings | null>(
      this.perms,
      ['BusinessProfile.View', 'Invoices.View'],
      () => this.http.get<ApiResponse<BillingSettings>>(`${this.base}/billing`).pipe(map((r) => r.data!)),
      null,
    );
  }

  update(body: UpdateTenantSettings): Observable<unknown> {
    return this.http.put<ApiResponse<unknown>>(this.base, body);
  }
}

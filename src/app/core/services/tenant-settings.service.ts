import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
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
  /** Scan-to-pay UPI id drawn as a QR on customer invoices. */
  upiVpa: string | null;
  upiPayeeName: string | null;
  upiQrEnabled: boolean;
  /** Verification of the CURRENT upiVpa — cleared server-side whenever that id changes. */
  upiVerifiedAt: string | null;
  upiVerifiedName: string | null;
}

/**
 * Result of checking a UPI id against the payments network.
 * `unavailable` means the check could not RUN — deliberately not the same as "this id is wrong".
 */
export interface UpiVerification {
  vpa: string;
  verified: boolean;
  payeeName: string | null;
  unavailable: boolean;
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
  upiVpa?: string | null;
  upiPayeeName?: string | null;
  upiQrEnabled?: boolean;
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

  /**
   * Checks a UPI id against the payments network and returns the account name it is registered to.
   * The server records the result only when the id matches the one already saved.
   */
  verifyUpi(vpa: string): Observable<UpiVerification> {
    return this.http
      .post<ApiResponse<UpiVerification>>(`${this.base}/verify-upi`, { vpa })
      .pipe(map((r) => r.data!));
  }

  /** Cached — the window is a platform constant for the session, so fetch it at most once. */
  private backdateWindow$?: Observable<number>;

  /**
   * How many days back an order/payment/return may be dated. Readable by any authenticated user, so the
   * date pickers can grey out older days to match exactly what the API enforces. Defaults to 0 (today
   * only) if the call fails, so the UI is never more permissive than the server.
   */
  backdateWindowDays(): Observable<number> {
    this.backdateWindow$ ??= this.http
      .get<ApiResponse<{ backdateWindowDays: number }>>(`${this.base}/backdate-window`)
      .pipe(
        map((r) => r.data?.backdateWindowDays ?? 0),
        shareReplay(1),
      );
    return this.backdateWindow$;
  }
}

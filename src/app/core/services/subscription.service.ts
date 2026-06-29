import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface Plan {
  id: string;
  name: string;
  planType: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxCustomers: number;
  maxUsers: number;
  maxDeliveryBoys: number;
  whatsappEnabled: boolean;
  customRolesEnabled: boolean;
  multiBranchEnabled: boolean;
  apiAccessEnabled: boolean;
}

export interface Usage {
  customers: number;
  maxCustomers: number;
  users: number;
  maxUsers: number;
  deliveryBoys: number;
  maxDeliveryBoys: number;
}

export interface Subscription {
  planName: string;
  planType: string;
  monthlyPrice: number;
  status: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  usage: Usage;
  /** Standing discount on the ROCloud subscription, granted by the platform (None | Percentage | Fixed). */
  subscriptionDiscountType: string;
  subscriptionDiscountValue: number;
  /** Monthly price after the discount — what the tenant actually pays. */
  netMonthlyPrice: number;
}

export interface SubscriptionInitiate {
  keyId: string;
  subscriptionId: string | null;
  planType: string;
  amount: number;
  currency: string;
  devMode: boolean;
  /** Net amount is ₹0 (100% discount / free months) — skip Razorpay and complete directly. */
  isFree: boolean;
}

/** The tenant's own ROCloud subscription (guide §25). */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  plans(): Observable<Plan[]> {
    return this.http.get<ApiResponse<Plan[]>>(`${this.api}/plans`).pipe(map((r) => r.data ?? []));
  }

  current(): Observable<Subscription> {
    return this.http.get<ApiResponse<Subscription>>(`${this.api}/subscription`).pipe(map((r) => r.data!));
  }

  initiate(planType: string, billingCycle: 'Monthly' | 'Yearly'): Observable<SubscriptionInitiate> {
    return this.http
      .post<ApiResponse<SubscriptionInitiate>>(`${this.api}/subscription/initiate`, { planType, billingCycle })
      .pipe(map((r) => r.data!));
  }

  completeUpgrade(planType: string, billingCycle: 'Monthly' | 'Yearly'): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/upgrade-complete`, { planType, billingCycle });
  }

  cancel(): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/cancel`, {});
  }
}

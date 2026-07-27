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
  /** A downgrade waiting for period end. Re-selecting the current plan cancels it. */
  scheduledPlanName?: string | null;
  scheduledPlanType?: string | null;
}

export interface SubscriptionInitiate {
  keyId: string;
  orderId: string | null;
  planType: string;
  amount: number;
  currency: string;
  devMode: boolean;
  /** Nothing chargeable (₹0 discount, a downgrade, or a sub-₹1 prorated delta) — skip Razorpay. */
  isFree: boolean;
  /**
   * What this change actually does. Mid-cycle an upgrade is charged only for the days remaining, and
   * a downgrade is not charged at all — it applies at period end. NewTerm buys a full cycle.
   */
  changeKind?: 'NewTerm' | 'Upgrade' | 'Downgrade' | 'Lateral';
  /** Days left in the current cycle that `amount` was prorated over. */
  remainingDays?: number;
  /** Full-cycle price of the target plan, before proration — what they'll pay from the next renewal. */
  fullCycleAmount?: number;
  /** When a scheduled downgrade takes effect (the current period end). */
  effectiveAt?: string | null;
}

/** A ROCloud subscription invoice row for the Billing history (guide §25). */
/** The tenant's own business details, as they appear on the invoice. Detail view only. */
export interface SubscriptionBillTo {
  name: string;
  gstin: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  mobile: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  planType: string;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  discountAmount: number;
  amount: number;
  status: 'Pending' | 'Paid' | 'Void';
  dueDate: string;
  description: string | null;
  paidAt: string | null;
  /** Razorpay references — only present on the detail view, and only once actually paid online. */
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  billTo?: SubscriptionBillTo | null;
  /** card | upi | netbanking | wallet. */
  paymentMethod?: string | null;
  /** UPI id, "Visa •••• 4366", bank, or wallet — whatever identifies the instrument used. */
  paymentInstrument?: string | null;
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

  completeUpgrade(planType: string, billingCycle: 'Monthly' | 'Yearly', orderId?: string | null): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/upgrade-complete`, { planType, billingCycle, orderId });
  }

  invoices(): Observable<SubscriptionInvoice[]> {
    return this.http
      .get<ApiResponse<SubscriptionInvoice[]>>(`${this.api}/subscription/invoices`)
      .pipe(map((r) => r.data ?? []));
  }

  invoice(id: string): Observable<SubscriptionInvoice> {
    return this.http
      .get<ApiResponse<SubscriptionInvoice>>(`${this.api}/subscription/invoices/${id}`)
      .pipe(map((r) => r.data!));
  }

  /** On-demand renewal — creates (or returns the open) Pending invoice to pay, independent of the job. */
  renew(): Observable<SubscriptionInvoice> {
    return this.http
      .post<ApiResponse<SubscriptionInvoice>>(`${this.api}/subscription/renew`, {})
      .pipe(map((r) => r.data!));
  }

  payInvoiceInitiate(id: string): Observable<SubscriptionInitiate> {
    return this.http
      .post<ApiResponse<SubscriptionInitiate>>(`${this.api}/subscription/invoices/${id}/pay-initiate`, {})
      .pipe(map((r) => r.data!));
  }

  payInvoiceComplete(id: string, orderId?: string | null): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/invoices/${id}/pay-complete`, { orderId });
  }

  /** The authenticated PDF-bytes endpoint (used by roc-pdf-preview and the download helper). */
  pdfUrl(id: string): string {
    return `${this.api}/subscription/invoices/${id}/pdf`;
  }

  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(this.pdfUrl(id), { responseType: 'blob' });
  }

  cancel(): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/cancel`, {});
  }

  resume(): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(`${this.api}/subscription/resume`, {});
  }
}

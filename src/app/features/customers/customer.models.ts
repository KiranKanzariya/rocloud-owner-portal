export type CustomerDiscountType = 'None' | 'Percentage' | 'Fixed';

export interface CustomerListItem {
  id: string;
  customerCode: string | null;
  name: string;
  mobile: string | null;
  areaName: string | null;
  preferredBottleSize: string | null;
  deliveryMode: string;
  paymentPreference: string;
  balance: number;
  isActive: boolean;
  discountType: CustomerDiscountType;
  discountValue: number;
  /** Net jars the customer is still holding (Σ Issue − Σ Return). */
  jarsOut: number;
}

export interface CustomerSubscription {
  id: string;
  productName: string;
  quantity: number;
  frequency: string;
  ratePerUnit: number;
  isActive: boolean;
}

export interface CreateCustomerSubscription {
  productId: string;
  quantity: number;
  frequency: string;
  ratePerUnit?: number | null;
  startDate?: string | null;
}

export interface UpdateCustomerSubscription {
  quantity: number;
  frequency: string;
  ratePerUnit?: number | null;
}

export interface CustomerOrderSummary {
  id: string;
  orderDate: string;
  status: string;
}

export interface CustomerPaymentSummary {
  id: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
}

export interface CustomerDetail {
  id: string;
  customerCode: string | null;
  name: string;
  mobile: string | null;
  alternateMobile: string | null;
  email: string | null;
  addressLine: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  areaId: string | null;
  areaName: string | null;
  deliveryMode: string;
  paymentPreference: string;
  preferredBottleSize: string | null;
  preferredLanguage: string | null;
  notes: string | null;
  isActive: boolean;
  balance: number;
  discountType: CustomerDiscountType;
  discountValue: number;
  createdAt: string;
  subscriptions: CustomerSubscription[];
  recentOrders: CustomerOrderSummary[];
  recentPayments: CustomerPaymentSummary[];
}

export interface CustomerStats {
  lifetimeJarsDelivered: number;
  lifetimePayments: number;
  averageMonthlySpend: number;
  jarsDeliveredByProduct: JarsDeliveredByProduct[];
}

/** Lifetime jars delivered (issued) to the customer for one product. */
export interface JarsDeliveredByProduct {
  productName: string;
  bottleSize: string;
  quantity: number;
}

/** Net returnable jars the customer still holds for one product (Σ Issue − Σ Return). */
export interface CustomerJarBalance {
  productId: string;
  productName: string;
  bottleSize: string;
  outstanding: number;
}

/** One product's empties a customer holds at migration cutover. */
export interface OpeningJarInput {
  productId: string;
  quantity: number;
}

/** Payload to seed a customer's opening balance (migration). */
export interface SetOpeningBalanceInput {
  cutoverDate: string; // YYYY-MM-DD
  jars: OpeningJarInput[];
  openingDues: number; // > 0 owes, < 0 advance
  note: string | null;
}

/** Current opening balance state for the migration card. */
export interface OpeningBalance {
  isSet: boolean;
  cutoverDate: string | null;
  dues: number;
  jars: { productName: string; bottleSize: string; quantity: number }[];
}

/** One row's outcome from a customer CSV import. */
export interface ImportRowResult {
  row: number;
  mobile: string | null;
  name: string | null;
  status: 'Created' | 'Skipped' | 'Failed';
  message: string | null;
}

/** Summary of a customer import (or its dry-run preview). */
export interface ImportResult {
  dryRun: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
}

export interface CustomerFilter {
  search?: string;
  deliveryMode?: string;
  paymentPreference?: string;
  isActive?: boolean;
  areaId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: string;
}

/** Body for create (POST) and the editable fields for update (PUT). */
export interface CustomerUpsert {
  areaId?: string | null;
  name: string;
  mobile: string;
  alternateMobile?: string | null;
  email?: string | null;
  addressLine?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryMode: string;
  paymentPreference: string;
  preferredBottleSize?: string | null;
  preferredLanguage?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

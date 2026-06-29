export interface DailyCollection {
  date: string;
  totalCollected: number;
  cash: number;
  digital: number;
  transactionCount: number;
  topPaymentMethods: string | null;
}

export interface DeliveryEfficiency {
  deliveryBoyId: string | null;
  deliveryBoyName: string;
  assigned: number;
  delivered: number;
  pending: number;
  failed: number;
  collectedAmount: number;
  efficiencyPct: number;
  avgDeliveryMinutes: number | null;
}

export interface OutstandingDuesReport {
  customerId: string;
  customerName: string;
  mobile: string | null;
  totalOutstanding: number;
  bucket0To7: number;
  bucket7To30: number;
  bucket30To60: number;
  bucket60Plus: number;
}

export interface AreaPerformance {
  areaId: string | null;
  areaName: string;
  customerCount: number;
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  mobile: string | null;
  revenue: number;
  orderCount: number;
  outstanding: number;
}

export interface BottleTrackingReport {
  bottleSize: string;
  totalStock: number;
  issued: number;
  returned: number;
  damaged: number;
  missing: number;
  damageRatePct: number;
}

export type ReportTab =
  | 'collection'
  | 'delivery-efficiency'
  | 'outstanding-dues'
  | 'area-performance'
  | 'top-customers'
  | 'bottle-tracking';

export interface ReportTabDef {
  key: ReportTab;
  label: string;
  icon: string;
}

export const REPORT_TABS: ReportTabDef[] = [
  { key: 'collection', label: 'Collection', icon: 'cash' },
  { key: 'delivery-efficiency', label: 'Delivery efficiency', icon: 'truck-delivery' },
  { key: 'outstanding-dues', label: 'Outstanding dues', icon: 'alert-triangle' },
  { key: 'area-performance', label: 'Area performance', icon: 'map-pin' },
  { key: 'top-customers', label: 'Top customers', icon: 'star' },
  { key: 'bottle-tracking', label: 'Bottle tracking', icon: 'bottle' },
];

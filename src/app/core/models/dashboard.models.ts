export interface DeliverySummaryRow {
  deliveryBoyId: string | null;
  deliveryBoyName: string;
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  failed: number;
  completedPercentage: number;
}

/** Per-product jar total for the day's deliveries (GET /deliveries/product-totals). */
export interface DeliveryProductTotal {
  productName: string;
  bottleSize: string;
  quantity: number;
}

/** Today's collection totals, summed by the API (GET /payments/summary). */
export interface PaymentSummary {
  collected: number;
  count: number;
  cash: number;
  upi: number;
  other: number;
}

export interface OutstandingDue {
  customerId: string;
  customerName: string;
  outstandingAmount: number;
  daysOverdue: number;
}

export interface OrderListItem {
  id: string;
  orderDate: string;
  customerName: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  deliveryStatus: string | null;
}

export interface InventorySummary {
  productId: string;
  productName: string;
  bottleSize: string;
  issuedStock: number;
}

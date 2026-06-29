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

export interface PaymentListItem {
  id: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paidAt: string;
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

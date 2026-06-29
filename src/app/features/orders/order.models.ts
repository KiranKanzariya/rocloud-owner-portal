export interface OrderListItem {
  id: string;
  orderDate: string;
  customerName: string;
  customerMobile: string | null;
  areaName: string | null;
  deliveryBoyName: string | null;
  orderType: string;
  deliveryMode: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  deliveryStatus: string | null;
  amountPaid: number;
  paymentStatus: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
}

export interface OrderDelivery {
  id: string;
  status: string;
  scheduledDate: string;
  deliveredAt: string | null;
  jarsDelivered: number | null;
  jarsReturned: number | null;
  collectedAmount: number | null;
  paymentMethod: string | null;
  proofImageUrl: string | null;
}

export interface OrderDetail {
  id: string;
  orderDate: string;
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  areaId: string | null;
  areaName: string | null;
  deliveryBoyId: string | null;
  deliveryBoyName: string | null;
  orderType: string;
  deliveryMode: string;
  status: string;
  notes: string | null;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  delivery: OrderDelivery | null;
}

export interface OrderFilter {
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  deliveryBoyId?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: string;
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
  unitRate?: number | null;
}

export interface CreateOrder {
  customerId: string;
  orderDate?: string | null;
  orderType?: string | null;
  notes?: string | null;
  items: CreateOrderItem[];
  /** For a "Both" customer: 'HomeDelivery' or 'PlantPickup'. Omitted for single-mode customers. */
  deliveryMode?: string | null;
}

export interface BulkCreateResult {
  ordersCreated: number;
  subscriptionsConsidered: number;
  skipped: number;
}

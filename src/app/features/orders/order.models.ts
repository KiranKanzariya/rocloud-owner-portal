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
  /** Ordered lines (product + qty). */
  lines: OrderLineSummary[];
  /** Per-product jars out/back once delivered; empty otherwise. */
  deliveredLines: OrderDeliveredLine[];
  /** Off-order empties returned on the delivery (product not on the order). */
  otherReturns: OrderDeliveredOtherReturn[];
}

export interface OrderLineSummary {
  productName: string;
  quantity: number;
}

export interface OrderDeliveredLine {
  productName: string;
  jarsDelivered: number;
  jarsReturned: number;
}

export interface OrderDeliveredOtherReturn {
  productName: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
}

export interface OrderDeliveryItem {
  productName: string;
  bottleSize: string;
  jarsDelivered: number;
  jarsReturned: number;
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
  /** Per-product out/back; empty for older single-count deliveries. */
  items: OrderDeliveryItem[];
  /** Off-order empties returned (product not on the order). */
  otherReturns: OrderDeliveryOtherReturn[];
}

export interface OrderDeliveryOtherReturn {
  productName: string;
  bottleSize: string;
  quantity: number;
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

/** A product + quantity line shown inside a booking. */
export interface OrderLineSummary {
  productName: string;
  quantity: number;
}

/** A future-dated booking for the Upcoming tab, with its line items. */
export interface UpcomingOrder {
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
  totalQuantity: number;
  totalAmount: number;
  items: OrderLineSummary[];
  createdAt: string;
}

/** One product's total demand on a production-plan day. */
export interface ProductionPlanLine {
  productId: string;
  productName: string;
  totalQuantity: number;
  orderCount: number;
}

/** A single customer booking behind a production-plan day (drill-down). */
export interface ProductionPlanBooking {
  orderId: string;
  customerName: string;
  areaName: string | null;
  orderType: string;
  totalQuantity: number;
  items: OrderLineSummary[];
}

/** Everything the plant must prepare for one future date. */
export interface ProductionPlanDay {
  date: string;
  totalUnits: number;
  orderCount: number;
  lines: ProductionPlanLine[];
  bookings: ProductionPlanBooking[];
}

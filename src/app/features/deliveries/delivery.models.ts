export interface DeliveryListItem {
  id: string;
  orderId: string;
  status: string;
  scheduledDate: string;
  deliveredAt: string | null;
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  addressLine: string | null;
  areaName: string | null;
  deliveryBoyId: string | null;
  deliveryBoyName: string | null;
  jarsDelivered: number | null;
  jarsReturned: number | null;
  collectedAmount: number | null;
  paymentMethod: string | null;
  proofImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  items: DeliveryLine[];
}

/** An ordered line on a delivery card: product name + ordered jar quantity. */
export interface DeliveryLine {
  productName: string;
  quantity: number;
}

/** A product's total jars still to be delivered across the board's outstanding stops. */
export interface BoardItemTotal {
  productName: string;
  bottleSize: string;
  quantity: number;
}

export interface DeliveryBoard {
  pending: DeliveryListItem[];
  inTransit: DeliveryListItem[];
  delivered: DeliveryListItem[];
  failed: DeliveryListItem[];
  toDeliver: BoardItemTotal[];
}

export interface DeliveryItemDetail {
  productName: string;
  bottleSize: string;
  jarsDelivered: number;
  jarsReturned: number;
}

export interface DeliveryOtherReturn {
  productName: string;
  bottleSize: string;
  quantity: number;
}

/** What was actually recorded at a completed stop (read-only summary). */
export interface DeliveryDetail {
  id: string;
  orderId: string;
  customerName: string;
  status: string;
  deliveredAt: string | null;
  collectedAmount: number | null;
  paymentMethod: string | null;
  proofImageUrl: string | null;
  notes: string | null;
  jarsDelivered: number | null;
  jarsReturned: number | null;
  items: DeliveryItemDetail[];
  otherReturns: DeliveryOtherReturn[];
}

export interface DeliveryItemInput {
  orderItemId: string;
  jarsDelivered: number;
  jarsReturned: number;
}

/** Empties returned for a product not on the order (e.g. a 20L during an 18L delivery). */
export interface OtherReturnInput {
  productId: string;
  quantity: number;
}

export interface UpdateDeliveryStatus {
  status: 'InTransit' | 'Delivered' | 'Failed';
  jarsDelivered?: number | null;
  jarsReturned?: number | null;
  collectedAmount?: number | null;
  paymentMethod?: string | null;
  proofImageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  items?: DeliveryItemInput[] | null;
  otherReturns?: OtherReturnInput[] | null;
}

export interface DeliveryListItem {
  id: string;
  orderId: string;
  status: string;
  /** 'HomeDelivery' | 'PlantPickup' — pickups skip InTransit and are marked delivered directly. */
  deliveryMode: string | null;
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
  /** Per-product out/back for a completed stop; empty until delivered. */
  deliveredLines: DeliveredLine[];
  /** Off-order empties returned on this stop (product not on the order). */
  otherReturns: DeliveredOtherReturn[];
}

/** An off-order empty returned on a delivery card: product name + how many. */
export interface DeliveredOtherReturn {
  productName: string;
  quantity: number;
}

/** An ordered line on a delivery card: product name + ordered jar quantity. */
export interface DeliveryLine {
  productName: string;
  quantity: number;
}

/** A completed line on a delivery card: product name + jars out / back. */
export interface DeliveredLine {
  productName: string;
  jarsDelivered: number;
  jarsReturned: number;
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
  /** Plant-pickup stops, shown separately from the route columns. */
  pickups: DeliveryListItem[];
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

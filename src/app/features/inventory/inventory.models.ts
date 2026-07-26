export interface InventorySummary {
  productId: string;
  productName: string;
  bottleSize: string;
  totalStock: number;
  issuedStock: number;
  returnedStock: number;
  damagedStock: number;
  availableStock: number;
  lastUpdated: string | null;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantity: number;
  orderId: string | null;
  customerId: string | null;
  customerName: string | null;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MovementFilter {
  productId?: string;
  customerId?: string;
  movementType?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

export interface AddMovement {
  productId: string;
  movementType: string;
  quantity: number;
  orderId?: string | null;
  customerId?: string | null;
  notes?: string | null;
}

/** Empty jars a customer handed back with no delivery to attach them to. May be backdated. */
export interface RecordCustomerReturn {
  customerId: string;
  productId: string;
  quantity: number;
  /** The day the jars came back. Omit for today; may be backdated within the platform window. */
  returnedOn?: string | null;
  notes?: string | null;
}

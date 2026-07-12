export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  discount: number;
  createdAt: string;
}

export interface InvoiceLineItem {
  productName: string;
  bottleSize: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  invoiceDate: string;
  dueDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  subTotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  /** Part of paidAmount that came from payments recorded against the customer, not this invoice. */
  allocatedFromPool: number;
  status: string;
  gstNumber: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceFilter {
  status?: string;
  customerId?: string;
  periodFrom?: string;
  periodTo?: string;
  page: number;
  pageSize: number;
}

export interface GenerateInvoice {
  customerId: string;
  periodFrom: string;
  periodTo: string;
  gstRate?: number | null;
  discount?: number | null;
  dueInDays?: number | null;
  notes?: string | null;
}

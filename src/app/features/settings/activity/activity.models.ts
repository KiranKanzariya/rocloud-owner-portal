export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  module: string;
  action: string;
  entityName: string | null;
  entityId: string | null;
  ipAddress: string | null;
  statusCode: number | null;
  createdAt: string;
  newValues: string | null;
  userAgent: string | null;
}

export interface AuditLogFilter {
  userId?: string;
  module?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}

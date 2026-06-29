export const SERVICE_TYPES = [
  'FilterChange',
  'MembraneReplace',
  'Complaint',
  'RoutineAMC',
  'Installation',
  'Other',
] as const;

export const SERVICE_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export const SERVICE_STATUSES = ['Open', 'InProgress', 'Resolved', 'Cancelled'] as const;

export interface ServiceRequestListItem {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string | null;
  title: string;
  serviceType: string;
  status: string;
  priority: string;
  assignedTechId: string | null;
  assignedTechName: string | null;
  scheduledDate: string | null;
  createdAt: string;
}

export interface ServiceRequestDetail extends ServiceRequestListItem {
  description: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

export interface ServiceRequestFilter {
  status?: string;
  priority?: string;
  serviceType?: string;
  assignedTechId?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}

export interface CreateServiceRequest {
  customerId: string;
  title: string;
  description?: string | null;
  serviceType: string;
  priority?: string | null;
  scheduledDate?: string | null;
}

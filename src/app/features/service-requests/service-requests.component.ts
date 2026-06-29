import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ServiceRequestService } from './service-request.service';
import {
  ServiceRequestFilter,
  ServiceRequestListItem,
  SERVICE_PRIORITIES,
  SERVICE_STATUSES,
} from './service-request.models';
import { DataTableComponent, ColumnDef } from '../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../shared/components/data-table/column-cell.directive';
import { CanDirective } from '../../shared/directives/can.directive';
import { ServiceRequestFormModalComponent } from './service-request-form-modal/service-request-form-modal.component';
import { ServiceDetailModalComponent } from './service-detail-modal/service-detail-modal.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [
    DatePipe,
    DataTableComponent,
    ColumnCellDirective,
    CanDirective,
    ServiceRequestFormModalComponent,
    ServiceDetailModalComponent,
    TranslatePipe,
  ],
  templateUrl: './service-requests.component.html',
})
export class ServiceRequestsComponent {
  private readonly service = inject(ServiceRequestService);

  protected readonly statuses = SERVICE_STATUSES;
  protected readonly priorities = SERVICE_PRIORITIES;

  protected readonly rows = signal<ServiceRequestListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly detailId = signal<string | null>(null);

  protected readonly columns: ColumnDef[] = [
    { key: 'ticketNumber', header: 'Ticket' },
    { key: 'customerName', header: 'Customer' },
    { key: 'serviceType', header: 'Type' },
    { key: 'assignedTechName', header: 'Technician' },
    { key: 'priority', header: 'Priority' },
    { key: 'scheduledDate', header: 'Scheduled' },
    { key: 'status', header: 'Status' },
  ];

  protected filter: ServiceRequestFilter = { page: 1, pageSize: 25 };

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.filter).subscribe({
      next: (res) => {
        this.rows.set(res.items);
        this.totalCount.set(res.totalCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(status: string): void {
    this.filter = { ...this.filter, status: status || undefined, page: 1 };
    this.load();
  }

  setPriority(priority: string): void {
    this.filter = { ...this.filter, priority: priority || undefined, page: 1 };
    this.load();
  }

  onPage(page: number): void {
    this.filter = { ...this.filter, page };
    this.load();
  }

  open(r: ServiceRequestListItem): void {
    this.detailId.set(r.id);
  }

  onCreated(): void {
    this.createOpen.set(false);
    this.load();
  }

  onUpdated(): void {
    this.load();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Resolved': return 'status-delivered';
      case 'InProgress': return 'status-in-transit';
      case 'Open': return 'status-pending';
      default: return 'status-active-info';
    }
  }

  priorityClass(priority: string): string {
    switch (priority) {
      case 'Urgent':
      case 'High': return 'status-overdue';
      case 'Medium': return 'status-pending';
      default: return 'status-active-info';
    }
  }
}

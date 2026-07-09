import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRequestService } from '../service-request.service';
import { ServiceRequestDetail } from '../service-request.models';
import { UserService, UserListItem } from '../../../core/services/user.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MobilePipe } from '../../../shared/pipes/mobile.pipe';

@Component({
  selector: 'app-service-detail-modal',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslatePipe, MobilePipe],
  templateUrl: './service-detail-modal.component.html',
})
export class ServiceDetailModalComponent {
  private readonly service = inject(ServiceRequestService);
  private readonly users = inject(UserService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  /** The id of the request to show; null closes the modal. */
  readonly requestId = input<string | null>(null);
  readonly updated = output<void>();
  readonly closed = output<void>();

  protected readonly request = signal<ServiceRequestDetail | null>(null);
  protected readonly technicians = signal<UserListItem[]>([]);
  protected readonly busy = signal(false);

  protected readonly canManage = this.perm.can('AMC.Manage');
  protected readonly canUpdate = this.perm.can('AMC.Update');

  protected selectedTech = '';
  protected resolutionNotes = '';

  constructor() {
    effect(() => {
      const id = this.requestId();
      if (id) {
        this.load(id);
        if (this.canManage) this.users.technicians().subscribe((t) => this.technicians.set(t));
      } else {
        this.request.set(null);
      }
    });
  }

  private load(id: string): void {
    this.service.get(id).subscribe((r) => {
      this.request.set(r);
      this.selectedTech = r.assignedTechId ?? '';
      this.resolutionNotes = r.resolutionNotes ?? '';
    });
  }

  assign(): void {
    const r = this.request();
    if (!r || !this.selectedTech || this.busy()) return;
    this.busy.set(true);
    this.service.assign(r.id, this.selectedTech).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.t.instant('Technician assigned.'));
        this.load(r.id);
        this.updated.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err, this.t.instant('Could not assign the technician.'));
      },
    });
  }

  setStatus(status: string): void {
    const r = this.request();
    if (!r || this.busy()) return;
    if (status === 'Resolved' && !this.resolutionNotes.trim()) {
      this.toast.error(this.t.instant('Add resolution notes before resolving.'));
      return;
    }
    this.busy.set(true);
    this.service.updateStatus(r.id, status, status === 'Resolved' ? this.resolutionNotes : null).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.t.instant('Marked {{status}}.', { status: this.t.instant(status) }));
        this.load(r.id);
        this.updated.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.apiError(err, this.t.instant('Could not update the status.'));
      },
    });
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

  close(): void {
    this.closed.emit();
  }
}

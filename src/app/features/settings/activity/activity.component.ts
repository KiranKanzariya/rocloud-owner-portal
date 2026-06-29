import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService } from './activity.service';
import { AuditLog } from './activity.models';
import { TranslatePipe } from '@ngx-translate/core';
import { DataTableComponent, ColumnDef } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';

/**
 * Activity log (Settings → Activity): a read-only viewer over the append-only audit trail — who did
 * what, when, and whether it succeeded. Backed by GET /api/audit-logs (Settings.Manage).
 */
@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslatePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './activity.component.html',
})
export class ActivityComponent {
  private readonly api = inject(ActivityService);

  protected readonly rows = signal<AuditLog[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly pageSize = 25;
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  // Server-paginated (filters drive the query); columns are not client-sortable.
  protected readonly columns: ColumnDef[] = [
    { key: 'createdAt', header: 'When' },
    { key: 'userName', header: 'Who' },
    { key: 'action', header: 'Action' },
    { key: 'module', header: 'Area' },
    { key: 'statusCode', header: 'Status' },
    { key: 'ipAddress', header: 'IP' },
  ];

  /** The row opened in the detail panel, or null when closed. */
  protected readonly selected = signal<AuditLog | null>(null);

  // Filters
  protected module = '';
  protected fromDate = '';
  protected toDate = '';

  /** Modules that appear in the trail (URL first segment) — drives the filter dropdown. */
  protected readonly modules = [
    'customers', 'orders', 'invoices', 'payments', 'deliveries', 'inventory',
    'service-requests', 'users', 'roles', 'products', 'areas', 'auth',
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .list({
        module: this.module || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.items);
          this.total.set(res.totalCount);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  /** Best-effort human verb for the action; the raw method/module is kept in a tooltip. */
  verbLabel(r: AuditLog): string {
    if (r.module === 'auth') return 'Signed in';
    if (r.module === 'payments' && r.action === 'POST') return 'Recorded';
    switch (r.action) {
      case 'POST': return r.entityId ? 'Actioned' : 'Created';
      case 'PUT':
      case 'PATCH': return 'Updated';
      case 'DELETE': return 'Deleted';
      case 'GET': return 'Viewed';
      default: return r.action;
    }
  }

  rawLabel(r: AuditLog): string {
    return `${r.action} /${r.module}${r.entityId ? ' ' + r.entityId : ''}`;
  }

  /** Pretty-prints the captured request payload (sensitive fields are already redacted server-side). */
  prettyPayload(r: AuditLog | null): string {
    if (!r?.newValues) return '';
    try {
      return JSON.stringify(JSON.parse(r.newValues), null, 2);
    } catch {
      return r.newValues;
    }
  }

  statusClass(code: number | null): string {
    if (code == null) return 'text-micro text-ink-mid';
    return code >= 200 && code < 400 ? 'status-active' : 'status-overdue';
  }

  statusLabel(code: number | null): string {
    if (code == null) return '—';
    if (code >= 200 && code < 400) return 'Success';
    if (code === 401) return 'Unauthorized';
    if (code === 403) return 'Forbidden';
    if (code === 404) return 'Not found';
    return 'Failed';
  }
}

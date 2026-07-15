import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NotificationTemplateService,
  NotificationTemplate,
} from '../../../core/services/notification-template.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DataTableComponent, ColumnDef, SortState } from '../../../shared/components/data-table/data-table.component';
import { ColumnCellDirective } from '../../../shared/components/data-table/column-cell.directive';
import { sortAndPage } from '../../../shared/components/data-table/client-table';
import { isFeatureEnabled } from '../../../core/feature-flags';

/** Customer-facing templates the tenant can customise, with their placeholder tokens. */
const TEMPLATE_CODES = [
  { code: 'invoice_sent', label: 'Invoice sent', tokens: ['CustomerName', 'InvoiceNumber', 'DownloadUrl'] },
  { code: 'payment_reminder', label: 'Payment reminder', tokens: ['CustomerName', 'Amount', 'DaysOverdue'] },
  { code: 'amc_reminder', label: 'Service / AMC reminder', tokens: ['CustomerName', 'TicketNumber', 'ScheduledDate'] },
  { code: 'advance_order_reminder', label: 'Advance order reminder', tokens: ['CustomerName', 'ScheduledDate', 'Quantity'] },
];
const LANGUAGES: Record<string, string> = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' };

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslatePipe, DataTableComponent, ColumnCellDirective],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent {
  private readonly service = inject(NotificationTemplateService);
  private readonly perm = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly t = inject(TranslateService);

  protected readonly templateCodes = TEMPLATE_CODES;
  protected readonly templates = signal<NotificationTemplate[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly canManage = this.perm.can('Notifications.Manage');

  // WhatsApp is future scope (v1 is email-only), so hide WhatsApp templates for everyone.
  // Each customer-facing template still has an Email variant, which remains visible.
  // The AMC/Service reminder is hidden too while that module is deferred (feature flag `amcService`).
  protected readonly visible = computed(() =>
    this.templates().filter(
      (x) => x.channel !== 'WhatsApp' && (isFeatureEnabled('amcService') || x.templateCode !== 'amc_reminder'),
    ),
  );

  // Client-side sort + paginate for the shared data table.
  protected readonly columns: ColumnDef[] = [
    { key: 'templateCode', header: 'Template', sortable: true },
    { key: 'channel', header: 'Channel', sortable: true },
    { key: 'languageCode', header: 'Language', sortable: true },
    { key: 'status', header: 'Status' },
    { key: 'body', header: 'Preview' },
    { key: 'updatedAt', header: 'Updated', sortable: true },
    { key: 'actions', header: '', align: 'right', width: '90px' },
  ];
  protected readonly sortBy = signal('templateCode');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = 50;
  protected readonly rows = computed(() => sortAndPage(this.visible(), this.sortBy(), this.sortDir(), this.page(), this.pageSize));
  protected readonly totalCount = computed(() => this.visible().length);

  onSort(s: SortState): void { this.sortBy.set(s.sortBy); this.sortDir.set(s.sortDir as 'asc' | 'desc'); this.page.set(1); }
  onPage(p: number): void { this.page.set(p); }

  // Editor state — a specific (code, language, channel) template.
  protected readonly editing = signal<NotificationTemplate | null>(null);
  protected subject = '';
  protected body = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (t) => { this.templates.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  label(code: string): string {
    return this.templateCodes.find((t) => t.code === code)?.label ?? code;
  }

  languageLabel(code: string): string {
    return LANGUAGES[code] ?? code;
  }

  currentTokens(): string[] {
    return this.templateCodes.find((t) => t.code === this.editing()?.templateCode)?.tokens ?? [];
  }

  insertToken(token: string): void {
    this.body = `${this.body}{{${token}}}`;
  }

  openEdit(t: NotificationTemplate): void {
    this.editing.set(t);
    this.subject = t.subject ?? '';
    this.body = t.body;
    this.modalOpen.set(true);
  }

  /** Remove this tenant's override so the template reverts to the shared system default. */
  resetToDefault(t: NotificationTemplate): void {
    if (!t.isCustom || this.saving()) return;
    if (!confirm(this.t.instant('Reset this template to the system default? Your customised version will be removed.'))) return;
    this.saving.set(true);
    this.service.remove(t.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(this.t.instant('Template reset to default.'));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.apiError(err, this.t.instant('Could not reset the template.'));
      },
    });
  }

  save(): void {
    const row = this.editing();
    if (!row) return;
    if (!this.body.trim() || this.saving()) {
      this.toast.error(this.t.instant('Template body is required.'));
      return;
    }
    this.saving.set(true);
    this.service
      .upsert({
        templateCode: row.templateCode,
        languageCode: row.languageCode,
        channel: row.channel,
        subject: row.channel === 'Email' ? this.subject || null : null,
        body: this.body,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.toast.success(this.t.instant('Template saved.'));
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.apiError(err, this.t.instant('Could not save the template.'));
        },
      });
  }
}

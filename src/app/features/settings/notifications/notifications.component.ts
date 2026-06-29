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

const TEMPLATE_CODES = [
  { code: 'welcome', label: 'Welcome' },
  { code: 'invoice_sent', label: 'Invoice sent' },
  { code: 'payment_reminder', label: 'Payment reminder' },
  { code: 'delivery_confirmation', label: 'Delivery confirmation' },
];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'gu', label: 'ગુજરાતી' },
];
const CHANNELS = ['Email', 'SMS', 'WhatsApp'];

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
  protected readonly languages = LANGUAGES;
  protected readonly templates = signal<NotificationTemplate[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly canManage = this.perm.can('Settings.Manage');
  /** WhatsApp templates are a Pro+ feature (guide §24). */
  protected readonly isPro = this.perm.hasPlan('Pro');

  protected readonly channels = computed(() => (this.isPro ? CHANNELS : CHANNELS.filter((c) => c !== 'WhatsApp')));

  // Client-side sort + paginate for the shared data table.
  protected readonly columns: ColumnDef[] = [
    { key: 'templateCode', header: 'Template', sortable: true },
    { key: 'channel', header: 'Channel', sortable: true },
    { key: 'languageCode', header: 'Language', sortable: true },
    { key: 'body', header: 'Preview' },
    { key: 'updatedAt', header: 'Updated', sortable: true },
    { key: 'actions', header: '', align: 'right', width: '70px' },
  ];
  protected readonly sortBy = signal('templateCode');
  protected readonly sortDir = signal<'asc' | 'desc'>('asc');
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly rows = computed(() => sortAndPage(this.templates(), this.sortBy(), this.sortDir(), this.page(), this.pageSize));
  protected readonly totalCount = computed(() => this.templates().length);

  onSort(s: SortState): void { this.sortBy.set(s.sortBy); this.sortDir.set(s.sortDir as 'asc' | 'desc'); this.page.set(1); }
  onPage(p: number): void { this.page.set(p); }

  // Editor form (plain ngModel — small form)
  protected channel = 'Email';
  protected templateCode = 'welcome';
  protected languageCode = 'en';
  protected subject = '';
  protected body = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (t) => {
        this.templates.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.channel = 'Email';
    this.templateCode = 'welcome';
    this.languageCode = 'en';
    this.subject = '';
    this.body = '';
    this.modalOpen.set(true);
  }

  openEdit(t: NotificationTemplate): void {
    this.channel = t.channel;
    this.templateCode = t.templateCode;
    this.languageCode = t.languageCode;
    this.subject = t.subject ?? '';
    this.body = t.body;
    this.modalOpen.set(true);
  }

  label(code: string): string {
    return this.templateCodes.find((t) => t.code === code)?.label ?? code;
  }

  save(): void {
    if (!this.body.trim() || this.saving()) {
      this.toast.error(this.t.instant('Template body is required.'));
      return;
    }
    this.saving.set(true);
    this.service
      .upsert({
        templateCode: this.templateCode,
        languageCode: this.languageCode,
        channel: this.channel,
        subject: this.channel === 'Email' ? this.subject || null : null,
        body: this.body,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.toast.success(this.t.instant('Template saved.'));
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.t.instant('Could not save the template.'));
        },
      });
  }
}

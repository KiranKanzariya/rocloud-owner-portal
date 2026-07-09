import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CustomerService } from '../customer.service';
import { ImportResult } from '../customer.models';
import { ToastService } from '../../../core/services/toast.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { istToday } from '../../../shared/util/ist-date.util';

/** Canonical template header — keep in sync with docs/migration/customer-import-template.md. */
const TEMPLATE_HEADER =
  'name,mobile,alternate_mobile,email,address_line,landmark,area,delivery_mode,payment_preference,' +
  'preferred_bottle_size,preferred_language,customer_code,notes,is_active,opening_jars_20l,opening_jars_18l,' +
  'opening_dues,sub_product_size,sub_qty,sub_frequency,sub_rate,sub_start_date';
const TEMPLATE_SAMPLE =
  'Ramesh Patel,9876543210,,,12 Kothariya Rd,Near temple,Kothariya,HomeDelivery,Monthly,20L,gu,,Evening only,TRUE,3,0,450,20L,2,Daily,40,2026-07-01';

@Component({
  selector: 'app-customer-import',
  standalone: true,
  imports: [DecimalPipe, FormsModule, TranslatePipe, RouterLink],
  templateUrl: './customer-import.component.html',
})
export class CustomerImportComponent {
  protected readonly router = inject(Router);
  private readonly service = inject(CustomerService);
  private readonly toast = inject(ToastService);
  private readonly subscription = inject(SubscriptionService);
  private readonly t = inject(TranslateService);

  protected readonly showGuide = signal(false);
  /** Column reference shown in the collapsible guide. `values` are literal tokens (not translated). */
  protected readonly guide: { col: string; req: boolean; values: string; meaning: string }[] = [
    { col: 'name', req: true, values: 'text', meaning: 'Customer or shop name — duplicate names are skipped' },
    { col: 'mobile', req: false, values: '10 digits', meaning: 'Optional — leave blank if unknown; when present it is the dedupe key (duplicate mobiles are skipped)' },
    { col: 'alternate_mobile', req: false, values: '10 digits', meaning: 'Secondary contact number' },
    { col: 'email', req: false, values: 'email', meaning: 'Email address' },
    { col: 'address_line', req: false, values: 'text', meaning: 'Full delivery address' },
    { col: 'landmark', req: false, values: 'text', meaning: 'Nearby landmark' },
    { col: 'area', req: false, values: 'existing area name', meaning: 'Route/zone — must already exist, else left unassigned' },
    { col: 'delivery_mode', req: false, values: 'HomeDelivery, PlantPickup, Both', meaning: 'How they get water (default HomeDelivery)' },
    { col: 'payment_preference', req: false, values: 'PerBottle, Weekly, Monthly, Combined', meaning: 'How they pay (default PerBottle)' },
    { col: 'preferred_bottle_size', req: false, values: '18L, 20L', meaning: 'Default bottle size (default 20L)' },
    { col: 'preferred_language', req: false, values: 'en, hi, gu', meaning: 'Language for invoices and WhatsApp' },
    { col: 'customer_code', req: false, values: '—', meaning: 'Leave blank — generated automatically' },
    { col: 'notes', req: false, values: 'text', meaning: 'Any extra note from your book' },
    { col: 'is_active', req: false, values: 'TRUE, FALSE', meaning: 'Whether the customer is active' },
    { col: 'opening_jars_20l', req: false, values: 'whole number', meaning: 'Empty 20L jars they hold now' },
    { col: 'opening_jars_18l', req: false, values: 'whole number', meaning: 'Empty 18L jars they hold now' },
    { col: 'opening_dues', req: false, values: 'number (no ₹)', meaning: 'Money owed now — negative means advance paid' },
    { col: 'sub_product_size', req: false, values: '18L, 20L', meaning: 'Subscription product size' },
    { col: 'sub_qty', req: false, values: 'whole number', meaning: 'Quantity per delivery' },
    { col: 'sub_frequency', req: false, values: 'Daily, AlternateDay, Weekly, Monthly, Custom', meaning: 'How often it repeats' },
    { col: 'sub_rate', req: false, values: 'number', meaning: 'Rate per unit (₹)' },
    { col: 'sub_start_date', req: false, values: 'YYYY-MM-DD', meaning: 'When the subscription starts' },
  ];

  protected readonly file = signal<File | null>(null);
  protected readonly cutover = signal(istToday());
  protected readonly previewing = signal(false);
  protected readonly importing = signal(false);
  protected readonly preview = signal<ImportResult | null>(null);
  protected readonly committed = signal<ImportResult | null>(null);
  /** Current plan name + customer cap, for the plan-limit banner (null until loaded / on error). */
  protected readonly plan = signal<{ name: string; maxCustomers: number } | null>(null);

  /** The result currently on screen — the commit result once done, otherwise the dry-run preview. */
  protected readonly result = computed(() => this.committed() ?? this.preview());
  protected readonly problemRows = computed(() => (this.result()?.rows ?? []).filter((r) => r.status !== 'Created'));

  /**
   * Rows skipped specifically because the plan's customer cap was hit (not duplicates or bad data).
   * Matched on the API's English message, which is the raw `row.message` (not a translated string).
   */
  protected readonly planLimitSkipped = computed(
    () =>
      (this.result()?.rows ?? []).filter(
        (r) => r.status === 'Skipped' && (r.message ?? '').toLowerCase().includes('customer limit is reached'),
      ).length,
  );

  constructor() {
    // Loaded so the plan-limit banner can name the current plan and its customer cap.
    this.subscription.current().subscribe({
      next: (s) => this.plan.set({ name: s.planName, maxCustomers: s.usage.maxCustomers }),
      error: () => {}, // banner falls back to a generic message when this is unavailable
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.preview.set(null); // a new file invalidates the previous preview/commit
    this.committed.set(null);
  }

  downloadTemplate(): void {
    this.download('customers-template.csv', `${TEMPLATE_HEADER}\n${TEMPLATE_SAMPLE}\n`);
  }

  runPreview(): void {
    const f = this.file();
    if (!f || this.previewing()) return;
    this.previewing.set(true);
    this.committed.set(null);
    this.service.importCustomers(f, true, this.cutover()).subscribe({
      next: (r) => {
        this.previewing.set(false);
        this.preview.set(r);
      },
      error: () => {
        this.previewing.set(false);
        this.toast.error(this.t.instant('Could not read the file. Check it is a valid CSV.'));
      },
    });
  }

  runImport(): void {
    const f = this.file();
    if (!f || this.importing()) return;
    this.importing.set(true);
    this.service.importCustomers(f, false, this.cutover()).subscribe({
      next: (r) => {
        this.importing.set(false);
        this.committed.set(r);
        const msg =
          r.skipped > 0
            ? this.t.instant('{{created}} imported, {{skipped}} skipped.', { created: r.created, skipped: r.skipped })
            : this.t.instant('{{count}} customers imported.', { count: r.created });
        this.toast.success(msg);
      },
      error: (err) => {
        this.importing.set(false);
        this.toast.apiError(err, this.t.instant('The import failed. No changes were saved.'));
      },
    });
  }

  downloadErrors(): void {
    const rows = this.problemRows();
    if (!rows.length) return;
    const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((r) => [r.row, r.name, r.mobile, r.status, r.message].map(esc).join(',')).join('\n');
    this.download('import-issues.csv', `row,name,mobile,status,reason\n${body}\n`);
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Created': return 'status-delivered';
      case 'Skipped': return 'status-pending';
      default: return 'status-overdue';
    }
  }

  private download(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
